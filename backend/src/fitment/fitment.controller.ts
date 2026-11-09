import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CacheControl } from '../common/decorators/cache-control.decorator';
import { FitmentService } from './fitment.service';
import {
  MakesQueryDto,
  ModelsQueryDto,
  YearsQueryDto,
  VariantsQueryDto,
} from './dto/vehicle-query.dto';
import { CheckProductFitmentDto, FitmentSearchDto } from './dto/fitment-search.dto';
import {
  FitmentSearchResultDto,
  PaginatedResponse,
  VehicleChassisDto,
  VehicleLookupResultDto,
  VehicleMakeDto,
  VehicleModelDto,
} from '@pinnacle/contracts';
import { VehicleLookupService } from '../integrations/vehicle-lookup.service';

@ApiTags('Fitment - Customer Vehicle Finder')
@Controller('fitment')
export class FitmentController {
  constructor(
    private readonly fitmentService: FitmentService,
    private readonly vehicleLookupService: VehicleLookupService,
  ) {}

  @Get('makes')
  @Public()
  @CacheControl({ public: true, maxAge: 1800, sMaxAge: 3600, staleWhileRevalidate: 86400 })
  @ApiOperation({ summary: 'Get list of vehicle makes' })
  @ApiResponse({ status: 200, description: 'List of vehicle makes' })
  async getMakes(@Query() query: MakesQueryDto): Promise<VehicleMakeDto[]> {
    return this.fitmentService.getMakes(query);
  }

  @Get('models')
  @Public()
  @CacheControl({ public: true, maxAge: 1800, sMaxAge: 3600, staleWhileRevalidate: 86400 })
  @ApiOperation({ summary: 'Get dependent models for selected make' })
  @ApiResponse({ status: 200, description: 'List of vehicle models for make' })
  async getModels(@Query() query: ModelsQueryDto): Promise<VehicleModelDto[]> {
    return this.fitmentService.getModels(query);
  }

  @Get('years')
  @Public()
  @CacheControl({ public: true, maxAge: 1800, sMaxAge: 3600, staleWhileRevalidate: 86400 })
  @ApiOperation({ summary: 'Get dependent years and generations for selected model' })
  @ApiResponse({ status: 200, description: 'Available years and generation ranges' })
  async getYears(
    @Query() query: YearsQueryDto,
  ): Promise<{ years: number[]; generations: { id: string; name: string; range: string }[] }> {
    return this.fitmentService.getYears(query);
  }

  @Get('variants')
  @Public()
  @CacheControl({ public: true, maxAge: 1800, sMaxAge: 3600, staleWhileRevalidate: 86400 })
  @ApiOperation({ summary: 'Get dependent variants / chassis codes for model & year' })
  @ApiResponse({ status: 200, description: 'List of vehicle chassis variants' })
  async getVariants(@Query() query: VariantsQueryDto): Promise<VehicleChassisDto[]> {
    return this.fitmentService.getVariants(query);
  }

  @Get('search')
  @Public()
  @ApiOperation({
    summary:
      'Search compatible products by vehicle make, model, year, and variant with fitment confidence rating',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of compatible products with fitment confidence',
  })
  async searchFitment(
    @Query() query: FitmentSearchDto,
  ): Promise<PaginatedResponse<FitmentSearchResultDto>> {
    return this.fitmentService.searchFitment(query);
  }

  @Get('check')
  @Public()
  @ApiOperation({ summary: 'Check specific product compatibility against vehicle' })
  @ApiResponse({ status: 200, description: 'Fitment check result with confidence' })
  async checkProductFitment(@Query() query: CheckProductFitmentDto) {
    return this.fitmentService.checkProductFitment(query);
  }

  @Get('lookup/plate')
  @Public()
  @ApiOperation({
    summary: 'Lookup vehicle specifications by registration plate via vehicle data integration (CarJam / NZTA MVR)',
  })
  @ApiResponse({ status: 200, description: 'Normalized vehicle data with mandatory fitment disclaimer' })
  async lookupByPlate(
    @Query('plate') plate: string,
    @Query('country') country?: 'NZ' | 'AU',
  ): Promise<VehicleLookupResultDto> {
    return this.vehicleLookupService.lookupVehicle({ plate, country });
  }

  @Get('lookup/vin')
  @Public()
  @ApiOperation({
    summary: 'Lookup vehicle specifications by 17-character VIN via vehicle data integration',
  })
  @ApiResponse({ status: 200, description: 'Normalized vehicle data with mandatory fitment disclaimer' })
  async lookupByVin(@Query('vin') vin: string): Promise<VehicleLookupResultDto> {
    return this.vehicleLookupService.lookupVehicle({ vin });
  }
}
