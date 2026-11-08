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
    const taxRate = Number(this.config.get<string>('TAX_RATE_PERCENT') || '15');
    const taxInclusive = this.config.get<string>('TAX_INCLUSIVE_PRICING') !== 'false';
    const standardFee = Number(this.config.get<string>('SHIPPING_STANDARD_FEE') || '25.00');
    const expressFee = Number(this.config.get<string>('SHIPPING_EXPRESS_FEE') || '45.00');

    this.settings = {
      company: {
        legalName: 'Pinnacle Auto Spares & Commercial Tyres Ltd',
        tradeName: 'Pinnacle Auto Spares',
        abn: '9429041234567',
        licenseNumber: 'MVD-89211',
        phone: '(09) 525 8890 | 0800 PINNACLE',
        email: 'trade@pinnacleparts.co.nz',
        address: '18 Industry Road',
        suburb: 'Penrose',
        state: 'Auckland',
        postcode: '1061',
        operatingHours: 'Mon-Fri 7:30am - 5:00pm, Sat 8:00am - 1:00pm NZST',
      },
      financial: {
        currency: 'NZD',
        currencySymbol: '$',
        taxName: 'New Zealand GST',
        taxRatePercent: taxRate,
        taxInclusive: taxInclusive,
      },
      fulfillment: {
        depotPickupEnabled: true,
        depotName: 'Auckland Central Trade Counter — Hub 1',
        depotAddress: '18 Industry Road, Penrose, Auckland 1061, New Zealand',
        depotInstructions: 'Drive to trade counter dispatch bay. Quote order number and show photo ID.',
        depotPickupFee: 0.0,
        standardShippingFee: standardFee,
        expressShippingFee: expressFee,
        freeShippingThreshold: null,
        estimatedStandardTransit: '2-5 business days (CourierPost / Mainfreight Express)',
        estimatedExpressTransit: '1-2 business days (CourierPost Priority Courier)',
      },
      policies: {
        returnWindowDays: 30,
        discretionaryRestockingFeePercent: 10,
        warrantyDisclaimer:
          'All reclaimed second-hand safety components (seat belts, buckles, retractors) are individually inspected, certified, and compliant with NZ Land Transport Rule standards. Statutory Consumer Guarantees Act 1993 (CGA) guarantees apply.',
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
