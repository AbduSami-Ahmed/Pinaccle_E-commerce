import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStaffDto {
  @ApiProperty({ example: 'technician@pinnacleparts.co.nz' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Hamish' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'MacDonald' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiPropertyOptional({ example: 'Senior Quality Inspector' })
  @IsString()
  @IsOptional()
  jobTitle?: string;

  @ApiPropertyOptional({ type: [String], example: ['role-uuid-1'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roleIds?: string[];
}

