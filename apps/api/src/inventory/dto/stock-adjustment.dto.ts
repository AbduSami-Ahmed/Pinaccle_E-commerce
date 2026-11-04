import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, NotEquals } from 'class-validator';

export class StockAdjustmentDto {
  @IsOptional()
  @IsUUID('4', { message: 'Inventory item ID must be a valid UUID' })
  inventoryItemId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Serialized item ID must be a valid UUID' })
  serializedItemId?: string;

  @IsInt({ message: 'Quantity change must be an integer' })
  @NotEquals(0, { message: 'Quantity change cannot be 0' })
  quantityChange!: number;

  @IsString()
  @IsNotEmpty({
    message: 'Adjustment reason code is required (e.g. CYCLE_COUNT_DISCREPANCY, DAMAGE)',
  })
  reasonCode!: string;

  @IsOptional()
  @IsString()
  referenceNote?: string;
}
