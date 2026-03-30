"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

export type ApiSession = {
  id: number;
  severity: number;
  stressScore: number | null;
  riskScore: number | null;
  riskLevel: string | null;
  finalRiskScore: number;
  finalRiskLevel: string;
  durationMinutes: number;
  sleepHours: number | null;
  createdAt: string;
};

const CACHE_TTL_MS = 60_000;
const STORAGE_KEY = "vital:sessions:v1";

type CacheState = {
  data: ApiSession[] | null;
  fetchedAt: number;
  promise: Promise<ApiSession[]> | null;
  hydrated: boolean;
};

const cache: CacheState = {
  data: null,
  fetchedAt: 0,
  promise: null,
  hydrated: false,
};

function hydrateCacheFromStorage() {
  if (cache.hydrated) return;
  cache.hydrated = true;
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { data: ApiSession[]; fetchedAt: number };
    if (Array.isArray(parsed.data)) {
      cache.data = parsed.data;
      cache.fetchedAt = parsed.fetchedAt || 0;
    }
  } catch {
    // ignore storage parsing errors
  }
}

function writeCacheToStorage() {
  if (typeof window === "undefined") return;
  if (!cache.data) return;
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ data: cache.data, fetchedAt: cache.fetchedAt }),
    );
  } catch {
    // ignore storage write errors
  }
}

function isCacheFresh() {
  return cache.data && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
}

async function fetchSessionsFromApi(
  token: string,
  limit: number,
  signal?: AbortSignal,
): Promise<ApiSession[]> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005";
  const response = await fetch(`${apiBase}/api/sessions?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || "Failed to load sessions");
  }
  return (payload?.sessions ?? []) as ApiSession[];
}

async function loadSessions(token: string, limit: number, force: boolean, signal?: AbortSignal) {
  hydrateCacheFromStorage();
  if (!force && isCacheFresh()) {
    return cache.data ?? [];
  }
  if (cache.promise) {
    return cache.promise;
  }
  cache.promise = fetchSessionsFromApi(token, limit, signal)
    .then((data) => {
      cache.data = data;
      cache.fetchedAt = Date.now();
      writeCacheToStorage();
      return data;
    })
    .finally(() => {
      cache.promise = null;
    });
  return cache.promise;
}

export function useSessions(options: { limit: number; refreshIntervalMs?: number }) {
  const { limit, refreshIntervalMs = 0 } = options;
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [rows, setRows] = useState<ApiSession[]>(() => {
    hydrateCacheFromStorage();
    return cache.data ?? [];
  });
  const [loading, setLoading] = useState(!cache.data);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);

  const refresh = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Missing auth token.");
      const data = await loadSessions(token, limit, true);
      setRows(data);
      setLoading(false);
      lastFetchRef.current = Date.now();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sessions");
      setLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn, limit]);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    const run = async (force = false) => {
      if (!isLoaded || !isSignedIn) return;
      setError(null);
      try {
        const token = await getToken();
        if (!token) throw new Error("Missing auth token.");
        const data = await loadSessions(token, limit, force, controller.signal);
        if (alive) {
          setRows(data);
          setLoading(false);
          lastFetchRef.current = Date.now();
        }
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load sessions");
        setLoading(false);
      }
    };

    void run(false);

    const onFocus = () => {
      if (document.hidden) return;
      const stale = Date.now() - lastFetchRef.current > CACHE_TTL_MS;
      if (stale) void run(true);
    };

    window.addEventListener("focus", onFocus);

    let interval: ReturnType<typeof setInterval> | null = null;
    if (refreshIntervalMs > 0) {
      interval = setInterval(() => {
        if (document.hidden) return;
        void run(true);
      }, refreshIntervalMs);
    }

    return () => {
      alive = false;
      controller.abort();
      window.removeEventListener("focus", onFocus);
      if (interval) clearInterval(interval);
    };
  }, [isLoaded, isSignedIn, getToken, limit, refreshIntervalMs]);

  return { rows, loading, error, refresh };
}
