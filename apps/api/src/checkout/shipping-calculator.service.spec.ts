import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ShippingCalculatorService } from './shipping-calculator.service';

describe('ShippingCalculatorService', () => {
  let service: ShippingCalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingCalculatorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'SHIPPING_STANDARD_FEE') return '25.00';
              if (key === 'SHIPPING_EXPRESS_FEE') return '45.00';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ShippingCalculatorService>(ShippingCalculatorService);
  });

  it('calculates $0.00 for Click and Collect depot pickup', () => {
    expect(service.calculateShippingFee('CLICK_AND_COLLECT')).toBe(0.0);
  });

  it('calculates standard freight courier fee ($25.00 AUD)', () => {
    expect(service.calculateShippingFee('STANDARD_COURIER')).toBe(25.0);
  });

  it('calculates express priority courier fee ($45.00 AUD)', () => {
    expect(service.calculateShippingFee('EXPRESS_COURIER')).toBe(45.0);
  });

  it('provides verified Prestons NSW depot address for collection', () => {
    expect(service.depotAddress.city).toBe('Prestons');
    expect(service.depotAddress.postalCode).toBe('2170');
    expect(service.depotAddress.state).toBe('NSW');
  });

  it('lists all available shipping options with estimated transit', () => {
    const methods = service.getAvailableMethods();
    expect(methods).toHaveLength(3);
    expect(methods.map((m) => m.code)).toEqual([
      'CLICK_AND_COLLECT',
      'STANDARD_COURIER',
      'EXPRESS_COURIER',
    ]);
  });
});
