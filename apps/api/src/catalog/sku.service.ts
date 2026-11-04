import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTyreSpecificationDto } from './dto/tyre-specification.dto';
import { CreateSeatBeltSpecificationDto } from './dto/seat-belt-specification.dto';
import { SeatBeltPosition } from '@pinnacle/contracts';
import { randomBytes } from 'crypto';

@Injectable()
export class SkuService {
  private static readonly SKU_REGEX = /^[A-Z0-9_-]{3,50}$/;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate that an explicit SKU conforms to syntax constraints.
   */
  validateSkuFormat(sku: string): void {
    if (!sku || typeof sku !== 'string') {
      throw new BadRequestException('SKU must be a non-empty string');
    }

    const trimmed = sku.trim();
    if (trimmed.length < 3 || trimmed.length > 50) {
      throw new BadRequestException('SKU must be between 3 and 50 characters in length');
    }

    if (!SkuService.SKU_REGEX.test(trimmed)) {
      throw new BadRequestException(
        'SKU must consist only of uppercase alphanumeric characters, hyphens, and underscores',
      );
    }
  }

  /**
   * Checks if a SKU is already in use by another product.
   */
  async ensureSkuUnique(sku: string, excludeProductId?: string): Promise<void> {
    const existing = await this.prisma.product.findUnique({
      where: { sku: sku.trim().toUpperCase() },
      select: { id: true },
    });

    if (existing && existing.id !== excludeProductId) {
      throw new ConflictException(`SKU "${sku}" is already in use by product ${existing.id}`);
    }
  }

  /**
   * Automatically generate a compliant, unique SKU based on category specifications.
   */
  async generateUniqueSku(params: {
    categorySlug?: string;
    brand: string;
    tyreSpec?: CreateTyreSpecificationDto;
    seatBeltSpec?: CreateSeatBeltSpecificationDto;
  }): Promise<string> {
    const cleanBrand = this.sanitizeBrandCode(params.brand);
    let candidateSku = '';

    for (let attempt = 0; attempt < 5; attempt++) {
      const suffix = randomBytes(2).toString('hex').toUpperCase();

      if (params.categorySlug === 'tyres' && params.tyreSpec) {
        const { sectionWidth, aspectRatio, rimDiameter } = params.tyreSpec;
        candidateSku = `TYR-${cleanBrand}-${sectionWidth}${aspectRatio}${rimDiameter}-${suffix}`;
      } else if (params.categorySlug === 'seat-belts' && params.seatBeltSpec) {
        const posCode = this.mapPositionToShortCode(params.seatBeltSpec.position);
        candidateSku = `SBLT-${cleanBrand}-${posCode}-${suffix}`;
      } else {
        const longSuffix = randomBytes(3).toString('hex').toUpperCase();
        candidateSku = `PRD-${cleanBrand}-${longSuffix}`;
      }

      const existing = await this.prisma.product.findUnique({
        where: { sku: candidateSku },
        select: { id: true },
      });

      if (!existing) {
        return candidateSku;
      }
    }

    // High entropy fallback
    return `PRD-${cleanBrand}-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
  }

  private sanitizeBrandCode(brand: string): string {
    const cleaned = brand.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (cleaned.length < 3) {
      return (cleaned + 'XXX').slice(0, 3);
    }
    return cleaned.slice(0, 4);
  }

  private mapPositionToShortCode(pos: SeatBeltPosition): string {
    const map: Record<SeatBeltPosition, string> = {
      FRONT_LEFT_DRIVER: 'FLD',
      FRONT_RIGHT_PASSENGER: 'FRP',
      REAR_LEFT: 'RL',
      REAR_RIGHT: 'RR',
      REAR_CENTER: 'RC',
      THIRD_ROW_LEFT: '3RL',
      THIRD_ROW_RIGHT: '3RR',
    };
    return map[pos] ?? 'GEN';
  }
}
