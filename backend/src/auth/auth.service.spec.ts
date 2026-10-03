import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { StaffService } from '../staff/staff.service.js';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  const user: AuthenticatedUser = {
    id: 'staff-1',
    name: 'Demo Admin',
    email: 'admin@test.com',
    role: 'ADMIN',
    permissions: ['catalogue.manage', 'orders.create'],
  };
  const staffService = {
    findLoginRecordByEmail: vi.fn(),
    findActiveAuthenticatedUserById: vi.fn(),
  };
  const jwtService = {
    signAsync: vi.fn(),
  };
  const service = new AuthService(
    staffService as unknown as StaffService,
    jwtService as unknown as JwtService,
  );

  beforeEach(() => {
    vi.resetAllMocks();
  });

  async function expectInvalidCredentials(
    promise: Promise<unknown>,
  ): Promise<void> {
    await expect(promise).rejects.toMatchObject({
      status: 401,
      message: 'Invalid email or password.',
    });
  }

  it('authenticates a valid active staff user', async () => {
    const passwordHash = await bcrypt.hash('Test@1234', 4);
    staffService.findLoginRecordByEmail.mockResolvedValue({
      id: user.id,
      passwordHash,
      isActive: true,
    });
    staffService.findActiveAuthenticatedUserById.mockResolvedValue(user);
    jwtService.signAsync.mockResolvedValue('signed-token');

    await expect(
      service.login({ email: user.email, password: 'Test@1234' }),
    ).resolves.toEqual({ accessToken: 'signed-token', user });
    expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: user.id });
  });

  it('rejects a wrong password with the generic message', async () => {
    staffService.findLoginRecordByEmail.mockResolvedValue({
      id: user.id,
      passwordHash: await bcrypt.hash('Test@1234', 4),
      isActive: true,
    });

    await expectInvalidCredentials(
      service.login({ email: user.email, password: 'wrong-password' }),
    );
  });

  it('rejects an unknown email with the same generic message', async () => {
    staffService.findLoginRecordByEmail.mockResolvedValue(null);

    await expectInvalidCredentials(
      service.login({ email: 'missing@test.com', password: 'Test@1234' }),
    );
  });

  it('rejects an inactive staff user', async () => {
    staffService.findLoginRecordByEmail.mockResolvedValue({
      id: user.id,
      passwordHash: await bcrypt.hash('Test@1234', 4),
      isActive: false,
    });

    await expectInvalidCredentials(
      service.login({ email: user.email, password: 'Test@1234' }),
    );
  });

  it('never exposes the password hash and returns role permissions', async () => {
    const passwordHash = await bcrypt.hash('Test@1234', 4);
    staffService.findLoginRecordByEmail.mockResolvedValue({
      id: user.id,
      passwordHash,
      isActive: true,
    });
    staffService.findActiveAuthenticatedUserById.mockResolvedValue(user);
    jwtService.signAsync.mockResolvedValue('signed-token');

    const result = await service.login({
      email: user.email,
      password: 'Test@1234',
    });

    expect(result.user).toEqual(user);
    expect(result.user.role).toBe('ADMIN');
    expect(result.user.permissions).toEqual([
      'catalogue.manage',
      'orders.create',
    ]);
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('rejects when the active identity disappears after password validation', async () => {
    staffService.findLoginRecordByEmail.mockResolvedValue({
      id: user.id,
      passwordHash: await bcrypt.hash('Test@1234', 4),
      isActive: true,
    });
    staffService.findActiveAuthenticatedUserById.mockResolvedValue(null);

    await expectInvalidCredentials(
      service.login({ email: user.email, password: 'Test@1234' }),
    );
  });
});
