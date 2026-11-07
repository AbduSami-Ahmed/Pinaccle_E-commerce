import { Test, TestingModule } from '@nestjs/testing';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';
import { StorefrontQueryDto } from './dto/storefront-query.dto';

describe('StorefrontController', () => {
  let controller: StorefrontController;
  let service: {
    search: jest.Mock;
    findBySlug: jest.Mock;
    getFilterMeta: jest.Mock;
    getVehicleTaxonomy: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      search: jest.fn().mockResolvedValue({
        data: [],
        meta: { page: 1, pageSize: 12, total: 0, totalPages: 1 },
      }),
      findBySlug: jest.fn().mockResolvedValue({
        id: 'prod-1',
        title: 'Test Product',
        slug: 'test-product',
      }),
      getFilterMeta: jest.fn().mockResolvedValue({
        brands: ['Michelin'],
        priceRange: { min: 50, max: 500 },
      }),
      getVehicleTaxonomy: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorefrontController],
      providers: [{ provide: StorefrontService, useValue: service }],
    }).compile();

    controller = module.get<StorefrontController>(StorefrontController);
  });

  it('delegates search query to StorefrontService.search', async () => {
    const query: StorefrontQueryDto = {
      search: 'michelin',
      categorySlug: 'tyres',
      page: 1,
      pageSize: 12,
    };

    const res = await controller.searchProducts(query);

    expect(service.search).toHaveBeenCalledWith(query);
    expect(res.data).toEqual([]);
    expect(res.meta.total).toBe(0);
  });

  it('delegates findBySlug to StorefrontService.findBySlug', async () => {
    const res = await controller.getProductBySlug('test-product');

    expect(service.findBySlug).toHaveBeenCalledWith('test-product');
    expect(res.title).toBe('Test Product');
  });

  it('delegates getFilterMeta to StorefrontService.getFilterMeta', async () => {
    const res = await controller.getFilterMeta('tyres');

    expect(service.getFilterMeta).toHaveBeenCalledWith('tyres');
    expect(res.brands).toEqual(['Michelin']);
  });

  it('delegates getVehicleTaxonomy to StorefrontService.getVehicleTaxonomy', async () => {
    await controller.getVehicleTaxonomy();

    expect(service.getVehicleTaxonomy).toHaveBeenCalled();
  });
});
