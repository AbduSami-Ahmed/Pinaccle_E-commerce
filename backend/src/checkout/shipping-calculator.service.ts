import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShippingMethod } from '@pinnacle/contracts';

export interface ShippingOption {
  code: ShippingMethod;
  name: string;
  description: string;
  fee: number;
  currency: string;
  estimatedTransit: string;
  pickupLocation?: {
    name: string;
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    instructions: string;
  };
}

@Injectable()
export class ShippingCalculatorService {
  private readonly standardCourierFee: number;
  private readonly expressCourierFee: number;

  public readonly depotAddress = {
    name: 'Pinnacle Auto Spares & Commercial Tyres — Auckland Central Hub',
    line1: '18 Industry Road',
    city: 'Auckland',
    state: 'Auckland',
    postalCode: '1061',
    country: 'NZ',
    instructions: 'Drive to Trade Counter & Dispatch Bay 2, Penrose. Quote order number and show photo ID.',
  };

  constructor(private readonly config: ConfigService) {
    this.standardCourierFee = Number(this.config.get<string>('SHIPPING_STANDARD_FEE') || '25.00');
    this.expressCourierFee = Number(this.config.get<string>('SHIPPING_EXPRESS_FEE') || '45.00');
  }

  /**
   * Calculate shipping fee for given method and destination.
   */
  calculateShippingFee(method: ShippingMethod, _destinationPostalCode?: string): number {
    switch (method) {
      case 'CLICK_AND_COLLECT':
        return 0.0;
      case 'STANDARD_COURIER':
        return this.standardCourierFee;
      case 'EXPRESS_COURIER':
        return this.expressCourierFee;
      default:
        return this.standardCourierFee;
    }
  }

  /**
   * Get all available shipping options and rates.
   */
  getAvailableMethods(): ShippingOption[] {
    return [
      {
        code: 'CLICK_AND_COLLECT',
        name: 'Click & Collect (Auckland Trade Hub)',
        description: 'Free collection from our Penrose, Auckland trade facility during business hours.',
        fee: 0.0,
        currency: 'NZD',
        estimatedTransit: 'Ready in 2 business hours',
        pickupLocation: this.depotAddress,
      },
      {
        code: 'STANDARD_COURIER',
        name: 'Standard Freight (NZ Post / Mainfreight)',
        description: 'CourierPost / Mainfreight road delivery across North & South Islands.',
        fee: this.standardCourierFee,
        currency: 'NZD',
        estimatedTransit: '2-4 business days (Inter-island may require 3-5 days)',
      },
      {
        code: 'EXPRESS_COURIER',
        name: 'Express Priority Courier (NZ Post Express)',
        description: 'Expedited transport priority dispatch for urgent automotive repairs.',
        fee: this.expressCourierFee,
        currency: 'NZD',
        estimatedTransit: '1-2 business days',
      },
    ];
  }
}
