import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import {
  pageArgs,
  paginate,
  type PaginatedResponse,
} from '../common/dto/pagination-query.dto.js';
import {
  DRIVER_DELIVER_PERMISSION,
  STAFF_MANAGE_PERMISSION,
} from '../common/permission-keys.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateStaffDto,
  StaffQueryDto,
  UpdateStaffDto,
} from './dto/staff.dto.js';

export const BCRYPT_COST = 12;

/** Public staff shape: never includes passwordHash. */
const staffSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { id: true, name: true } },
} satisfies Prisma.StaffUserSelect;

export type StaffMember = Prisma.StaffUserGetPayload<{
  select: typeof staffSelect;
}>;

export type RoleSummary = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
};

@Injectable()
export class StaffManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: StaffQueryDto): Promise<PaginatedResponse<StaffMember>> {
    const search = query.search?.trim();
    const where: Prisma.StaffUserWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    const [totalItems, data] = await Promise.all([
      this.prisma.staffUser.count({ where }),
      this.prisma.staffUser.findMany({
        where,
        select: staffSelect,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        ...pageArgs(query),
      }),
    ]);
    return paginate(data, totalItems, query.page, query.pageSize);
  }

  /** Active staff who can deliver: selected by permission, never by role name. */
  listDrivers(): Promise<{ id: string; name: string; email: string }[]> {
    return this.prisma.staffUser.findMany({
      where: {
        isActive: true,
        role: {
          permissions: {
            some: { permission: { key: DRIVER_DELIVER_PERMISSION } },
          },
        },
      },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async listRoles(): Promise<RoleSummary[]> {
    const roles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        permissions: { select: { permission: { select: { key: true } } } },
      },
    });
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions.map((p) => p.permission.key).sort(),
    }));
  }

  async create(dto: CreateStaffDto): Promise<StaffMember> {
    await this.assertRoleExists(dto.roleId);
    const existing = await this.prisma.staffUser.findFirst({
      where: { email: { equals: dto.email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing)
      throw new ConflictException(
        'A staff account with this email already exists.',
      );
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    try {
      return await this.prisma.staffUser.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
          roleId: dto.roleId,
        },
        select: staffSelect,
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'A staff account with this email already exists.',
        );
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateStaffDto,
    actorId: string,
  ): Promise<StaffMember> {
    const target = await this.prisma.staffUser.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('Staff member not found.');

    if (id === actorId) {
      if (dto.isActive === false)
        throw new ConflictException('You cannot deactivate your own account.');
      if (dto.roleId && !(await this.roleHasStaffManage(dto.roleId)))
        throw new ConflictException(
          'You cannot move yourself to a role without staff management; ask another admin.',
        );
    }
    if (dto.roleId) await this.assertRoleExists(dto.roleId);

    return this.prisma.staffUser.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.roleId !== undefined && { roleId: dto.roleId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: staffSelect,
    });
  }

  private async assertRoleExists(roleId: string): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true },
    });
    if (!role)
      throw new BadRequestException('roleId does not match an existing role.');
  }

  private async roleHasStaffManage(roleId: string): Promise<boolean> {
    const count = await this.prisma.rolePermission.count({
      where: { roleId, permission: { key: STAFF_MANAGE_PERMISSION } },
    });
    return count > 0;
  }
}
