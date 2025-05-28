// lib/rate-limit-simple.ts - Fallback senza Redis
import { NextRequest } from 'next/server';

// In-memory rate limiting (per development)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  error?: string;
}

const RATE_LIMITS = {
  api: { requests: 100, windowMs: 60 * 1000 }, // 100 req/min
  search: { requests: 50, windowMs: 60 * 1000 }, // 50 req/min
  import: { requests: 5, windowMs: 60 * 60 * 1000 }, // 5 req/hour
  export: { requests: 20, windowMs: 60 * 60 * 1000 }, // 20 req/hour
  auth: { requests: 10, windowMs: 15 * 60 * 1000 }, // 10 req/15min
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

export async function checkRateLimit(
  request: NextRequest,
  type: RateLimitType = 'api'
): Promise<RateLimitResult> {
  try {
    const identifier = getIdentifier(request);
    const key = `${type}:${identifier}`;
    const config = RATE_LIMITS[type];
    const now = Date.now();

    // Get or create rate limit entry
    let entry = requestCounts.get(key);
    
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs
      };
    }

    entry.count++;
    requestCounts.set(key, entry);

    const remaining = Math.max(0, config.requests - entry.count);
    const success = entry.count <= config.requests;

    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      cleanupOldEntries();
    }

    return {
      success,
      limit: config.requests,
      remaining,
      reset: entry.resetTime,
    };
  } catch (error) {
    console.error(`Rate limit error for ${type}:`, error);
    
    // Fail open - allow request if rate limiting fails
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
      error: error instanceof Error ? error.message : 'Rate limit check failed',
    };
  }
}

function getIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] ?? realIp ?? '127.0.0.1';
  return `ip:${ip}`;
}

function cleanupOldEntries() {
  const now = Date.now();
  for (const [key, entry] of requestCounts.entries()) {
    if (now > entry.resetTime) {
      requestCounts.delete(key);
    }
  }
}

// Middleware wrapper for API routes
export function withRateLimit(type: RateLimitType = 'api') {
  return function (handler: Function) {
    return async function (request: NextRequest, context?: any): Promise<Response> {
      const result = await checkRateLimit(request, type);
      
      if (!result.success) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: `Too many requests. Try again in ${Math.ceil((result.reset - Date.now()) / 1000)} seconds.`,
            limit: result.limit,
            remaining: result.remaining,
            reset: result.reset,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': result.limit.toString(),
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': result.reset.toString(),
              'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
            },
          }
        );
      }
      
      // Call handler with correct arguments
      const response = context 
        ? await handler(request, context)
        : await handler(request);
      
      // Add rate limit headers to successful responses
      response.headers.set('X-RateLimit-Limit', result.limit.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', result.reset.toString());
      
      return response;
    };
  };
}