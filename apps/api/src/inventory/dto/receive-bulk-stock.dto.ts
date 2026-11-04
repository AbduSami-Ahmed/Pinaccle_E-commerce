import {
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class ReceiveBulkStockDto {
  @IsUUID('4', { message: 'Product ID must be a valid UUID' })
  productId!: string;

  @IsUUID('4', { message: 'Warehouse ID must be a valid UUID' })
  warehouseId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Location bin is required (e.g. AISLE-02-RACK-C)' })
  locationBin!: string;

  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity received must be at least 1 unit' })
  quantity!: number;

  @IsNumberString({}, { message: 'Cost price must be a valid decimal string (e.g. "85.50")' })
  costPrice!: string;

  @IsOptional()
  @IsString()
  referencePo?: string;

  @IsOptional()
  @IsString()
  reasonCode?: string;
}
