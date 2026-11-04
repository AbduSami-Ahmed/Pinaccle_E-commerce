import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto, UpdateProductStatusDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import {
  AuthenticatedUser,
  PaginatedResponse,
  ProductDto,
  ProductListItemDto,
} from '@pinnacle/contracts';

@ApiTags('Catalog - Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('catalog:product:view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List products with server-side filters, sorting, and pagination' })
  async getProducts(
    @Query() query: ProductQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResponse<ProductListItemDto>> {
    return this.productsService.findAll(query, user);
  }

  @Get(':idOrSlug')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('catalog:product:view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get full product details by ID or slug' })
  async getProduct(
    @Param('idOrSlug') idOrSlug: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductDto> {
    return this.productsService.findByIdOrSlug(idOrSlug, user);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('catalog:product:create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create master catalogue product (Strictly catalogue, no stock)' })
  @HttpCode(HttpStatus.CREATED)
  async createProduct(@Body() dto: CreateProductDto): Promise<ProductDto> {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('catalog:product:update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update master catalogue product' })
  async updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto): Promise<ProductDto> {
    return this.productsService.update(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('catalog:product:publish')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product lifecycle status (DRAFT / PUBLISHED / ARCHIVED)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateProductStatusDto,
  ): Promise<ProductDto> {
    return this.productsService.updateStatus(id, dto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('catalog:product:delete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Safely delete or archive product' })
  async deleteProduct(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string; archived: boolean }> {
    return this.productsService.remove(id);
  }
}
