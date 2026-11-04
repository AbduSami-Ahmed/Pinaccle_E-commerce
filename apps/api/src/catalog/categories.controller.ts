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
import { Public } from '../auth/decorators/public.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CategoryDto } from '@pinnacle/contracts';

@ApiTags('Catalog - Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List categories hierarchy or flat list' })
  async getCategories(
    @Query('flat') flat?: string,
    @Query('activeOnly') activeOnly?: string,
  ): Promise<CategoryDto[]> {
    const isFlat = flat === 'true';
    const isActiveOnly = activeOnly === 'true';

    if (isFlat) {
      return this.categoriesService.findFlatList(isActiveOnly);
    }
    return this.categoriesService.findAll(isActiveOnly);
  }

  @Public()
  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get category by ID or slug' })
  async getCategory(@Param('idOrSlug') idOrSlug: string): Promise<CategoryDto> {
    return this.categoriesService.findByIdOrSlug(idOrSlug);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('catalog:category:manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new category (Staff)' })
  @HttpCode(HttpStatus.CREATED)
  async createCategory(@Body() dto: CreateCategoryDto): Promise<CategoryDto> {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('catalog:category:manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category (Staff)' })
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryDto> {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('catalog:category:manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete category if empty (Staff)' })
  async deleteCategory(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    return this.categoriesService.remove(id);
  }
}
