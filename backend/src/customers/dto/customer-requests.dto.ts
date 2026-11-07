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

  @ApiPropertyOptional({ example: '+61 412 345 678' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateAddressBodyDto implements CreateCustomerAddressDto {
  @ApiPropertyOptional({ example: 'Prestons Workshop Bay 2' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ example: '42 Jedda Road' })
  @IsNotEmpty()
  @IsString()
  line1!: string;

  @ApiPropertyOptional({ example: 'Unit 4' })
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiProperty({ example: 'Prestons' })
  @IsNotEmpty()
  @IsString()
  city!: string;

  @ApiProperty({ example: 'NSW' })
  @IsNotEmpty()
  @IsString()
  state!: string;

  @ApiProperty({ example: '2170' })
  @IsNotEmpty()
  @IsString()
  postalCode!: string;

  @ApiPropertyOptional({ example: 'AU', default: 'AU' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressBodyDto implements UpdateCustomerAddressDto {
  @ApiPropertyOptional({ example: 'Prestons Workshop Bay 2' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ example: '42 Jedda Road' })
  @IsOptional()
  @IsString()
  line1?: string;

  @ApiPropertyOptional({ example: 'Unit 4' })
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiPropertyOptional({ example: 'Prestons' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'NSW' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '2170' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'AU' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
