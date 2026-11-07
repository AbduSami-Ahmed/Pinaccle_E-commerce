import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CategoryDto } from '@pinnacle/contracts';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(onlyActive: boolean = false): Promise<CategoryDto[]> {
    const categories = await this.prisma.category.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        children: {
          where: onlyActive ? { isActive: true } : undefined,
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        },
      },
    });

    // Return root categories with their nested children
    return categories.filter((c) => !c.parentId).map((c) => this.mapToDto(c, categories));
  }

  async findFlatList(onlyActive: boolean = false): Promise<CategoryDto[]> {
    const categories = await this.prisma.category.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });

    return categories.map((c) => ({
      id: c.id,
      parentId: c.parentId,
      slug: c.slug,
      name: c.name,
      description: c.description,
      displayOrder: c.displayOrder,
      isActive: c.isActive,
    }));
  }

  async findByIdOrSlug(idOrSlug: string): Promise<CategoryDto> {
    const category = await this.prisma.category.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        children: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category "${idOrSlug}" not found`);
    }

    return {
      id: category.id,
      parentId: category.parentId,
      slug: category.slug,
      name: category.name,
      description: category.description,
      displayOrder: category.displayOrder,
      isActive: category.isActive,
      children: category.children.map((c) => ({
        id: c.id,
        parentId: c.parentId,
        slug: c.slug,
        name: c.name,
        description: c.description,
        displayOrder: c.displayOrder,
        isActive: c.isActive,
      })),
    };
  }

  async create(dto: CreateCategoryDto): Promise<CategoryDto> {
    const slug = dto.slug ?? this.generateSlug(dto.name);

    // Ensure unique slug
    const existing = await this.prisma.category.findUnique({
      where: { slug },
    });
    if (existing) {
      throw new ConflictException(`Category slug "${slug}" already exists`);
    }

    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new BadRequestException(`Parent category ID ${dto.parentId} does not exist`);
      }
    }

    const created = await this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description ?? null,
        parentId: dto.parentId ?? null,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    return {
      id: created.id,
      parentId: created.parentId,
      slug: created.slug,
      name: created.name,
      description: created.description,
      displayOrder: created.displayOrder,
      isActive: created.isActive,
    };
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryDto> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.prisma.category.findUnique({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException(`Category slug "${dto.slug}" already exists`);
      }
    }

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new BadRequestException(`Parent category ID ${dto.parentId} does not exist`);
      }
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        slug: dto.slug ?? undefined,
        description: dto.description !== undefined ? dto.description : undefined,
        parentId: dto.parentId !== undefined ? dto.parentId : undefined,
        displayOrder: dto.displayOrder ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
    });

    return {
      id: updated.id,
      parentId: updated.parentId,
      slug: updated.slug,
      name: updated.name,
      description: updated.description,
      displayOrder: updated.displayOrder,
      isActive: updated.isActive,
    };
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        products: { select: { id: true } },
        children: { select: { id: true } },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    if (category.products.length > 0) {
      throw new ConflictException(
        `Cannot delete category "${category.name}" with ${category.products.length} associated products. Reassign products or deactivate the category instead.`,
      );
    }

    if (category.children.length > 0) {
      throw new ConflictException(
        `Cannot delete category "${category.name}" with ${category.children.length} subcategories.`,
      );
    }

    await this.prisma.category.delete({ where: { id } });

    return {
      success: true,
      message: `Category "${category.name}" successfully removed`,
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private mapToDto(cat: any, all: any[]): CategoryDto {
    const children = all.filter((c) => c.parentId === cat.id);
    return {
      id: cat.id,
      parentId: cat.parentId,
      slug: cat.slug,
      name: cat.name,
      description: cat.description,
      displayOrder: cat.displayOrder,
      isActive: cat.isActive,
      children: children.map((child) => this.mapToDto(child, all)),
    };
  }
}
