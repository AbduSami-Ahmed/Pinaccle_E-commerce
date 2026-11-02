import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let healthController: HealthController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService],
    }).compile();

    healthController = app.get<HealthController>(HealthController);
  });

  describe('getHealth', () => {
    it('should return a valid ServiceHealth response with healthy status', () => {
      const result = healthController.getHealth();
      expect(result).toBeDefined();
      expect(result.service).toBe('pinnacle-api');
      expect(result.status).toBe('healthy');
      expect(result.version).toBe('0.1.0');
      expect(typeof result.uptimeSeconds).toBe('number');
      expect(typeof result.timestamp).toBe('string');
    });
  });
});
