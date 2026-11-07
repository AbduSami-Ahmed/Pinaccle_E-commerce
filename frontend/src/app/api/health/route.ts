import { NextResponse } from 'next/server';
import type { ServiceHealth } from '@pinnacle/contracts';

const startTime = Date.now();

export function GET() {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  const health: ServiceHealth = {
    service: 'pinnacle-web',
    status: 'healthy',
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    environment: process.env.NODE_ENV ?? 'development',
  };

  return NextResponse.json(health);
}
