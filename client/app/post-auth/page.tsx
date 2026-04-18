"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { prefetchSessions } from "../(components)/useSessions";

const USER_SYNC_KEY = "vital:user-sync";

export default function PostAuthPage() {
  const router = useRouter();
  const { isLoaded: authLoaded, isSignedIn, getToken, userId } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const [error, setError] = useState<string | null>(null);
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!authLoaded || !userLoaded) return;
      if (!isSignedIn || !userId) {
        router.replace("/sign-in");
        return;
      }
      if (handledRef.current === userId) return;

      try {
        const token = await getToken();
        if (!token) {
          setError("Missing auth token.");
          return;
        }

        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005";
        const email = user?.primaryEmailAddress?.emailAddress;
        if (!email) {
          throw new Error("Missing email address.");
        }

        const submitResponse = await fetch(`${apiBase}/api/users/submitUser`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email }),
        });
        const payload = await submitResponse.json().catch(() => ({}));
        if (!submitResponse.ok) {
          throw new Error(payload?.error || "Failed to sync user");
        }

        const onboardingCompleted = Boolean(payload?.user?.onboardingCompleted);
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(USER_SYNC_KEY, userId);
        }

        const destination = onboardingCompleted ? "/home" : "/onboarding";
        router.prefetch(destination);

        if (onboardingCompleted) {
          await prefetchSessions(token, 20);
        }

        handledRef.current = userId;
        router.replace(destination);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to resolve login flow");
      }
    };

    void run();
  }, [authLoaded, userLoaded, isSignedIn, userId, getToken, user, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#020b22] px-4 text-[#d6e3ff]">
      <div className="rounded-2xl border border-[#1f3364] bg-[#0b1732]/90 px-6 py-5 text-center">
        <p className="text-lg font-semibold text-[#eef4ff]">Preparing your dashboard...</p>
        {error ? <p className="mt-2 text-sm text-[#ff7a87]">{error}</p> : null}
      </div>
    </main>
  );
}
