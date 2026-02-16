import type { Context, Next } from "hono";

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimitOptions {
  /** Maximum requests allowed in the window. */
  max: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

/**
 * In-memory sliding-window rate limiter.
 *
 * IP extraction strategy (in priority order):
 * 1. The rightmost entry in X-Forwarded-For that was appended by the
 *    trusted reverse proxy (Caddy/nginx). Using the rightmost avoids
 *    client spoofing, since clients control the leftmost entries.
 * 2. Falls back to "unknown" when no forwarded header is present.
 *
 * NOTE: This relies on a single trusted reverse proxy. For chained proxies
 * or direct exposure, use a reverse proxy rate limiter instead.
 */
export function rateLimit(opts: RateLimitOptions) {
  const store = new Map<string, RateLimitEntry>();

  // Periodic cleanup every 60s to prevent memory leaks from stale entries
  const CLEANUP_INTERVAL_MS = 60_000;
  let lastCleanup = Date.now();

  function cleanup(now: number) {
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < opts.windowMs);
      if (entry.timestamps.length === 0) store.delete(key);
    }
    lastCleanup = now;
  }

  return async (c: Context, next: Next) => {
    // Use rightmost X-Forwarded-For entry (set by trusted reverse proxy).
    // The leftmost entries are client-controlled and spoofable.
    // Falls back to the raw socket address when no proxy header is present.
    const forwarded = c.req.header("X-Forwarded-For");
    const parts = forwarded?.split(",");
    const ip = parts?.[parts.length - 1]?.trim()
      || c.req.header("X-Real-IP")
      || (c.env?.remoteAddr as string | undefined)
      || "unknown";

    const now = Date.now();

    // Periodic cleanup
    if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
      cleanup(now);
    }

    let entry = store.get(ip);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(ip, entry);
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter((t) => now - t < opts.windowMs);

    if (entry.timestamps.length >= opts.max) {
      const retryAfter = Math.ceil(
        (entry.timestamps[0] + opts.windowMs - now) / 1000,
      );
      c.header("Retry-After", String(retryAfter));
      return c.json({ error: "Too many requests" }, 429);
    }

    entry.timestamps.push(now);
    await next();
  };
}
