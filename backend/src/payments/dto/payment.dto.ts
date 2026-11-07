import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaymentGatewayProvider } from '@pinnacle/contracts';

export class CreatePaymentIntentRequestDto {
  @IsUUID('4', { message: 'Order ID must be a valid UUID' })
  orderId!: string;

  @IsOptional()
  @IsIn(['STRIPE', 'MOCK', 'PAYPAL', 'MANUAL'])
  provider?: PaymentGatewayProvider;
}

export class MockPaymentConfirmRequestDto {
  @IsString()
  @IsNotEmpty()
  transactionReference!: string;

  @IsOptional()
  @IsBoolean()
  simulateSuccess?: boolean = true;
}
