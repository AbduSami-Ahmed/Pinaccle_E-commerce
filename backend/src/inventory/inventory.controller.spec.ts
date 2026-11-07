import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { PERMISSIONS_KEY } from '../auth/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '@pinnacle/contracts';

describe('InventoryController (Phase 6 - RBAC Permissions & Dispatch)', () => {
  let controller: InventoryController;
  let service: any;
  let reflector: Reflector;

  const mockUser: AuthenticatedUser = {
    sub: 'user-lead-1',
    email: 'inventory@pinnacle.test',
    isStaff: true,
    permissions: [
      'inventory:stock:view_quantity',
      'inventory:stock:inward_bulk',
      'inventory:stock:serialize_item',
      'inventory:stock:adjust',
      'inventory:stock:update_location',
    ],
  };

  beforeEach(async () => {
    service = {
      getInventoryOverview: jest.fn(),
      getProductStockDetails: jest.fn(),
      getItemMovements: jest.fn(),
      reconcileItem: jest.fn(),
      getWarehouses: jest.fn(),
      receiveBulkStock: jest.fn(),
      receiveSerializedPart: jest.fn(),
      adjustStock: jest.fn(),
      transferStock: jest.fn(),
      reserveStock: jest.fn(),
      releaseStockReservation: jest.fn(),
      commitStockReservation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: service,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('RBAC Permission Guard Decorators', () => {
    it('enforces inventory:stock:view_quantity on getOverview', () => {
      const perms = reflector.get<string[]>(
        PERMISSIONS_KEY,
        InventoryController.prototype.getOverview,
      );
      expect(perms).toContain('inventory:stock:view_quantity');
    });

    it('enforces inventory:stock:inward_bulk on receiveBulkStock', () => {
      const perms = reflector.get<string[]>(
        PERMISSIONS_KEY,
        InventoryController.prototype.receiveBulkStock,
      );
      expect(perms).toContain('inventory:stock:inward_bulk');
    });

    it('enforces inventory:stock:serialize_item on receiveSerialized', () => {
      const perms = reflector.get<string[]>(
        PERMISSIONS_KEY,
        InventoryController.prototype.receiveSerialized,
      );
      expect(perms).toContain('inventory:stock:serialize_item');
    });

    it('enforces inventory:stock:adjust on adjustStock', () => {
      const perms = reflector.get<string[]>(
        PERMISSIONS_KEY,
        InventoryController.prototype.adjustStock,
      );
      expect(perms).toContain('inventory:stock:adjust');
    });

    it('enforces inventory:stock:update_location on transferStock', () => {
      const perms = reflector.get<string[]>(
        PERMISSIONS_KEY,
        InventoryController.prototype.transferStock,
      );
      expect(perms).toContain('inventory:stock:update_location');
    });
  });

  describe('Controller Delegations', () => {
    it('delegates receiveBulkStock to service with user ID', async () => {
      const dto: any = {
        productId: 'prod-1',
        warehouseId: 'wh-1',
        locationBin: 'BIN-1',
        quantity: 10,
        costPrice: '100.00',
      };
      service.receiveBulkStock.mockResolvedValue({ id: 'item-1' });

      await controller.receiveBulkStock(dto, mockUser);
      expect(service.receiveBulkStock).toHaveBeenCalledWith(dto, mockUser.sub);
    });

    it('delegates adjustStock to service with user ID', async () => {
      const dto: any = {
        inventoryItemId: 'item-1',
        quantityChange: 5,
        reasonCode: 'CYCLE_COUNT',
      };
      service.adjustStock.mockResolvedValue({ success: true });

      await controller.adjustStock(dto, mockUser);
      expect(service.adjustStock).toHaveBeenCalledWith(dto, mockUser.sub);
    });
  });
});
