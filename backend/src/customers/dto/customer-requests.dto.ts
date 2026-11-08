import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CreateCustomerAddressDto,
  UpdateCustomerAddressDto,
  UpdateCustomerProfileDto,
} from '@pinnacle/contracts';

export class UpdateProfileBodyDto implements UpdateCustomerProfileDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Smith' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+64 21 890 123' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateAddressBodyDto implements CreateCustomerAddressDto {
  @ApiPropertyOptional({ example: 'Penrose Workshop Bay 2' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ example: '18 Industry Road' })
  @IsNotEmpty()
  @IsString()
  line1!: string;

  @ApiPropertyOptional({ example: 'Unit 4' })
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiProperty({ example: 'Penrose' })
  @IsNotEmpty()
  @IsString()
  city!: string;

  @ApiProperty({ example: 'Auckland' })
  @IsNotEmpty()
  @IsString()
  state!: string;

  @ApiProperty({ example: '1061' })
  @IsNotEmpty()
  @IsString()
  postalCode!: string;

  @ApiPropertyOptional({ example: 'NZ', default: 'NZ' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressBodyDto implements UpdateCustomerAddressDto {
  @ApiPropertyOptional({ example: 'Penrose Workshop Bay 2' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ example: '18 Industry Road' })
  @IsOptional()
  @IsString()
  line1?: string;

  @ApiPropertyOptional({ example: 'Unit 4' })
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiPropertyOptional({ example: 'Penrose' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Auckland' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '1061' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'NZ' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
