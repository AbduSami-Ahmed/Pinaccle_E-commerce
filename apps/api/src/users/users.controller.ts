import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { UserDto } from '@pinnacle/contracts';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('staff:users:view')
  @ApiOperation({ summary: 'List all users (staff only)' })
  @ApiOkResponse({ description: 'List of users' })
  async findAll(): Promise<{ users: UserDto[] }> {
    const users = await this.usersService.findAll();
    return { users };
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('staff:users:view')
  @ApiOperation({ summary: 'Get a single user by ID (staff only)' })
  @ApiOkResponse({ description: 'User detail' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<{ user: UserDto }> {
    const user = await this.usersService.findById(id);
    return { user };
  }
}
