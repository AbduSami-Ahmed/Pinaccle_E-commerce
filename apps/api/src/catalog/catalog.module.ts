import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { SkuService } from './sku.service';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { MediaController } from './media.controller';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';

@Module({
  imports: [StorageModule, PrismaModule],
  controllers: [CategoriesController, ProductsController, MediaController, StorefrontController],
  providers: [CategoriesService, SkuService, ProductsService, StorefrontService],
  exports: [CategoriesService, SkuService, ProductsService, StorefrontService],
})
export class CatalogModule {}
