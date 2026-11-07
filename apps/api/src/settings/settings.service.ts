import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessSettingsDto, UpdateBusinessSettingsDto } from '@pinnacle/contracts';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SettingsService {
  private settings: BusinessSettingsDto;

  constructor(
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
  ) {
    const taxRate = Number(this.config.get<string>('TAX_RATE_PERCENT') || '10');
    const taxInclusive = this.config.get<string>('TAX_INCLUSIVE_PRICING') !== 'false';
    const standardFee = Number(this.config.get<string>('SHIPPING_STANDARD_FEE') || '25.00');
    const expressFee = Number(this.config.get<string>('SHIPPING_EXPRESS_FEE') || '45.00');

    this.settings = {
      company: {
        legalName: 'Pinnacle Auto Spares & Commercial Tyres Pty Ltd',
        tradeName: 'Pinnacle Auto Spares',
        abn: '48 123 456 789',
        licenseNumber: 'NSW MVRL-58291',
        phone: '(02) 9822 4100',
        email: 'sales@pinnacleauto.com.au',
        address: '42 Jedda Road',
        suburb: 'Prestons',
        state: 'NSW',
        postcode: '2170',
        operatingHours: 'Mon-Fri 7:30am - 5:00pm, Sat 8:00am - 1:00pm AEST',
      },
      financial: {
        currency: 'AUD',
        currencySymbol: '$',
        taxName: 'Australian GST',
        taxRatePercent: taxRate,
        taxInclusive: taxInclusive,
      },
      fulfillment: {
        depotPickupEnabled: true,
        depotName: 'Prestons Trade Counter — Gate 2',
        depotAddress: '42 Jedda Road, Gate 2, Prestons NSW 2170',
        depotInstructions: 'Drive to Gate 2 dispatch bay. Quote order number and show photo ID.',
        depotPickupFee: 0.0,
        standardShippingFee: standardFee,
        expressShippingFee: expressFee,
        freeShippingThreshold: null,
        estimatedStandardTransit: '2-5 business days (StarTrack Road Express)',
        estimatedExpressTransit: '1-2 business days (StarTrack Premium Express)',
      },
      policies: {
        returnWindowDays: 30,
        discretionaryRestockingFeePercent: 10,
        warrantyDisclaimer:
          'All reclaimed second-hand safety components (seat belts, buckles, retractors) are individually inspected, certified, and compliant with NSW roadworthy vehicle standards. Statutory Australian Consumer Law guarantees apply.',
      },
    };
  }

  getSettings(): BusinessSettingsDto {
    return { ...this.settings };
  }

  async updateSettings(
    dto: UpdateBusinessSettingsDto,
    actorId?: string,
    ipAddress?: string,
  ): Promise<BusinessSettingsDto> {
    const beforeState = JSON.parse(JSON.stringify(this.settings));

    this.settings = {
      company: {
        ...this.settings.company,
        ...(dto.company || {}),
      },
      financial: {
        ...this.settings.financial,
        ...(dto.financial || {}),
      },
      fulfillment: {
        ...this.settings.fulfillment,
        ...(dto.fulfillment || {}),
      },
      policies: {
        ...this.settings.policies,
        ...(dto.policies || {}),
      },
    };

    const afterState = JSON.parse(JSON.stringify(this.settings));

    await this.auditService.recordLog({
      actorId: actorId ?? null,
      ipAddress: ipAddress ?? null,
      domain: 'SETTINGS',
      action: 'BUSINESS_SETTINGS_UPDATED',
      entityType: 'STORE_SETTINGS',
      entityId: 'global',
      beforeState,
      afterState,
    });

    return { ...this.settings };
  }
}
