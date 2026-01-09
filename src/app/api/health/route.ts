import { NextResponse } from 'next/server';

/**
 * Health Check Endpoint
 * Used by deployment platforms (Render, Vercel) to verify service health
 */
export async function GET() {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    service: 'youtube-clone',
  };

  return NextResponse.json(healthCheck, { status: 200 });
}
