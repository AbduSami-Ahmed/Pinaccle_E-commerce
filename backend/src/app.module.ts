import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StorageModule } from './storage/storage.module';
import { CatalogModule } from './catalog/catalog.module';
import { InventoryModule } from './inventory/inventory.module';
import { FitmentModule } from './fitment/fitment.module';
import { CustomersModule } from './customers/customers.module';
import { CartModule } from './cart/cart.module';
import { PaymentsModule } from './payments/payments.module';
import { CheckoutModule } from './checkout/checkout.module';
import { OrdersModule } from './orders/orders.module';
import { AuditModule } from './audit/audit.module';
import { SettingsModule } from './settings/settings.module';
import { AdminModule } from './admin/admin.module';
import { DocumentsModule } from './documents/documents.module';
import { NotificationsModule } from './notifications/notifications.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    // Configuration — available globally; no import needed in child modules
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Database — global module; PrismaService injected anywhere without re-import
    PrismaModule,
    // Feature modules
    HealthModule,
    AuthModule,
    UsersModule,
    StorageModule,
    CatalogModule,
    InventoryModule,
    FitmentModule,
    CustomersModule,
    CartModule,
    PaymentsModule,
    CheckoutModule,
    OrdersModule,
    AuditModule,
    SettingsModule,
    AdminModule,
    DocumentsModule,
    NotificationsModule,
    IntegrationsModule,
  ],
  controllers: [],
  providers: [
    // Apply JwtAuthGuard to every route globally.
    // Routes that should be public must use @Public() decorator.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
