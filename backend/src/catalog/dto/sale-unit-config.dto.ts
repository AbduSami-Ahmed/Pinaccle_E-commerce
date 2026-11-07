import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSaleUnitConfigDto {
  @IsString()
  @IsNotEmpty({ message: 'Sale unit code is required' })
  code!: string;

  @IsString()
  @IsNotEmpty({ message: 'Sale unit name is required' })
  name!: string;

  @IsInt()
  @Min(1, { message: 'Base quantity multiplier must be at least 1' })
  baseQuantityMultiplier!: number;

  @IsNumberString(
    {},
    { message: 'Retail price must be a valid monetary decimal string (e.g. "120.00")' },
  )
  retailPrice!: string;

  @IsOptional()
  @IsNumberString({}, { message: 'Compare at price must be a valid monetary decimal string' })
  compareAtPrice?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
