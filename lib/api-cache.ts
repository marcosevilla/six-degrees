import { NextRequest, NextResponse } from "next/server";

// Two layers keep TMDb traffic low without adding a dependency:
//
// 1. Upstream: TMDb fetches pass `next: { revalidate }`, so Next's data cache
//    (shared across Vercel instances) reuses a title's credits or a person's
//    filmography instead of asking TMDb again. Filmographies change slowly.
// 2. Downstream: our JSON responses carry `s-maxage`, so Vercel's CDN answers
//    repeat requests (the same search, the same validate) without running the
//    function at all. Error responses are never cached.
//
// Both stay far inside TMDb's 6-month caching limit.

export const HOUR = 60 * 60;
export const DAY = 24 * HOUR;

// Upstream revalidate windows.
export const TMDB_CREDITS_TTL = 3 * DAY;
export const TMDB_SEARCH_TTL = DAY;

// Pass as the second argument to fetch() for TMDb calls.
export const tmdbCache = (seconds: number) => ({ next: { revalidate: seconds } });

export function cachedJson(body: unknown, seconds: number, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": `public, s-maxage=${seconds}, stale-while-revalidate=${seconds * 7}`,
    },
  });
}

// Per-IP token bucket, in memory. Each server instance keeps its own buckets,
// so this is a speed bump against a script hammering one route, not a global
// quota; the CDN cache above absorbs normal repeat traffic. If the game grows
// past what that handles, swap this for Vercel's firewall rate limiting or a
// shared store (Upstash) behind the same function.
const CAPACITY = 60; // burst: a fast typist searching, or the reveal's pair retries
const REFILL_PER_SECOND = 2; // sustained: 120 requests a minute
const MAX_TRACKED_IPS = 5000;

const buckets = new Map<string, { tokens: number; updated: number }>();

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}

// Returns a 429 response when the caller is over the limit, otherwise null.
export function rateLimit(request: NextRequest): NextResponse | null {
  const ip = clientIp(request);
  const now = Date.now();

  if (buckets.size > MAX_TRACKED_IPS) {
    // Drop buckets that have fully refilled; they carry no state worth keeping.
    for (const [key, b] of buckets) {
      if (b.tokens + ((now - b.updated) / 1000) * REFILL_PER_SECOND >= CAPACITY) {
        buckets.delete(key);
      }
    }
  }

  const bucket = buckets.get(ip) ?? { tokens: CAPACITY, updated: now };
  bucket.tokens = Math.min(
    CAPACITY,
    bucket.tokens + ((now - bucket.updated) / 1000) * REFILL_PER_SECOND,
  );
  bucket.updated = now;

  if (bucket.tokens < 1) {
    buckets.set(ip, bucket);
    const retryAfter = Math.ceil((1 - bucket.tokens) / REFILL_PER_SECOND);
    return NextResponse.json(
      { error: "Too many requests. Try again in a moment." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  bucket.tokens -= 1;
  buckets.set(ip, bucket);
  return null;
}
