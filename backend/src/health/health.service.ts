import { Injectable } from '@nestjs/common';
import { ServiceHealth } from '@pinnacle/contracts';

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  getHealth(): ServiceHealth {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      service: 'pinnacle-api',
      status: 'healthy',
      uptimeSeconds,
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      environment: process.env.NODE_ENV ?? 'development',
    };
  }
}
