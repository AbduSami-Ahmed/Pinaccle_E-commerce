import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { PricingTaxService } from './pricing-tax.service';
import { ShippingCalculatorService } from './shipping-calculator.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CartModule } from '../cart/cart.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PrismaModule, AuthModule, CartModule, InventoryModule, PaymentsModule],
  controllers: [CheckoutController],
  providers: [CheckoutService, PricingTaxService, ShippingCalculatorService],
  exports: [CheckoutService, PricingTaxService, ShippingCalculatorService],
})
export class CheckoutModule {}
