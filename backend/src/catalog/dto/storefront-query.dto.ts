import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  ConditionGrade,
  SeatBeltComponentType,
  SeatBeltPosition,
  TyreSeason,
  TyreTerrainType,
} from '@pinnacle/contracts';

export class StorefrontQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  categorySlug?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsEnum([
    'NEW_SURPLUS',
    'GRADE_A_LIKE_NEW',
    'GRADE_B_MINOR_WEAR',
    'GRADE_C_FUNCTIONAL_BLEMISH',
  ] as const)
  condition?: ConditionGrade;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  inStockOnly?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsString()
  saleUnit?: string;

  // -------------------------------------------------------------------------
  // Tyre Specification Filters
  // -------------------------------------------------------------------------

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(125)
  @Max(355)
  sectionWidth?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(20)
  @Max(85)
  aspectRatio?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(26)
  rimDiameter?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(130)
  loadIndex?: number;

  @IsOptional()
  @IsString()
  speedRating?: string;

  @IsOptional()
  @IsEnum(['SUMMER', 'WINTER', 'ALL_SEASON'] as const)
  season?: TyreSeason;

  @IsOptional()
  @IsEnum(['HIGHWAY', 'ALL_TERRAIN', 'MUD_TERRAIN', 'PERFORMANCE'] as const)
  terrainType?: TyreTerrainType;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  runFlat?: boolean;

  // -------------------------------------------------------------------------
  // Seat-Belt Specification & Vehicle Fitment Filters
  // -------------------------------------------------------------------------

  @IsOptional()
  @IsEnum([
    'FRONT_LEFT_DRIVER',
    'FRONT_RIGHT_PASSENGER',
    'REAR_LEFT',
    'REAR_RIGHT',
    'REAR_CENTER',
    'THIRD_ROW_LEFT',
    'THIRD_ROW_RIGHT',
  ] as const)
  position?: SeatBeltPosition;

  @IsOptional()
  @IsEnum(['RETRACTOR_ASSEMBLY', 'BUCKLE_STALK', 'LAP_BELT', 'COMPLETE_ASSEMBLY'] as const)
  componentType?: SeatBeltComponentType;

  @IsOptional()
  @IsString()
  make?: string;

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
  chassis?: string;

  // -------------------------------------------------------------------------
  // Pagination & Sorting
  // -------------------------------------------------------------------------

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

  @IsOptional()
  @IsIn(['price_asc', 'price_desc', 'title', 'createdAt', 'relevance'])
  sortBy?: 'price_asc' | 'price_desc' | 'title' | 'createdAt' | 'relevance' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
