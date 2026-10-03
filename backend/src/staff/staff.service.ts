import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type.js';

export type StaffLoginRecord = {
  id: string;
  passwordHash: string;
  isActive: boolean;
};

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  findLoginRecordByEmail(email: string): Promise<StaffLoginRecord | null> {
    return this.prisma.staffUser.findUnique({
      where: { email },
      select: {
        id: true,
        passwordHash: true,
        isActive: true,
      },
    });
  }

  async findActiveAuthenticatedUserById(
    id: string,
  ): Promise<AuthenticatedUser | null> {
    const staffUser = await this.prisma.staffUser.findFirst({
      where: { id, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: {
          select: {
            name: true,
            permissions: {
              select: {
                permission: {
                  select: { key: true },
                },
              },
            },
          },
        },
      },
    });

    if (!staffUser) {
      return null;
    }

    return {
      id: staffUser.id,
      name: staffUser.name,
      email: staffUser.email,
      role: staffUser.role.name,
      permissions: staffUser.role.permissions
        .map(({ permission }) => permission.key)
        .sort(),
    };
  }
}
