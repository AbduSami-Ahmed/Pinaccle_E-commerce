import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ServiceHealth } from '@pinnacle/contracts';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check API and service health status' })
  @ApiResponse({
    status: 200,
    description: 'Service health information',
    schema: {
      type: 'object',
      properties: {
        service: { type: 'string', example: 'pinnacle-api' },
        status: { type: 'string', example: 'healthy' },
        uptimeSeconds: { type: 'number', example: 120 },
        timestamp: { type: 'string', example: '2026-11-03T01:25:00.000Z' },
        version: { type: 'string', example: '0.1.0' },
        environment: { type: 'string', example: 'development' },
      },
    },
  })
  getHealth(): ServiceHealth {
    return this.healthService.getHealth();
  }
}
