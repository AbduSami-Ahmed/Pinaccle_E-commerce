import { IsDateString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class StockReservationDto {
  @IsOptional()
  @IsUUID('4', { message: 'Cart item ID must be a valid UUID' })
  cartItemId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Order ID must be a valid UUID' })
  orderId?: string;

  @IsUUID('4', { message: 'Product ID must be a valid UUID' })
  productId!: string;

  @IsUUID('4', { message: 'Sale unit config ID must be a valid UUID' })
  saleUnitConfigId!: string;

  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Reservation quantity must be at least 1 unit' })
  quantity!: number;

  @IsOptional()
  @IsUUID('4')
  serializedItemId?: string;

  @IsOptional()
  @IsUUID('4')
  warehouseId?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
