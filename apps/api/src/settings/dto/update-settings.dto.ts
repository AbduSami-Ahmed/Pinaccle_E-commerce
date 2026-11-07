import { IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CompanySettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() legalName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tradeName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() abn?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() licenseNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() suburb?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() postcode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() operatingHours?: string;
}

export class FinancialSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currencySymbol?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxName?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() taxRatePercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() taxInclusive?: boolean;
}

export class FulfillmentSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() depotPickupEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() depotName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() depotAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() depotInstructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() depotPickupFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() standardShippingFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() expressShippingFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() freeShippingThreshold?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() estimatedStandardTransit?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() estimatedExpressTransit?: string;
}

export class PolicySettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() returnWindowDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discretionaryRestockingFeePercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyDisclaimer?: string;
}

export class UpdateBusinessSettingsDto {
  @ApiPropertyOptional({ type: CompanySettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CompanySettingsDto)
  company?: CompanySettingsDto;

  @ApiPropertyOptional({ type: FinancialSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FinancialSettingsDto)
  financial?: FinancialSettingsDto;

  @ApiPropertyOptional({ type: FulfillmentSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FulfillmentSettingsDto)
  fulfillment?: FulfillmentSettingsDto;

  @ApiPropertyOptional({ type: PolicySettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PolicySettingsDto)
  policies?: PolicySettingsDto;
}
