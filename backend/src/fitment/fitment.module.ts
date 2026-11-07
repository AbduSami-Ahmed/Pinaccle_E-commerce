import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CatalogModule } from '../catalog/catalog.module';
import { FitmentService } from './fitment.service';
import { FitmentController } from './fitment.controller';
import { AdminFitmentController } from './admin-fitment.controller';

@Module({
  imports: [PrismaModule, CatalogModule],
  controllers: [FitmentController, AdminFitmentController],
  providers: [FitmentService],
  exports: [FitmentService],
})
export class FitmentModule {}
