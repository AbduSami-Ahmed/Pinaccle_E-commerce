import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { MockPaymentGatewayAdapter } from './mock-payment.adapter';
import { StripePaymentGatewayAdapter } from './stripe-payment.adapter';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, MockPaymentGatewayAdapter, StripePaymentGatewayAdapter],
  exports: [PaymentsService, MockPaymentGatewayAdapter, StripePaymentGatewayAdapter],
})
export class PaymentsModule {}
