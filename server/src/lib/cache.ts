import Redis from "ioredis";

if (!process.env.REDIS_URL) {
  console.warn("[CACHE] REDIS_URL is not set — caching and rate limiting will fail.");
}

export const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on("error", (err) => {
  console.error("[CACHE] Redis connection error:", err.message);
});

/**
 * Cache-aside helper: returns the cached value if present, otherwise calls
 * `fetcher`, stores the result with the given TTL, and returns it.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit !== null) return JSON.parse(hit) as T;
  } catch (err) {
    console.error(`[CACHE] read failed for key "${key}":`, err);
  }

  const value = await fetcher();

  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    console.error(`[CACHE] write failed for key "${key}":`, err);
  }

  return value;
}

/**
 * Versioned cache namespaces — use this for cached lists that have an admin
 * write path (create/update/delete). Bump the version on every write so all
 * previously cached reads for that namespace become unreachable immediately,
 * without needing to track or pattern-match every individual cache key.
 */
export async function getVersion(namespace: string): Promise<number> {
  try {
    const v = await redis.get(`version:${namespace}`);
    return v ? parseInt(v, 10) : 0;
  } catch (err) {
    console.error(`[CACHE] version read failed for "${namespace}":`, err);
    return 0;
  }
}

export async function bumpVersion(namespace: string): Promise<void> {
  try {
    await redis.incr(`version:${namespace}`);
  } catch (err) {
    console.error(`[CACHE] version bump failed for "${namespace}":`, err);
  }
}