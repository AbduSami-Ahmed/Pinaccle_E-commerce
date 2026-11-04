import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class MakesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}

export class ModelsQueryDto {
  @IsOptional()
  @IsString()
  makeId?: string;

  @IsOptional()
  @IsString()
  make?: string;
}

export class YearsQueryDto {
  @IsOptional()
  @IsString()
  modelId?: string;

  @IsOptional()
  @IsString()
  model?: string;
}

export class VariantsQueryDto {
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
}
