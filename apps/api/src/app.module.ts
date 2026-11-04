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
