import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AddToCartDto, MergeCartDto, UpdateCartItemQuantityDto } from '@pinnacle/contracts';

export class AddItemBodyDto implements AddToCartDto {
  @ApiProperty({ example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsNotEmpty()
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', description: 'UUID or unit code (e.g. TYRE_PAIR, SINGLE)' })
  @IsNotEmpty()
  @IsString()
  saleUnitConfigId!: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ example: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33' })
  @IsOptional()
  @IsString()
  serializedItemId?: string;
}

export class UpdateQuantityBodyDto implements UpdateCartItemQuantityDto {
  @ApiProperty({ example: 2, minimum: 1 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class MergeCartBodyDto implements MergeCartDto {
  @ApiProperty({ example: 'sess_1234567890abcdef' })
  @IsNotEmpty()
  @IsString()
  guestSessionToken!: string;
}
