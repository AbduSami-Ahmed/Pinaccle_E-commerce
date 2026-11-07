import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PERMISSIONS_KEY } from '../auth/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '@pinnacle/contracts';

describe('ProductsController (Phase 5 Catalog)', () => {
  let controller: ProductsController;
  let service: {
    findAll: jest.Mock;
    findByIdOrSlug: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    updateStatus: jest.Mock;
    remove: jest.Mock;
  };
  let reflector: Reflector;

  const mockUser: AuthenticatedUser = {
    sub: 'user-1',
    email: 'admin@pinnacle.test',
    isStaff: true,
    permissions: [
      'catalog:product:view',
      'catalog:product:create',
      'catalog:product:update',
      'catalog:product:publish',
      'catalog:product:delete',
    ],
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findByIdOrSlug: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: service,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('RBAC Permission Decorators', () => {
    it('enforces catalog:product:view on getProducts', () => {
      const perms = reflector.get<string[]>(
        PERMISSIONS_KEY,
        ProductsController.prototype.getProducts,
      );
      expect(perms).toContain('catalog:product:view');
    });

    it('enforces catalog:product:create on createProduct', () => {
      const perms = reflector.get<string[]>(
        PERMISSIONS_KEY,
        ProductsController.prototype.createProduct,
      );
      expect(perms).toContain('catalog:product:create');
    });

    it('enforces catalog:product:update on updateProduct', () => {
      const perms = reflector.get<string[]>(
        PERMISSIONS_KEY,
        ProductsController.prototype.updateProduct,
      );
      expect(perms).toContain('catalog:product:update');
    });

    it('enforces catalog:product:publish on updateStatus', () => {
      const perms = reflector.get<string[]>(
        PERMISSIONS_KEY,
        ProductsController.prototype.updateStatus,
      );
      expect(perms).toContain('catalog:product:publish');
    });

    it('enforces catalog:product:delete on deleteProduct', () => {
      const perms = reflector.get<string[]>(
        PERMISSIONS_KEY,
        ProductsController.prototype.deleteProduct,
      );
      expect(perms).toContain('catalog:product:delete');
    });
  });

  describe('Endpoint Delegations', () => {
    it('delegates getProducts to service.findAll', async () => {
      service.findAll.mockResolvedValue({
        data: [],
        meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
      });
      await controller.getProducts({}, mockUser);
      expect(service.findAll).toHaveBeenCalledWith({}, mockUser);
    });

    it('delegates getProduct to service.findByIdOrSlug', async () => {
      service.findByIdOrSlug.mockResolvedValue({ id: 'prod-1' });
      await controller.getProduct('prod-1', mockUser);
      expect(service.findByIdOrSlug).toHaveBeenCalledWith('prod-1', mockUser);
    });

    it('delegates createProduct to service.create', async () => {
      const dto: any = { title: 'Test Product' };
      service.create.mockResolvedValue({ id: 'prod-new' });
      await controller.createProduct(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });
});
