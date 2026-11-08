import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CancelOrderDto,
  ConfirmDepotCollectionDto,
  DispatchCourierShipmentDto,
  OrderStatus,
  PickPackOrderDto,
  ProcessRefundDto,
  UpdateOrderStatusDto,
} from '@pinnacle/contracts';

export class UpdateOrderStatusBodyDto implements UpdateOrderStatusDto {
  @IsEnum([
    'PENDING_PAYMENT',
    'PAID',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED',
  ])
  status!: OrderStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class PickPackOrderBodyDto implements PickPackOrderDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class DispatchCourierShipmentBodyDto implements DispatchCourierShipmentDto {
  @IsString()
  @MinLength(2)
  carrierName!: string;

  @IsString()
  @MinLength(2)
  trackingNumber!: string;

  @IsOptional()
  @IsString()
  trackingUrl?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ConfirmDepotCollectionBodyDto implements ConfirmDepotCollectionDto {
  @IsString()
  @MinLength(2)
  collectedBy!: string;

  @IsOptional()
  @IsString()
  idDocumentType?: string; // e.g. "NZ Driver Licence", "Passport"

  @IsOptional()
  @IsString()
  idReferenceLast4?: string; // Last 4 digits for verification audit

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CancelOrderBodyDto implements CancelOrderDto {
  @IsString()
  @MinLength(3)
  reason!: string;

  @IsOptional()
  @IsBoolean()
  refundPayment?: boolean = true;
}

export class ProcessRefundBodyDto implements ProcessRefundDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount?: number;

  @IsString()
  @MinLength(3)
  reason!: string;
}
