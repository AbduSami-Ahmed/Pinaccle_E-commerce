import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoleWithPermissionsDto, StaffUserDto, UserDto } from '@pinnacle/contracts';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) { }

  async findAll(): Promise<UserDto[]> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        isActive: true,
        isStaff: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map(this.toUserDto);
  }

  async findById(id: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        isActive: true,
        isStaff: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return this.toUserDto(user);
  }

  async findByEmail(email: string): Promise<UserDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        isActive: true,
        isStaff: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return user ? this.toUserDto(user) : null;
  }

  async disableUser(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    await this.prisma.user.update({ where: { id }, data: { isActive: false } });
  }

  // ---------------------------------------------------------------------------
  // Staff & RBAC Administration
  // ---------------------------------------------------------------------------

  async listStaff(search?: string): Promise<StaffUserDto[]> {
    const where: any = { isStaff: true };
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { email: { contains: term, mode: 'insensitive' } },
        { staffProfile: { firstName: { contains: term, mode: 'insensitive' } } },
        { staffProfile: { lastName: { contains: term, mode: 'insensitive' } } },
        { staffProfile: { jobTitle: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        staffProfile: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.staffProfile?.firstName || 'Staff',
      lastName: u.staffProfile?.lastName || 'Member',
      department: u.staffProfile?.jobTitle || null,
      phone: null,
      isActive: u.isActive,
      isStaff: u.isStaff,
      roles: u.userRoles.map((ur) => ({
        id: ur.role.id,
        key: ur.role.key,
        name: ur.role.name,
      })),
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  async listRoles(): Promise<RoleWithPermissionsDto[]> {
    const roles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return roles.map((r) => ({
      id: r.id,
      key: r.key,
      name: r.name,
      description: r.description,
      permissions: r.permissions.map((rp) => ({
        id: rp.permission.id,
        code: rp.permission.code,
        description: rp.permission.description || '',
        domain: rp.permission.domain,
      })),
    }));
  }

  async assignUserRoles(userId: string, roleIds: string[], actorId: string): Promise<StaffUserDto> {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });

    if (!targetUser) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Safety: prevent removing SUPER_ADMIN from self if actor is modifying their own roles
    if (userId === actorId) {
      const hadSuperAdmin = targetUser.userRoles.some((ur) => ur.role.key === 'SUPER_ADMIN');
      if (hadSuperAdmin) {
        const superAdminRole = await this.prisma.role.findUnique({ where: { key: 'SUPER_ADMIN' } });
        if (superAdminRole && !roleIds.includes(superAdminRole.id)) {
          throw new BadRequestException('Cannot revoke Super Admin role from yourself to prevent lockout');
        }
      }
    }

    // Validate all role IDs exist
    const roles = await this.prisma.role.findMany({ where: { id: { in: roleIds } } });
    if (roles.length !== roleIds.length) {
      throw new BadRequestException('One or more selected role IDs are invalid');
    }

    const previousRoleKeys = targetUser.userRoles.map((ur) => ur.role.key);
    const newRoleKeys = roles.map((r) => r.key);

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId } });
      if (roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({ userId, roleId })),
        });
      }
    });

    await this.auditService.recordLog({
      actorId,
      domain: 'STAFF',
      action: 'ROLES_ASSIGNED',
      entityType: 'USER',
      entityId: userId,
      beforeState: { roles: previousRoleKeys },
      afterState: { roles: newRoleKeys },
    });

    const staffList = await this.listStaff();
    const updated = staffList.find((s) => s.id === userId);
    return updated!;
  }

  async toggleUserActive(userId: string, isActive: boolean, actorId: string): Promise<StaffUserDto> {
    if (userId === actorId && !isActive) {
      throw new BadRequestException('Cannot deactivate your own user account');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    await this.auditService.recordLog({
      actorId,
      domain: 'STAFF',
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'USER',
      entityId: userId,
      beforeState: { isActive: targetUser.isActive },
      afterState: { isActive },
    });

    const staffList = await this.listStaff();
    return staffList.find((s) => s.id === userId)!;
  }


  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private toUserDto(user: {
    id: string;
    email: string;
    isActive: boolean;
    isStaff: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
  }): UserDto {
    return {
      id: user.id,
      email: user.email,
      isActive: user.isActive,
      isStaff: user.isStaff,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
