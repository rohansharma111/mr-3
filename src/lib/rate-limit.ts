import { prisma } from "@/lib/prisma";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

export async function consumeAiRateLimit(userId: string): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / WINDOW_MS) * WINDOW_MS);
  const expiresAt = new Date(windowStart.getTime() + WINDOW_MS);
  const key = `ai:${userId}`;

  const rows = await prisma.$queryRawUnsafe<Array<{ request_count: number }>>(
    `INSERT INTO "rate_limit_buckets"
      ("key", "window_start", "request_count", "expires_at", "updated_at")
     VALUES ($1, $2, 1, $3, NOW())
     ON CONFLICT ("key") DO UPDATE
       SET "request_count" = CASE
         WHEN "rate_limit_buckets"."window_start" = EXCLUDED."window_start"
           THEN "rate_limit_buckets"."request_count" + 1
         ELSE 1
       END,
       "window_start" = EXCLUDED."window_start",
       "expires_at" = EXCLUDED."expires_at",
       "updated_at" = NOW()
     RETURNING "request_count"`,
    key,
    windowStart,
    expiresAt
  );

  const requestCount = rows[0]?.request_count ?? MAX_REQUESTS_PER_WINDOW + 1;
  const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - requestCount);
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((expiresAt.getTime() - now) / 1000)
  );

  return {
    allowed: requestCount <= MAX_REQUESTS_PER_WINDOW,
    limit: MAX_REQUESTS_PER_WINDOW,
    remaining,
    retryAfterSeconds
  };
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(
      Math.floor(Date.now() / 1000) + result.retryAfterSeconds
    )
  };
}
