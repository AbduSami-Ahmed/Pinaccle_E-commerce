import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CreateReturnItemDto,
  CreateReturnRequestDto,
  RecordReturnInspectionDto,
  ReturnDisposition,
  ReturnReasonCode,
  ReviewReturnRequestDto,
} from '@pinnacle/contracts';

export class CreateReturnItemBodyDto implements CreateReturnItemDto {
  @IsString()
  orderItemId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateReturnRequestBodyDto implements CreateReturnRequestDto {
  @IsString()
  orderId!: string;

  @IsEnum(['INCORRECT_FITMENT', 'DEFECTIVE_PART', 'DAMAGED_IN_SHIPPING', 'CUSTOMER_CHANGED_MIND'])
  reasonCode!: ReturnReasonCode;

  @IsString()
  @MinLength(5)
  customerNotes!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  proofPhotos?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateReturnItemBodyDto)
  items!: CreateReturnItemBodyDto[];
}

export class ReviewReturnRequestBodyDto implements ReviewReturnRequestDto {
  @IsEnum(['APPROVE', 'REJECT'])
  action!: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString()
  staffNotes?: string;
}

export class RecordReturnInspectionBodyDto implements RecordReturnInspectionDto {
  @IsString()
  returnItemId!: string;

  @IsEnum(['RESTOCK_TO_INVENTORY', 'SCRAP_WRITEOFF', 'RETURN_TO_SENDER'])
  disposition!: ReturnDisposition;

  @IsString()
  @MinLength(5)
  inspectionNotes!: string;

  @IsBoolean()
  refundEligible!: boolean;
}
