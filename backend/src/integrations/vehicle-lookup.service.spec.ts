import { Test, TestingModule } from '@nestjs/testing';
import { VehicleLookupService } from './vehicle-lookup.service';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoSecretsService } from './core/crypto-secrets.service';
import { CarJamAdapter } from './adapters/carjam.adapter';
import { MockVehicleAdapter } from './adapters/mock-vehicle.adapter';
import { VEHICLE_FITMENT_DISCLAIMER } from '@pinnacle/contracts';

describe('VehicleLookupService', () => {
  let service: VehicleLookupService;
  let carjamAdapter: CarJamAdapter;

  let prisma: {
    integrationAccount: {
      findFirst: jest.Mock;
    };
    vehicleMake: {
      findFirst: jest.Mock;
    };
    vehicleModel: {
      findFirst: jest.Mock;
    };
    vehicleGeneration: {
      findFirst: jest.Mock;
    };
    vehicleChassis: {
      findFirst: jest.Mock;
    };
  };

  let cryptoSecrets: {
    decryptSecrets: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      integrationAccount: {
        findFirst: jest.fn(),
      },
      vehicleMake: {
        findFirst: jest.fn().mockResolvedValue({ id: 'make-1', name: 'Toyota', slug: 'toyota' }),
      },
      vehicleModel: {
        findFirst: jest.fn().mockResolvedValue({ id: 'model-1', name: 'RAV4', slug: 'rav4' }),
      },
      vehicleGeneration: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'gen-1',
          generationName: '5th Gen (XA50)',
          yearStart: 2018,
          yearEnd: null,
          chassis: [
            {
              id: 'chassis-1',
              chassisCode: 'AXAH54',
              bodyType: 'SUV 5-Door',
              engineSpec: '2.5L Hybrid',
            },
          ],
        }),
      },
      vehicleChassis: {
        findFirst: jest.fn(),
      },
    };

    cryptoSecrets = {
      decryptSecrets: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleLookupService,
        CarJamAdapter,
        MockVehicleAdapter,
        { provide: PrismaService, useValue: prisma },
        { provide: CryptoSecretsService, useValue: cryptoSecrets },
      ],
    }).compile();

    service = module.get<VehicleLookupService>(VehicleLookupService);
    carjamAdapter = module.get<CarJamAdapter>(CarJamAdapter);

    service.clearCache();
    delete process.env['CARJAM_API_KEY'];
  });

  afterEach(() => {
    service.clearCache();
    delete process.env['CARJAM_API_KEY'];
  });

  describe('lookupVehicle with Mock Adapter Fallback', () => {
    it('falls back to mock adapter and matches local taxonomy when CarJam credentials are not configured', async () => {
      prisma.integrationAccount.findFirst.mockResolvedValue(null);

      const res = await service.lookupVehicle({ plate: 'HYP360' });

      expect(res.found).toBe(true);
      expect(res.make).toBe('Toyota');
      expect(res.model).toBe('RAV4');
      expect(res.year).toBe(2021);
      expect(res.chassisCode).toBe('AXAH54');
      expect(res.matchedChassisId).toBe('chassis-1');
      expect(res.matchedSelection?.make).toBe('Toyota');
      expect(res.matchedSelection?.model).toBe('RAV4');
      expect(res.cached).toBe(false);
      expect(res.disclaimer).toBe(VEHICLE_FITMENT_DISCLAIMER);
      expect(res.sourceAttribution).toContain('Mock Vehicle Data Provider');
    });

    it('serves second query from 24h technical cache with cached: true flag', async () => {
      prisma.integrationAccount.findFirst.mockResolvedValue(null);

      const res1 = await service.lookupVehicle({ plate: 'HYP360' });
      expect(res1.cached).toBe(false);

      const res2 = await service.lookupVehicle({ plate: 'HYP360' });
      expect(res2.cached).toBe(true);
      expect(res2.make).toBe('Toyota');
      expect(res2.model).toBe('RAV4');
    });

    it('returns found: false for non-matching plate', async () => {
      prisma.integrationAccount.findFirst.mockResolvedValue(null);

      const res = await service.lookupVehicle({ plate: 'NOTFOUND' });
      expect(res.found).toBe(false);
      expect(res.disclaimer).toBe(VEHICLE_FITMENT_DISCLAIMER);
    });
  });

  describe('lookupVehicle with Live CarJam Account', () => {
    it('decrypts stored secrets and invokes CarJamAdapter when credentials exist in database', async () => {
      prisma.integrationAccount.findFirst.mockResolvedValue({
        provider: 'CARJAM',
        isActive: true,
        encryptedSecrets: 'encrypted_val',
        secretsIv: 'iv_val',
        secretsTag: 'tag_val',
      });

      cryptoSecrets.decryptSecrets.mockReturnValue({
        apiKey: 'carjam_live_commercial_key_123',
      });

      const carjamSpy = jest.spyOn(carjamAdapter, 'lookupVehicle').mockResolvedValue({
        success: true,
        found: true,
        data: {
          make: 'Toyota',
          model: 'RAV4',
          submodel: 'GXL 2.5P Hybrid',
          year: 2021,
          chassisCode: 'AXAH54',
          bodyType: 'SUV 5-Door',
          plate: 'HYP360',
        },
        sourceAttribution: 'CarJam NZ Transport Agency Motochek Register',
        disclaimer: VEHICLE_FITMENT_DISCLAIMER,
      });

      const res = await service.lookupVehicle({ plate: 'HYP360' });

      expect(cryptoSecrets.decryptSecrets).toHaveBeenCalledWith({
        encryptedData: 'encrypted_val',
        iv: 'iv_val',
        authTag: 'tag_val',
      });
      expect(carjamSpy).toHaveBeenCalledWith(
        expect.objectContaining({ plate: 'HYP360' }),
        { apiKey: 'carjam_live_commercial_key_123' },
      );
      expect(res.found).toBe(true);
      expect(res.providerKey).toBe('CARJAM');
      expect(res.sourceAttribution).toContain('CarJam NZ Transport Agency');
    });
  });

  describe('getProviderStatus', () => {
    it('reports BLOCKED_MISSING_CREDENTIALS when CarJam is unconfigured', async () => {
      prisma.integrationAccount.findFirst.mockResolvedValue(null);

      const status = await service.getProviderStatus();

      expect(status.provider).toBe('CARJAM');
      expect(status.status).toBe('BLOCKED_MISSING_CREDENTIALS');
      expect(status.isLiveConfigured).toBe(false);
      expect(status.blockerReason).toContain('No active commercial API key configured');
      expect(status.officialDocumentationUrl).toBe('https://www.carjam.co.nz/api/docs/');
      expect(status.cacheTtlHours).toBe(24);
    });

    it('reports CONNECTED when CarJam has active credentials', async () => {
      prisma.integrationAccount.findFirst.mockResolvedValue({
        provider: 'CARJAM',
        isActive: true,
        encryptedSecrets: 'encrypted_data',
      });

      const status = await service.getProviderStatus();

      expect(status.provider).toBe('CARJAM');
      expect(status.status).toBe('CONNECTED');
      expect(status.isLiveConfigured).toBe(true);
      expect(status.blockerReason).toBeNull();
    });
  });
});

