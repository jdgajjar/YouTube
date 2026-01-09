import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import connectDB from './mongodb';
import User, { IUserDocument } from '@/models/User';
import { JWTPayload } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET!;
const TOKEN_EXPIRY = '7d';

export function generateToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getTokenFromCookies(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token');
    return token?.value || null;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Fall back to cookie
  const token = request.cookies.get('auth_token');
  return token?.value || null;
}

export async function getCurrentUser(
  request?: NextRequest
): Promise<IUserDocument | null> {
  try {
    let token: string | null = null;

    if (request) {
      token = getTokenFromRequest(request);
    } else {
      token = await getTokenFromCookies();
    }

    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    await connectDB();
    const user = await User.findById(payload.userId).populate('channelId');

    return user;
  } catch {
    return null;
  }
}

export async function requireAuth(
  request: NextRequest
): Promise<{ user: IUserDocument } | { error: string; status: number }> {
  const user = await getCurrentUser(request);

  if (!user) {
    return { error: 'Unauthorized', status: 401 };
  }

  return { user };
}

export function setAuthCookie(token: string): void {
  // This is used in API routes
  // The actual cookie setting happens in the response
}

export function createAuthCookieHeader(token: string): string {
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  const isProduction = process.env.NODE_ENV === 'production';
  const secureFlag = isProduction ? '; Secure' : '';
  return `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax${secureFlag}; Max-Age=${maxAge}`;
}

export function clearAuthCookieHeader(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const secureFlag = isProduction ? '; Secure' : '';
  return `auth_token=; Path=/; HttpOnly; SameSite=Lax${secureFlag}; Max-Age=0`;
}
