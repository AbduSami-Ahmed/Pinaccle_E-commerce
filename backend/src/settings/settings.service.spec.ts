import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from './settings.service';
import { AuditService } from '../audit/audit.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let auditService: { recordLog: jest.Mock };

  beforeEach(async () => {
    auditService = {
      recordLog: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'TAX_RATE_PERCENT') return '10';
              if (key === 'TAX_INCLUSIVE_PRICING') return 'true';
              if (key === 'SHIPPING_STANDARD_FEE') return '25.00';
              if (key === 'SHIPPING_EXPRESS_FEE') return '45.00';
              return null;
            }),
          },
        },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  it('provides Australian trade business configuration defaults', () => {
    const settings = service.getSettings();

    expect(settings.company.legalName).toBe('Pinnacle Auto Spares & Commercial Tyres Pty Ltd');
    expect(settings.company.licenseNumber).toBe('NSW MVRL-58291');
    expect(settings.company.suburb).toBe('Prestons');
    expect(settings.company.state).toBe('NSW');
    expect(settings.financial.currency).toBe('AUD');
    expect(settings.financial.taxRatePercent).toBe(10);
    expect(settings.financial.taxInclusive).toBe(true);
    expect(settings.fulfillment.depotPickupEnabled).toBe(true);
    expect(settings.fulfillment.depotPickupFee).toBe(0.0);
    expect(settings.policies.returnWindowDays).toBe(30);
  });

  it('updates settings and records an audit log', async () => {
    const updated = await service.updateSettings(
      {
        company: { phone: '(02) 9822 9999' },
        fulfillment: { standardShippingFee: 30.0 },
      },
      'admin-actor-1',
      '192.168.1.50',
    );

    expect(updated.company.phone).toBe('(02) 9822 9999');
    expect(updated.fulfillment.standardShippingFee).toBe(30.0);
    expect(updated.company.legalName).toBe('Pinnacle Auto Spares & Commercial Tyres Pty Ltd'); // Preserved

    expect(auditService.recordLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-actor-1',
        domain: 'SETTINGS',
        action: 'BUSINESS_SETTINGS_UPDATED',
        entityType: 'STORE_SETTINGS',
      }),
    );
  });
});
