/**
 * Rate Limiting Middleware
 * Implements in-memory rate limiting for API routes
 */

interface RateLimitEntry {
  count: number;
  firstRequest: number;
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10); // 1 minute
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10); // 100 requests per window

// Different limits for different endpoints
const RATE_LIMITS: Record<string, { windowMs: number; maxRequests: number }> = {
  '/api/auth/login': { windowMs: 60000, maxRequests: 5 }, // 5 login attempts per minute
  '/api/auth/register': { windowMs: 60000, maxRequests: 3 }, // 3 registrations per minute
  '/api/videos': { windowMs: 60000, maxRequests: 10 }, // 10 video uploads per minute
  default: { windowMs: RATE_LIMIT_WINDOW_MS, maxRequests: RATE_LIMIT_MAX_REQUESTS },
};

/**
 * Get client identifier (IP address or user ID)
 */
function getClientIdentifier(request: Request, userId?: string): string {
  // Try to get IP from headers (for proxied requests)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
  
  // Use userId if available for authenticated requests
  if (userId) {
    return `user:${userId}`;
  }
  
  return `ip:${ip}`;
}

/**
 * Get rate limit configuration for a path
 */
function getRateLimitConfig(pathname: string): { windowMs: number; maxRequests: number } {
  // Check for exact match
  if (RATE_LIMITS[pathname]) {
    return RATE_LIMITS[pathname];
  }
  
  // Check for partial match
  for (const [path, config] of Object.entries(RATE_LIMITS)) {
    if (pathname.startsWith(path)) {
      return config;
    }
  }
  
  return RATE_LIMITS.default;
}

/**
 * Clean up expired entries (call periodically)
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  const config = RATE_LIMITS.default;
  rateLimitStore.forEach((entry, key) => {
    if (now - entry.firstRequest > config.windowMs) {
      rateLimitStore.delete(key);
    }
  });
}

// Clean up every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  request: Request,
  userId?: string
): RateLimitResult {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const clientId = getClientIdentifier(request, userId);
  const config = getRateLimitConfig(pathname);
  
  const key = `${pathname}:${clientId}`;
  const now = Date.now();
  
  let entry = rateLimitStore.get(key);
  
  // If no entry or window expired, create new entry
  if (!entry || now - entry.firstRequest > config.windowMs) {
    entry = { count: 1, firstRequest: now };
    rateLimitStore.set(key, entry);
    
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset: Math.ceil((now + config.windowMs) / 1000),
    };
  }
  
  // Increment counter
  entry.count++;
  
  // Check if over limit
  if (entry.count > config.maxRequests) {
    const resetTime = entry.firstRequest + config.windowMs;
    const retryAfter = Math.ceil((resetTime - now) / 1000);
    
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: Math.ceil(resetTime / 1000),
      retryAfter,
    };
  }
  
  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    reset: Math.ceil((entry.firstRequest + config.windowMs) / 1000),
  };
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult): HeadersInit {
  const headers: HeadersInit = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };
  
  if (!result.success && result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }
  
  return headers;
}

/**
 * Rate limit response for exceeded limits
 */
export function rateLimitExceededResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Too many requests. Please try again later.',
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...createRateLimitHeaders(result),
      },
    }
  );
}
