import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { FitmentVerificationStatus } from '@pinnacle/contracts';

export class CreateFitmentDto {
  @IsUUID()
  productId!: string;

  @IsUUID()
  vehicleChassisId!: string;

  @IsOptional()
  @IsEnum(['VERIFIED_OEM_DIRECT', 'UNIVERSAL_FIT', 'REQUIRES_CHECK'] as const)
  verificationStatus?: FitmentVerificationStatus;

  @IsOptional()
  @IsString()
  fitmentNotes?: string;
}

export class UpdateFitmentVerificationDto {
  @IsEnum(['VERIFIED_OEM_DIRECT', 'UNIVERSAL_FIT', 'REQUIRES_CHECK'] as const)
  verificationStatus!: FitmentVerificationStatus;

  @IsOptional()
  @IsString()
  fitmentNotes?: string;
}

export class FitmentQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  vehicleChassisId?: string;

  @IsOptional()
  @IsEnum(['VERIFIED_OEM_DIRECT', 'UNIVERSAL_FIT', 'REQUIRES_CHECK'] as const)
  verificationStatus?: FitmentVerificationStatus;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  pageSize?: number = 20;
}
