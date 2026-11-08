import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { StorefrontService } from './storefront.service';
import { StorefrontQueryDto } from './dto/storefront-query.dto';
import {
  PaginatedResponse,
  StorefrontFilterMetaDto,
  StorefrontProductDetailDto,
  StorefrontProductSummaryDto,
  VehicleMakeOptionDto,
} from '@pinnacle/contracts';

@ApiTags('Storefront - Discovery & Search')
@Controller('storefront')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get('products')
  @Public()
  @RateLimit({ windowSeconds: 60, maxRequests: 60, message: 'Search query rate limit reached. Please slow down.' })
  @ApiOperation({
    summary: 'Public storefront product search with multi-faceted filtering and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns filtered and paginated published products with stock availability',
  })
  async searchProducts(
    @Query() query: StorefrontQueryDto,
  ): Promise<PaginatedResponse<StorefrontProductSummaryDto>> {
    return this.storefrontService.search(query);
  }

  @Get('products/:slug')
  @Public()
  @ApiOperation({ summary: 'Get published product detail by slug for Storefront PDP' })
  @ApiResponse({ status: 200, description: 'Product detail with fitment and media' })
  @ApiResponse({ status: 404, description: 'Product not found or unpublished' })
  async getProductBySlug(@Param('slug') slug: string): Promise<StorefrontProductDetailDto> {
    return this.storefrontService.findBySlug(slug);
  }

  @Get('filters/meta')
  @Public()
  @ApiOperation({ summary: 'Get dynamic filter facets and price bounds for category' })
  @ApiQuery({ name: 'categorySlug', required: false })
  async getFilterMeta(
    @Query('categorySlug') categorySlug?: string,
  ): Promise<StorefrontFilterMetaDto> {
    return this.storefrontService.getFilterMeta(categorySlug);
  }

  @Get('vehicles')
  @Public()
  @ApiOperation({ summary: 'Get vehicle makes and models for Year-Make-Model selector' })
  async getVehicleTaxonomy(): Promise<VehicleMakeOptionDto[]> {
    return this.storefrontService.getVehicleTaxonomy();
  }
}
