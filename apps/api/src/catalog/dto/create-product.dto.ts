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

export class CreateProductDto {
  @IsUUID('4', { message: 'Category ID must be a valid UUID' })
  categoryId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Product title is required' })
  title!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lower-case alphanumeric with hyphens',
  })
  slug?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9_-]{3,50}$/, {
    message: 'SKU must be 3-50 uppercase alphanumeric characters, hyphens or underscores',
  })
  sku?: string;

  @IsString()
  @IsNotEmpty({ message: 'Brand is required' })
  brand!: string;

  @IsOptional()
  @IsString()
  oemPartNumber?: string;

  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  description!: string;

  @IsEnum(['BULK_QUANTITY', 'INDIVIDUALLY_SERIALIZED'] as const, {
    message: 'Product type must be BULK_QUANTITY or INDIVIDUALLY_SERIALIZED',
  })
  productType!: ProductType;

  @IsOptional()
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const)
  status?: ProductStatus = 'DRAFT';

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
