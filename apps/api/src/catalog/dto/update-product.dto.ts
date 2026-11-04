import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';
import { ProductStatus, ProductType } from '@pinnacle/contracts';
import { CreateTyreSpecificationDto } from './tyre-specification.dto';
import { CreateSeatBeltSpecificationDto } from './seat-belt-specification.dto';
import { CreateProductMediaDto } from './product-media.dto';
import { CreateSaleUnitConfigDto } from './sale-unit-config.dto';

export class UpdateProductDto {
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9_-]{3,50}$/)
  sku?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  brand?: string;

  @IsOptional()
  @IsString()
  oemPartNumber?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['BULK_QUANTITY', 'INDIVIDUALLY_SERIALIZED'] as const)
  productType?: ProductType;

  @IsOptional()
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const)
  status?: ProductStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateTyreSpecificationDto)
  tyreSpecification?: CreateTyreSpecificationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateSeatBeltSpecificationDto)
  seatBeltSpecification?: CreateSeatBeltSpecificationDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductMediaDto)
  media?: CreateProductMediaDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleUnitConfigDto)
  saleUnits?: CreateSaleUnitConfigDto[];
}

export class UpdateProductStatusDto {
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const, {
    message: 'Status must be DRAFT, PUBLISHED, or ARCHIVED',
  })
  status!: ProductStatus;
}
