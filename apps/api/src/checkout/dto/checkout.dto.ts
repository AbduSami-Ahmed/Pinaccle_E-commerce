import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderAddressSnapshot, ShippingMethod } from '@pinnacle/contracts';

export class OrderAddressDto implements OrderAddressSnapshot {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsString()
  @IsNotEmpty()
  line1!: string;

  @IsOptional()
  @IsString()
  line2?: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  state!: string;

  @IsString()
  @IsNotEmpty()
  postalCode!: string;

  @IsString()
  @IsNotEmpty()
  country!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsString()
  deliveryNotes?: string;
}

export class ValidateCheckoutBodyDto {
  @IsIn(['CLICK_AND_COLLECT', 'STANDARD_COURIER', 'EXPRESS_COURIER'], {
    message:
      'Valid shippingMethod is required (CLICK_AND_COLLECT, STANDARD_COURIER, EXPRESS_COURIER)',
  })
  shippingMethod!: ShippingMethod;

  @IsOptional()
  @ValidateNested()
  @Type(() => OrderAddressDto)
  shippingAddress?: OrderAddressDto;
}

export class InitiateCheckoutOrderBodyDto {
  @IsEmail({}, { message: 'A valid customer email address is required' })
  customerEmail!: string;

  @IsString()
  @IsNotEmpty({ message: 'Customer phone number is required' })
  customerPhone!: string;

  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  customerFirstName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  customerLastName!: string;

  @IsIn(['CLICK_AND_COLLECT', 'STANDARD_COURIER', 'EXPRESS_COURIER'], {
    message: 'Valid shippingMethod is required',
  })
  shippingMethod!: ShippingMethod;

  @ValidateNested()
  @Type(() => OrderAddressDto)
  shippingAddress!: OrderAddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OrderAddressDto)
  billingAddress?: OrderAddressDto;

  @IsOptional()
  @IsString()
  notes?: string;
}
