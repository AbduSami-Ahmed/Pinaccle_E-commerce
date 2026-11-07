import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PricingTaxService } from './pricing-tax.service';

describe('PricingTaxService', () => {
  let service: PricingTaxService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingTaxService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'TAX_RATE_PERCENT') return '10';
              if (key === 'TAX_INCLUSIVE_PRICING') return 'true';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PricingTaxService>(PricingTaxService);
  });

  describe('calculateTaxInclusive (ATO Australian GST model)', () => {
    it('correctly extracts 1/11th GST from a tax-inclusive retail price of $110.00', () => {
      const res = service.calculateTaxInclusive(110.0);
      expect(res.taxAmount).toBe(10.0);
      expect(res.subtotal).toBe(100.0);
      expect(res.grossTotal).toBe(110.0);
      expect(res.taxRatePercent).toBe(10);
      expect(res.isTaxInclusive).toBe(true);
    });

    it('correctly extracts GST from odd amounts with 2-decimal rounding', () => {
      // $290.00 gross -> tax = 290 * 10 / 110 = 26.3636... -> 26.36, subtotal = 263.64
      const res = service.calculateTaxInclusive(290.0);
      expect(res.taxAmount).toBe(26.36);
      expect(res.subtotal).toBe(263.64);
      expect(res.grossTotal).toBe(290.0);
    });

    it('handles zero or negative amounts gracefully', () => {
      const resZero = service.calculateTaxInclusive(0);
      expect(resZero.taxAmount).toBe(0);
      expect(resZero.subtotal).toBe(0);

      const resNeg = service.calculateTaxInclusive(-50);
      expect(resNeg.taxAmount).toBe(0);
      expect(resNeg.subtotal).toBe(0);
    });

    it('supports custom tax rates without hardcoding', () => {
      // 15% NZ GST model: 115 gross -> tax = 15, subtotal = 100
      const res = service.calculateTaxInclusive(115.0, 15);
      expect(res.taxAmount).toBe(15.0);
      expect(res.subtotal).toBe(100.0);
      expect(res.taxRatePercent).toBe(15);
    });
  });

  describe('calculateTaxExclusive', () => {
    it('adds 10% tax on top of net subtotal', () => {
      const res = service.calculateTaxExclusive(100.0);
      expect(res.taxAmount).toBe(10.0);
      expect(res.subtotal).toBe(100.0);
      expect(res.grossTotal).toBe(110.0);
    });
  });
});
