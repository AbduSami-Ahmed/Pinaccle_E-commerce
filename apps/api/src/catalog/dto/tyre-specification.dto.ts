import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { TyreSeason, TyreTerrainType } from '@pinnacle/contracts';

export class CreateTyreSpecificationDto {
  @IsInt()
  @Min(125, { message: 'Section width must be at least 125mm' })
  @Max(355, { message: 'Section width cannot exceed 355mm' })
  sectionWidth!: number;

  @IsInt()
  @Min(20, { message: 'Aspect ratio must be at least 20%' })
  @Max(90, { message: 'Aspect ratio cannot exceed 90%' })
  aspectRatio!: number;

  @IsInt()
  @Min(12, { message: 'Rim diameter must be at least 12 inches' })
  @Max(24, { message: 'Rim diameter cannot exceed 24 inches' })
  rimDiameter!: number;

  @IsInt()
  @Min(60, { message: 'Load index must be at least 60' })
  @Max(130, { message: 'Load index cannot exceed 130' })
  loadIndex!: number;

  @IsString()
  @Matches(/^[A-Z]{1,2}$/, { message: 'Speed rating must be 1-2 uppercase letters (e.g. V, W, Y)' })
  speedRating!: string;

  @IsEnum(['SUMMER', 'WINTER', 'ALL_SEASON'] as const, {
    message: 'Season must be SUMMER, WINTER, or ALL_SEASON',
  })
  season!: TyreSeason;

  @IsEnum(['HIGHWAY', 'ALL_TERRAIN', 'MUD_TERRAIN', 'PERFORMANCE'] as const, {
    message: 'Terrain type must be HIGHWAY, ALL_TERRAIN, MUD_TERRAIN, or PERFORMANCE',
  })
  terrainType!: TyreTerrainType;

  @IsBoolean()
  runFlat!: boolean;

  @IsBoolean()
  extraLoad!: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['A', 'B', 'C', 'D', 'E'], { message: 'Fuel efficiency class must be A, B, C, D, or E' })
  fuelEfficiencyClass?: string;

  @IsOptional()
  @IsString()
  @IsIn(['A', 'B', 'C', 'D', 'E'], { message: 'Wet grip class must be A, B, C, D, or E' })
  wetGripClass?: string;

  @IsOptional()
  @IsInt()
  @Min(50, { message: 'Noise rating must be at least 50 dB' })
  @Max(95, { message: 'Noise rating cannot exceed 95 dB' })
  noiseDb?: number;
}
