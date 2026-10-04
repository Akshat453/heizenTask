import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import type { PrismaService } from '../prisma/prisma.service.js';
import { CreateStaffDto } from './dto/staff.dto.js';
import { StaffManagementService } from './staff-management.service.js';

const ADMIN = 'a0000000-0000-4000-8000-000000000001';
const OTHER = 'a0000000-0000-4000-8000-000000000002';
const ROLE = 'b0000000-0000-4000-8000-000000000001';

function setup() {
  const prisma = {
    staffUser: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue({ id: OTHER }),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ id: OTHER, name: data.name, email: data.email }),
        ),
      update: vi.fn().mockResolvedValue({ id: OTHER }),
    },
    role: { findUnique: vi.fn().mockResolvedValue({ id: ROLE }) },
    rolePermission: { count: vi.fn().mockResolvedValue(1) },
  };
  const service = new StaffManagementService(
    prisma as unknown as PrismaService,
  );
  return { prisma, service };
}

const createDto = {
  name: 'New Cook',
  email: 'cook@fernleaf.test',
  roleId: ROLE,
  password: 'Kitchen@2026',
};

describe('StaffManagementService', () => {
  it('hashes the password and selects no passwordHash', async () => {
    const { prisma, service } = setup();
    await service.create(createDto);
    const call = prisma.staffUser.create.mock.calls[0]![0];
    expect(call.data.passwordHash).not.toBe(createDto.password);
    expect(
      await bcrypt.compare(createDto.password, call.data.passwordHash),
    ).toBe(true);
    expect(call.select).not.toHaveProperty('passwordHash');
  });

  it('rejects an email that exists in any letter case with 409', async () => {
    const { prisma, service } = setup();
    prisma.staffUser.findFirst.mockResolvedValue({ id: ADMIN });
    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.staffUser.findFirst.mock.calls[0]![0].where.email).toEqual({
      equals: createDto.email,
      mode: 'insensitive',
    });
  });

  it('rejects an unknown role with 400', async () => {
    const { prisma, service } = setup();
    prisma.role.findUnique.mockResolvedValue(null);
    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('enforces the password policy and normalizes the email in the DTO', async () => {
    const weak = plainToInstance(CreateStaffDto, {
      ...createDto,
      password: 'password',
    });
    expect((await validate(weak)).map((e) => e.property)).toEqual(['password']);
    const upper = plainToInstance(CreateStaffDto, {
      ...createDto,
      email: '  Cook@Fernleaf.TEST ',
    });
    expect(upper.email).toBe('cook@fernleaf.test');
    expect(await validate(upper)).toHaveLength(0);
  });

  it('stops an admin deactivating themselves (409)', async () => {
    const { service } = setup();
    await expect(
      service.update(ADMIN, { isActive: false }, ADMIN),
    ).rejects.toThrow('You cannot deactivate your own account.');
  });

  it('stops an admin moving themselves to a role without staff.manage (409)', async () => {
    const { prisma, service } = setup();
    prisma.rolePermission.count.mockResolvedValue(0);
    await expect(
      service.update(ADMIN, { roleId: ROLE }, ADMIN),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lets an admin deactivate someone else', async () => {
    const { prisma, service } = setup();
    await service.update(OTHER, { isActive: false }, ADMIN);
    expect(prisma.staffUser.update.mock.calls[0]![0].data).toEqual({
      isActive: false,
    });
  });

  it('returns 404 for an unknown staff member', async () => {
    const { prisma, service } = setup();
    prisma.staffUser.findUnique.mockResolvedValue(null);
    await expect(
      service.update(OTHER, { name: 'X' }, ADMIN),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('selects drivers by permission and active flag, never by role name', async () => {
    const { prisma, service } = setup();
    await service.listDrivers();
    const args = prisma.staffUser.findMany.mock.calls[0]![0];
    expect(args.where).toEqual({
      isActive: true,
      role: {
        permissions: {
          some: { permission: { key: 'driver.own_drops.deliver' } },
        },
      },
    });
    expect(args.select).toEqual({ id: true, name: true, email: true });
  });
});
