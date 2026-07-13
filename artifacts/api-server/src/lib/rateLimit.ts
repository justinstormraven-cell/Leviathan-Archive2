import type { Request, Response, NextFunction } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  /** Rolling window length in milliseconds. */
  windowMs: number;
  /** Maximum number of requests allowed per client within the window. */
  max: number;
  /** Message returned once the limit is exceeded. */
  message?: string;
}

/**
 * Extract the originating client IP. Behind the Replit proxy the real client
 * address is carried in `x-forwarded-for` (comma-separated, client first). We
 * read it directly rather than relying on `trust proxy` so a spoofed proxy
 * config can't silently disable throttling.
 */
function clientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    const first = forwarded[0]?.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

/**
 * Minimal in-memory fixed-window rate limiter. Suitable for a single-instance
 * service; it needs no external dependency and keeps failed-attempt state per
 * client IP so brute-force attempts against sensitive endpoints are throttled.
 */
export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, message = "Too many requests. Please try again later." } = options;
  const buckets = new Map<string, Bucket>();

  function sweep(now: number): void {
    for (const [key, bucket] of buckets) {
      if (now > bucket.resetAt) buckets.delete(key);
    }
  }

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    const now = Date.now();

    // Opportunistic cleanup to bound memory growth.
    if (buckets.size > 10_000) sweep(now);

    const key = clientKey(req);
    let bucket = buckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    const remaining = Math.max(0, max - bucket.count);
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil((bucket.resetAt - now) / 1000)));

    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: message });
      return;
    }

    next();
  };
}
