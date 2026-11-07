import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { FitmentService } from './fitment.service';
import {
  CreateFitmentDto,
  FitmentQueryDto,
  UpdateFitmentVerificationDto,
} from './dto/create-fitment.dto';
import { AuthenticatedUser, PaginatedResponse, ProductFitmentDto } from '@pinnacle/contracts';

@ApiTags('Admin - Vehicle Fitment Matrix')
@ApiBearerAuth()
@Controller('admin/fitment')
@UseGuards(PermissionsGuard)
export class AdminFitmentController {
  constructor(private readonly fitmentService: FitmentService) {}

  @Get()
  @RequirePermissions('fitment:matrix:view')
  @ApiOperation({ summary: 'List vehicle fitment mappings with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated fitment records' })
  async listFitments(
    @Query() query: FitmentQueryDto,
  ): Promise<PaginatedResponse<ProductFitmentDto>> {
    return this.fitmentService.listFitments(query);
  }

  @Post()
  @RequirePermissions('fitment:matrix:manage')
  @ApiOperation({ summary: 'Create new product to vehicle chassis fitment mapping' })
  @ApiResponse({ status: 201, description: 'Created fitment mapping' })
  async createFitment(
    @Body() dto: CreateFitmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductFitmentDto> {
    return this.fitmentService.createFitment(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('fitment:verify')
  @ApiOperation({
    summary:
      'Update fitment verification status (VERIFIED_OEM_DIRECT, UNIVERSAL_FIT, REQUIRES_CHECK)',
  })
  @ApiResponse({ status: 200, description: 'Updated fitment verification' })
  async updateVerification(
    @Param('id') id: string,
    @Body() dto: UpdateFitmentVerificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductFitmentDto> {
    return this.fitmentService.updateVerification(id, dto, user);
  }

  @Delete(':id')
  @RequirePermissions('fitment:matrix:manage')
  @ApiOperation({ summary: 'Delete product fitment mapping' })
  @ApiResponse({ status: 200, description: 'Deleted fitment mapping' })
  async deleteFitment(@Param('id') id: string) {
    return this.fitmentService.deleteFitment(id);
  }
}
