import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomerOwnershipGuard } from '../auth/guards/customer-ownership.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  AdminCustomerDetailDto,
  AdminCustomerListItemDto,
  AuthenticatedUser,
  CustomerAddressDto,
  CustomerProfileDto,
} from '@pinnacle/contracts';
import {
  CreateAddressBodyDto,
  UpdateAddressBodyDto,
  UpdateProfileBodyDto,
} from './dto/customer-requests.dto';

@ApiTags('Customers')
@ApiBearerAuth()
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // ---------------------------------------------------------------------------
  // Staff Customer Directory & Detailed Lookup
  // ---------------------------------------------------------------------------

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('customers:view:directory')
  @ApiOperation({ summary: 'Search and browse customer directory (staff only)' })
  async searchCustomers(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<{ customers: AdminCustomerListItemDto[]; total: number; page: number; totalPages: number }> {
    return this.customersService.searchCustomers({ search, page, limit }, user!);
  }

  @Get(':id/detail')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('customers:view:directory')
  @ApiOperation({ summary: 'Get full customer record including addresses and order history (staff only)' })
  async getCustomerDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ customer: AdminCustomerDetailDto }> {
    const customer = await this.customersService.getCustomerDetail(id, user);
    return { customer };
  }

  // ---------------------------------------------------------------------------
  // Profile (Self-Service)
  // ---------------------------------------------------------------------------

  @Get('me/profile')
  @ApiOperation({ summary: 'Get current customer profile' })
  @ApiOkResponse({ description: 'Customer profile detail' })
  async getMyProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ profile: CustomerProfileDto }> {
    const profile = await this.customersService.getProfileByUserId(user.sub);
    return { profile };
  }

  @Patch('me/profile')
  @ApiOperation({ summary: 'Update current customer permitted profile fields' })
  @ApiOkResponse({ description: 'Updated customer profile' })
  async updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileBodyDto,
  ): Promise<{ profile: CustomerProfileDto }> {
    const profile = await this.customersService.updateProfileByUserId(user.sub, dto);
    return { profile };
  }

  // ---------------------------------------------------------------------------
  // Addresses (Self-Service)
  // ---------------------------------------------------------------------------

  @Get('me/addresses')
  @ApiOperation({ summary: 'List customer delivery addresses' })
  @ApiOkResponse({ description: 'List of customer addresses' })
  async getMyAddresses(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ addresses: CustomerAddressDto[] }> {
    const customerId = this.requireCustomerId(user);
    const addresses = await this.customersService.getAddresses(customerId);
    return { addresses };
  }

  @Post('me/addresses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new delivery address' })
  @ApiCreatedResponse({ description: 'Created address' })
  async createMyAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAddressBodyDto,
  ): Promise<{ address: CustomerAddressDto }> {
    const customerId = this.requireCustomerId(user);
    const address = await this.customersService.createAddress(customerId, dto);
    return { address };
  }

  @Patch('me/addresses/:addressId')
  @ApiOperation({ summary: 'Update a delivery address' })
  @ApiOkResponse({ description: 'Updated address' })
  async updateMyAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @Body() dto: UpdateAddressBodyDto,
  ): Promise<{ address: CustomerAddressDto }> {
    const customerId = this.requireCustomerId(user);
    const address = await this.customersService.updateAddress(customerId, addressId, dto);
    return { address };
  }

  @Delete('me/addresses/:addressId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a delivery address' })
  async deleteMyAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('addressId', ParseUUIDPipe) addressId: string,
  ): Promise<void> {
    const customerId = this.requireCustomerId(user);
    await this.customersService.deleteAddress(customerId, addressId);
  }

  // ---------------------------------------------------------------------------
  // Guarded route by resource parameter :customerId (staff directory / direct access)
  // ---------------------------------------------------------------------------

  @Get(':customerId/addresses')
  @UseGuards(CustomerOwnershipGuard)
  @ApiOperation({ summary: 'Get addresses for specific customer (ownership enforced)' })
  async getCustomerAddresses(
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ): Promise<{ addresses: CustomerAddressDto[] }> {
    const addresses = await this.customersService.getAddresses(customerId);
    return { addresses };
  }

  // ---------------------------------------------------------------------------
  // Helper
  // ---------------------------------------------------------------------------

  private requireCustomerId(user: AuthenticatedUser): string {
    if (!user.customerId) {
      throw new ForbiddenException('A customer profile is required to manage addresses');
    }
    return user.customerId;
  }
}
