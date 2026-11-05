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
    name: 'Pinnacle Auto Spares — Prestons Depot',
    line1: '42 Jedda Road',
    city: 'Prestons',
    state: 'NSW',
    postalCode: '2170',
    country: 'AU',
    instructions: 'Drive to Gate 2 dispatch bay. Quote order number and show photo ID.',
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
        name: 'Click & Collect (Sydney Depot)',
        description: 'Free collection from our Prestons NSW trade facility during business hours.',
        fee: 0.0,
        currency: 'AUD',
        estimatedTransit: 'Ready in 2 business hours',
        pickupLocation: this.depotAddress,
      },
      {
        code: 'STANDARD_COURIER',
        name: 'Standard Freight Courier',
        description: 'StarTrack / TNT road courier dispatch directly to your workshop or home.',
        fee: this.standardCourierFee,
        currency: 'AUD',
        estimatedTransit: '2-5 business days',
      },
      {
        code: 'EXPRESS_COURIER',
        name: 'Express Priority Courier',
        description: 'Expedited transport priority dispatch for urgent automotive repairs.',
        fee: this.expressCourierFee,
        currency: 'AUD',
        estimatedTransit: '1-2 business days',
      },
    ];
  }
}
