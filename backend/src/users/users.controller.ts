import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateStaffDto } from './dto/create-staff.dto';
import {
  AuthenticatedUser,
  RoleWithPermissionsDto,
  StaffUserDto,
  ToggleStaffActiveDto,
  UpdateStaffRolesDto,
  UserDto,
} from '@pinnacle/contracts';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('staff')
  @RequirePermissions('staff:users:view')
  @ApiOperation({ summary: 'List all staff members and their assigned roles' })
  async listStaff(@Query('search') search?: string): Promise<{ staff: StaffUserDto[] }> {
    const staff = await this.usersService.listStaff(search);
    return { staff };
  }

  @Post('staff')
  @RequirePermissions('staff:users:manage')
  @ApiOperation({ summary: 'Create a new staff user and assign initial platform roles' })
  async createStaff(
    @Body() dto: CreateStaffDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ user: StaffUserDto }> {
    const created = await this.usersService.createStaff(dto, user.sub);
    return { user: created };
  }

  @Get('roles')
  @RequirePermissions('staff:users:view')
  @ApiOperation({ summary: 'List all defined platform roles and their permissions' })
  async listRoles(): Promise<{ roles: RoleWithPermissionsDto[] }> {
    const roles = await this.usersService.listRoles();
    return { roles };
  }

  @Put(':id/roles')
  @RequirePermissions('staff:roles:assign')
  @ApiOperation({ summary: 'Assign roles to a staff user' })
  async assignUserRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffRolesDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ user: StaffUserDto }> {
    const updated = await this.usersService.assignUserRoles(id, dto.roleIds, user.sub);
    return { user: updated };
  }

  @Patch(':id/active')
  @RequirePermissions('staff:users:manage')
  @ApiOperation({ summary: 'Activate or deactivate a staff user account' })
  async toggleUserActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleStaffActiveDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ user: StaffUserDto }> {
    const updated = await this.usersService.toggleUserActive(id, dto.isActive, user.sub);
    return { user: updated };
  }

  @Get()
  @RequirePermissions('staff:users:view')
  @ApiOperation({ summary: 'List all users (staff only)' })
  @ApiOkResponse({ description: 'List of users' })
  async findAll(): Promise<{ users: UserDto[] }> {
    const users = await this.usersService.findAll();
    return { users };
  }

  @Get(':id')
  @RequirePermissions('staff:users:view')
  @ApiOperation({ summary: 'Get a single user by ID (staff only)' })
  @ApiOkResponse({ description: 'User detail' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<{ user: UserDto }> {
    const user = await this.usersService.findById(id);
    return { user };
  }
}

