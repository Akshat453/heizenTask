import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request.type.js';
import { StaffService } from '../../staff/staff.service.js';
import { AUTH_COOKIE_NAME } from '../auth-cookie.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  const user: AuthenticatedUser = {
    id: 'staff-1',
    name: 'Demo Admin',
    email: 'admin@test.com',
    role: 'ADMIN',
    permissions: ['staff.manage'],
  };
  const reflector = { getAllAndOverride: vi.fn() };
  const jwtService = { verifyAsync: vi.fn() };
  const staffService = { findActiveAuthenticatedUserById: vi.fn() };
  const guard = new JwtAuthGuard(
    reflector as unknown as Reflector,
    jwtService as unknown as JwtService,
    staffService as unknown as StaffService,
  );

  beforeEach(() => {
    vi.resetAllMocks();
    reflector.getAllAndOverride.mockReturnValue(false);
  });

  function context(request: Partial<AuthenticatedRequest>): ExecutionContext {
    return {
      getHandler: () => context,
      getClass: () => JwtAuthGuard,
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('allows public routes without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard.canActivate(context({}))).resolves.toBe(true);
  });

  it('returns 401 when the cookie is missing', async () => {
    await expect(
      guard.canActivate(context({ cookies: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns 401 for an invalid JWT', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'));
    await expect(
      guard.canActivate(
        context({ cookies: { [AUTH_COOKIE_NAME]: 'invalid' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns 401 for an expired JWT', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    await expect(
      guard.canActivate(
        context({ cookies: { [AUTH_COOKIE_NAME]: 'expired' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('attaches the active authenticated user for a valid JWT', async () => {
    const request: Partial<AuthenticatedRequest> = {
      cookies: { [AUTH_COOKIE_NAME]: 'valid' },
    };
    jwtService.verifyAsync.mockResolvedValue({ sub: user.id });
    staffService.findActiveAuthenticatedUserById.mockResolvedValue(user);

    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(request.user).toEqual(user);
  });

  it('returns 401 when a token owner is inactive', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: user.id });
    staffService.findActiveAuthenticatedUserById.mockResolvedValue(null);

    await expect(
      guard.canActivate(context({ cookies: { [AUTH_COOKIE_NAME]: 'valid' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns 401 when a token owner no longer exists', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'deleted-staff' });
    staffService.findActiveAuthenticatedUserById.mockResolvedValue(null);

    await expect(
      guard.canActivate(context({ cookies: { [AUTH_COOKIE_NAME]: 'valid' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('does not disguise a database failure as invalid authentication', async () => {
    const databaseError = new Error('database unavailable');
    jwtService.verifyAsync.mockResolvedValue({ sub: user.id });
    staffService.findActiveAuthenticatedUserById.mockRejectedValue(
      databaseError,
    );

    await expect(
      guard.canActivate(context({ cookies: { [AUTH_COOKIE_NAME]: 'valid' } })),
    ).rejects.toBe(databaseError);
  });
});
