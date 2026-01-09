import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Security headers for all responses
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=self, microphone=self, geolocation=()',
};

// Simple in-memory rate limiting store
// Note: In production, use Redis or a distributed store
interface RateLimitEntry {
  count: number;
  timestamp: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configuration per route pattern
const rateLimitConfig: Record<string, { window: number; max: number }> = {
  '/api/auth/login': { window: 60 * 1000, max: 5 },
  '/api/auth/register': { window: 60 * 1000, max: 3 },
  '/api/videos': { window: 60 * 1000, max: 10 },
  default: { window: 60 * 1000, max: 100 },
};

function getRateLimitConfig(pathname: string) {
  for (const [path, config] of Object.entries(rateLimitConfig)) {
    if (pathname.startsWith(path)) {
      return config;
    }
  }
  return rateLimitConfig.default;
}

function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
}

function checkRateLimit(
  request: NextRequest
): { success: boolean; remaining: number; reset: number } {
  const pathname = request.nextUrl.pathname;
  const clientId = getClientId(request);
  const config = getRateLimitConfig(pathname);
  const key = `${pathname}:${clientId}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  // Clean up old entry or create new one
  if (!entry || now - entry.timestamp > config.window) {
    rateLimitStore.set(key, { count: 1, timestamp: now });
    return {
      success: true,
      remaining: config.max - 1,
      reset: Math.ceil((now + config.window) / 1000),
    };
  }

  entry.count++;

  if (entry.count > config.max) {
    return {
      success: false,
      remaining: 0,
      reset: Math.ceil((entry.timestamp + config.window) / 1000),
    };
  }

  return {
    success: true,
    remaining: config.max - entry.count,
    reset: Math.ceil((entry.timestamp + config.window) / 1000),
  };
}

// Protected routes that require authentication
const protectedRoutes = [
  '/upload',
  '/watch-later',
  '/history',
  '/subscriptions',
  '/notifications',
];

// API routes that require authentication
const protectedApiRoutes = [
  '/api/videos',
  '/api/channels',
  '/api/comments',
  '/api/subscribe',
  '/api/history',
  '/api/watch-later',
  '/api/notifications',
];

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(route => pathname.startsWith(route));
}

function isProtectedApiRoute(pathname: string, method: string): boolean {
  // GET requests are generally public
  if (method === 'GET') {
    // Except for these routes
    const authRequiredGets = ['/api/auth/me', '/api/history', '/api/watch-later', '/api/notifications'];
    return authRequiredGets.some(route => pathname.startsWith(route));
  }
  return protectedApiRoutes.some(route => pathname.startsWith(route));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    const rateLimitResult = checkRateLimit(request);

    if (!rateLimitResult.success) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Too many requests. Please try again later.',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            'Retry-After': Math.ceil((rateLimitResult.reset * 1000 - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Check API authentication
    const token = request.cookies.get('auth_token')?.value;
    if (isProtectedApiRoute(pathname, request.method) && !token) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Authentication required',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          },
        }
      );
    }

    // Continue with rate limit headers
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
    
    // Add security headers
    for (const [key, value] of Object.entries(securityHeaders)) {
      response.headers.set(key, value);
    }

    return response;
  }

  // Handle protected page routes
  if (isProtectedRoute(pathname)) {
    const token = request.cookies.get('auth_token')?.value;
    
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};
