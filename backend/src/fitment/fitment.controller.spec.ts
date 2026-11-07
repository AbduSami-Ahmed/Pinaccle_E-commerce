import { Test, TestingModule } from '@nestjs/testing';
import { FitmentController } from './fitment.controller';
import { AdminFitmentController } from './admin-fitment.controller';
import { FitmentService } from './fitment.service';
import { VehicleLookupService } from '../integrations/vehicle-lookup.service';

describe('Fitment Controllers', () => {
  let fitmentController: FitmentController;
  let adminFitmentController: AdminFitmentController;
  let service: {
    getMakes: jest.Mock;
    getModels: jest.Mock;
    getYears: jest.Mock;
    getVariants: jest.Mock;
    searchFitment: jest.Mock;
    checkProductFitment: jest.Mock;
    listFitments: jest.Mock;
    createFitment: jest.Mock;
    updateVerification: jest.Mock;
    deleteFitment: jest.Mock;
  };
  let vehicleLookupService: {
    lookupVehicle: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getMakes: jest.fn().mockResolvedValue([{ id: 'make-1', name: 'Toyota' }]),
      getModels: jest.fn().mockResolvedValue([{ id: 'model-1', name: 'RAV4' }]),
      getYears: jest.fn().mockResolvedValue({ years: [2021, 2020], generations: [] }),
      getVariants: jest.fn().mockResolvedValue([{ id: 'chassis-1', chassisCode: 'AXAH54' }]),
      searchFitment: jest
        .fn()
        .mockResolvedValue({ data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 1 } }),
      checkProductFitment: jest
        .fn()
        .mockResolvedValue({ isCompatible: true, confidence: 'CONFIRMED_EXACT' }),
      listFitments: jest
        .fn()
        .mockResolvedValue({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } }),
      createFitment: jest.fn().mockResolvedValue({ id: 'fit-1', productId: 'p1' }),
      updateVerification: jest
        .fn()
        .mockResolvedValue({ id: 'fit-1', verificationStatus: 'VERIFIED_OEM_DIRECT' }),
      deleteFitment: jest.fn().mockResolvedValue({ success: true }),
    };

    vehicleLookupService = {
      lookupVehicle: jest.fn().mockResolvedValue({
        found: true,
        plate: 'HYP360',
        make: 'Toyota',
        model: 'RAV4',
        year: 2021,
        providerKey: 'CARJAM',
        sourceAttribution: 'CarJam NZ Transport Agency Motochek Register',
        cached: false,
        disclaimer: 'Vehicle lookup does not guarantee exact part fitment.',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FitmentController, AdminFitmentController],
      providers: [
        { provide: FitmentService, useValue: service },
        { provide: VehicleLookupService, useValue: vehicleLookupService },
      ],
    }).compile();

    fitmentController = module.get<FitmentController>(FitmentController);
    adminFitmentController = module.get<AdminFitmentController>(AdminFitmentController);
  });

  describe('FitmentController (Customer)', () => {
    it('delegates getMakes to service', async () => {
      const res = await fitmentController.getMakes({});
      expect(service.getMakes).toHaveBeenCalled();
      expect(res).toHaveLength(1);
    });

    it('delegates getModels to service', async () => {
      await fitmentController.getModels({ make: 'toyota' });
      expect(service.getModels).toHaveBeenCalledWith({ make: 'toyota' });
    });

    it('delegates getYears to service', async () => {
      await fitmentController.getYears({ model: 'rav4' });
      expect(service.getYears).toHaveBeenCalledWith({ model: 'rav4' });
    });

    it('delegates getVariants to service', async () => {
      await fitmentController.getVariants({ model: 'rav4', year: 2021 });
      expect(service.getVariants).toHaveBeenCalledWith({ model: 'rav4', year: 2021 });
    });

    it('delegates searchFitment to service', async () => {
      await fitmentController.searchFitment({ make: 'toyota', model: 'rav4' });
      expect(service.searchFitment).toHaveBeenCalledWith({ make: 'toyota', model: 'rav4' });
    });

    it('delegates checkProductFitment to service', async () => {
      await fitmentController.checkProductFitment({ productId: 'p1', make: 'toyota' });
      expect(service.checkProductFitment).toHaveBeenCalledWith({ productId: 'p1', make: 'toyota' });
    });

    it('delegates lookupByPlate to vehicleLookupService', async () => {
      const res = await fitmentController.lookupByPlate('HYP360', 'NZ');
      expect(vehicleLookupService.lookupVehicle).toHaveBeenCalledWith({ plate: 'HYP360', country: 'NZ' });
      expect(res.found).toBe(true);
      expect(res.plate).toBe('HYP360');
    });

    it('delegates lookupByVin to vehicleLookupService', async () => {
      const res = await fitmentController.lookupByVin('JTMK43FV50D192834');
      expect(vehicleLookupService.lookupVehicle).toHaveBeenCalledWith({ vin: 'JTMK43FV50D192834' });
      expect(res.found).toBe(true);
    });
  });

  describe('AdminFitmentController', () => {
    it('delegates listFitments to service', async () => {
      await adminFitmentController.listFitments({});
      expect(service.listFitments).toHaveBeenCalled();
    });

    it('delegates createFitment to service with user context', async () => {
      const user = { id: 'u1', email: 'test@admin.com' } as any;
      await adminFitmentController.createFitment({ productId: 'p1', vehicleChassisId: 'c1' }, user);
      expect(service.createFitment).toHaveBeenCalledWith(
        { productId: 'p1', vehicleChassisId: 'c1' },
        user,
      );
    });

    it('delegates updateVerification to service with user context', async () => {
      const user = { id: 'u1', email: 'test@admin.com' } as any;
      await adminFitmentController.updateVerification(
        'fit-1',
        { verificationStatus: 'VERIFIED_OEM_DIRECT' },
        user,
      );
      expect(service.updateVerification).toHaveBeenCalledWith(
        'fit-1',
        { verificationStatus: 'VERIFIED_OEM_DIRECT' },
        user,
      );
    });

    it('delegates deleteFitment to service', async () => {
      await adminFitmentController.deleteFitment('fit-1');
      expect(service.deleteFitment).toHaveBeenCalledWith('fit-1');
    });
  });
});
