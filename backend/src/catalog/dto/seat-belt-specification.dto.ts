import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { PretensionerType, SeatBeltComponentType, SeatBeltPosition } from '@pinnacle/contracts';

const VALID_POSITIONS = [
  'FRONT_LEFT_DRIVER',
  'FRONT_RIGHT_PASSENGER',
  'REAR_LEFT',
  'REAR_RIGHT',
  'REAR_CENTER',
  'THIRD_ROW_LEFT',
  'THIRD_ROW_RIGHT',
] as const;

const VALID_COMPONENT_TYPES = [
  'RETRACTOR_ASSEMBLY',
  'BUCKLE_STALK',
  'LAP_BELT',
  'COMPLETE_ASSEMBLY',
] as const;

const VALID_PRETENSIONER_TYPES = ['PYROTECHNIC', 'MECHANICAL', 'NONE'] as const;

export class CreateSeatBeltSpecificationDto {
  @IsEnum(VALID_POSITIONS, {
    message: `Position must be one of: ${VALID_POSITIONS.join(', ')}`,
  })
  position!: SeatBeltPosition;

  @IsEnum(VALID_COMPONENT_TYPES, {
    message: `Component type must be one of: ${VALID_COMPONENT_TYPES.join(', ')}`,
  })
  componentType!: SeatBeltComponentType;

  @IsEnum(VALID_PRETENSIONER_TYPES, {
    message: `Pretensioner type must be PYROTECHNIC, MECHANICAL, or NONE`,
  })
  pretensionerType!: PretensionerType;

  @IsString()
  @IsNotEmpty({ message: 'Webbing color is required' })
  webbingColor!: string;

  @IsInt()
  @Min(2, { message: 'Mounting points must be at least 2' })
  @Max(5, { message: 'Mounting points cannot exceed 5' })
  mountingPoints!: number;

  @IsOptional()
  @IsString()
  oemReferenceTag?: string;
}
