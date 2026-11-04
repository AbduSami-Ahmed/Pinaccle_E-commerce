import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ConditionGrade } from '@pinnacle/contracts';

const VALID_GRADES: ConditionGrade[] = [
  'NEW_SURPLUS',
  'GRADE_A_LIKE_NEW',
  'GRADE_B_MINOR_WEAR',
  'GRADE_C_FUNCTIONAL_BLEMISH',
];

export class ReceiveSerializedPartDto {
  @IsUUID('4', { message: 'Product ID must be a valid UUID' })
  productId!: string;

  @IsUUID('4', { message: 'Warehouse ID must be a valid UUID' })
  warehouseId!: string;

  @IsOptional()
  @IsString()
  stockBarcode?: string;

  @IsOptional()
  @IsString()
  donorVehicleVin?: string;

  @IsEnum(VALID_GRADES, {
    message: `Condition grade must be one of: ${VALID_GRADES.join(', ')}`,
  })
  conditionGrade!: ConditionGrade;

  @IsString()
  @IsNotEmpty({ message: 'Condition inspection notes are required for safety transparency' })
  conditionNotes!: string;

  @IsOptional()
  @IsNumberString({}, { message: 'Pretensioner resistance must be a decimal (e.g. "2.15")' })
  pretensionerResistanceOhms?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actualPhotos?: string[];

  @IsString()
  @IsNotEmpty({ message: 'Location bin is required (e.g. AISLE-04-BIN-12)' })
  locationBin!: string;

  @IsNumberString({}, { message: 'Cost price must be a valid decimal string (e.g. "45.00")' })
  costPrice!: string;

  @IsOptional()
  @IsString()
  referencePo?: string;

  @IsOptional()
  @IsString()
  reasonCode?: string;
}
