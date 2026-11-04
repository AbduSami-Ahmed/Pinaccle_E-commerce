import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class StockTransferDto {
  @IsUUID('4', { message: 'Product ID must be a valid UUID' })
  productId!: string;

  @IsUUID('4', { message: 'Source warehouse ID must be a valid UUID' })
  sourceWarehouseId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Source bin location is required' })
  sourceBin!: string;

  @IsUUID('4', { message: 'Destination warehouse ID must be a valid UUID' })
  destinationWarehouseId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Destination bin location is required' })
  destinationBin!: string;

  @IsInt({ message: 'Transfer quantity must be an integer' })
  @Min(1, { message: 'Transfer quantity must be at least 1 unit' })
  quantity!: number;

  @IsOptional()
  @IsString()
  referenceNote?: string;
}
