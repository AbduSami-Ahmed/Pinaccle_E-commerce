import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { FitmentConfidence } from '@pinnacle/contracts';

export class FitmentSearchDto {
  @IsOptional()
  @IsString()
  makeId?: string;

  @IsOptional()
  @IsString()
  make?: string;

  @IsOptional()
  @IsString()
  modelId?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1970)
  @Max(2035)
  year?: number;

  @IsOptional()
  @IsString()
  chassisId?: string;

  @IsOptional()
  @IsString()
  chassisCode?: string;

  @IsOptional()
  @IsString()
  categorySlug?: string;

  @IsOptional()
  @IsEnum(['CONFIRMED_EXACT', 'UNIVERSAL_COMPATIBLE', 'PARTIAL_REQUIRES_CHECK'] as const)
  minConfidence?: FitmentConfidence;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 12;
}

export class CheckProductFitmentDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @IsString()
  chassisId?: string;

  @IsOptional()
  @IsString()
  chassisCode?: string;

  @IsOptional()
  @IsString()
  make?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;
}
