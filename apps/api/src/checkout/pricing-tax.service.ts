import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TaxCalculationResult {
  subtotal: number; // Net amount before tax
  taxAmount: number; // Extracted or added tax component
  grossTotal: number; // Subtotal + Tax
  taxRatePercent: number; // e.g. 10 for 10% GST
  isTaxInclusive: boolean;
}

@Injectable()
export class PricingTaxService {
  private readonly defaultTaxRate: number;
  private readonly defaultTaxInclusive: boolean;

  isDefaultTaxInclusive(): boolean {
    return this.defaultTaxInclusive;
  }

  constructor(private readonly config: ConfigService) {
    // Australia statutory default is 10% GST, tax-inclusive display
    this.defaultTaxRate = Number(this.config.get<string>('TAX_RATE_PERCENT') || '10');
    this.defaultTaxInclusive = this.config.get<string>('TAX_INCLUSIVE_PRICING') !== 'false';
  }

  /**
   * Calculate statutory tax for an order or item.
   * Under Australian consumer law and ATO GST rulings (GSTR 2002/2),
   * retail prices are quoted GST-inclusive. The tax fraction is 1/11th (10 / 110).
   *
   * @param grossAmount Total retail price charged to customer
   * @param overrideRate Optional custom rate percent (e.g. 0 for export or exempt items)
   */
  calculateTaxInclusive(grossAmount: number, overrideRate?: number): TaxCalculationResult {
    const rate = overrideRate !== undefined ? overrideRate : this.defaultTaxRate;
    const gross = Math.max(0, this.roundToTwoDecimals(grossAmount));

    if (rate <= 0 || gross === 0) {
      return {
        subtotal: gross,
        taxAmount: 0,
        grossTotal: gross,
        taxRatePercent: 0,
        isTaxInclusive: true,
      };
    }

    // tax = gross * (rate / (100 + rate))
    const taxAmount = this.roundToTwoDecimals(gross * (rate / (100 + rate)));
    const subtotal = this.roundToTwoDecimals(gross - taxAmount);

    return {
      subtotal,
      taxAmount,
      grossTotal: gross,
      taxRatePercent: rate,
      isTaxInclusive: true,
    };
  }

  /**
   * Calculate tax when added on top of a net subtotal (exclusive model).
   */
  calculateTaxExclusive(netSubtotal: number, overrideRate?: number): TaxCalculationResult {
    const rate = overrideRate !== undefined ? overrideRate : this.defaultTaxRate;
    const subtotal = Math.max(0, this.roundToTwoDecimals(netSubtotal));

    if (rate <= 0 || subtotal === 0) {
      return {
        subtotal,
        taxAmount: 0,
        grossTotal: subtotal,
        taxRatePercent: 0,
        isTaxInclusive: false,
      };
    }

    const taxAmount = this.roundToTwoDecimals(subtotal * (rate / 100));
    const grossTotal = this.roundToTwoDecimals(subtotal + taxAmount);

    return {
      subtotal,
      taxAmount,
      grossTotal,
      taxRatePercent: rate,
      isTaxInclusive: false,
    };
  }

  /**
   * Helper to round financial numbers to 2 decimal places to avoid floating point drift.
   */
  roundToTwoDecimals(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }
}
