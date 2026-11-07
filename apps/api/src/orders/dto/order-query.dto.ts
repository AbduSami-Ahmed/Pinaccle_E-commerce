import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { FulfillmentStatus, OrderQueryDto, OrderStatus, PaymentStatus } from '@pinnacle/contracts';

export class OrderQueryBodyDto implements OrderQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum([
    'PENDING_PAYMENT',
    'PAID',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED',
  ])
  orderStatus?: OrderStatus;

  @IsOptional()
  @IsEnum(['UNPAID', 'AUTHORIZED', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FAILED'])
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsEnum(['UNFULFILLED', 'PARTIALLY_FULFILLED', 'FULFILLED'])
  fulfillmentStatus?: FulfillmentStatus;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsEnum(['createdAt', 'totalAmount', 'orderNumber'])
  sortBy?: 'createdAt' | 'totalAmount' | 'orderNumber' = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'desc';
}
