import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../types/authenticated-request.type.js';
import type { AuthenticatedUser } from '../types/authenticated-user.type.js';
import { PermissionsGuard } from './permissions.guard.js';

describe('PermissionsGuard', () => {
  const reflector = { getAllAndOverride: vi.fn() };
  const guard = new PermissionsGuard(reflector as unknown as Reflector);
  const user: AuthenticatedUser = {
    id: 'staff-1',
    name: 'Kitchen User',
    email: 'kitchen@test.com',
    role: 'KITCHEN',
    permissions: ['kitchen.read', 'kitchen.update'],
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  function context(requestUser?: AuthenticatedUser): ExecutionContext {
    const request: Partial<AuthenticatedRequest> = { user: requestUser };
    return {
      getHandler: () => context,
      getClass: () => PermissionsGuard,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  it('passes an authenticated route with no permission metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(context(user))).toBe(true);
  });

  it('passes when the user has the required permission', () => {
    reflector.getAllAndOverride.mockReturnValue(['kitchen.read']);
    expect(guard.canActivate(context(user))).toBe(true);
  });

  it('returns 403 when the user lacks a required permission', () => {
    reflector.getAllAndOverride.mockReturnValue(['orders.override']);
    expect(() => guard.canActivate(context(user))).toThrow(ForbiddenException);
  });

  it('requires all declared permissions', () => {
    reflector.getAllAndOverride.mockReturnValue([
      'kitchen.read',
      'orders.override',
    ]);
    expect(() => guard.canActivate(context(user))).toThrow(ForbiddenException);
  });

  it('does not grant permissions based on an ADMIN role name', () => {
    reflector.getAllAndOverride.mockReturnValue(['staff.manage']);
    expect(() =>
      guard.canActivate(context({ ...user, role: 'ADMIN', permissions: [] })),
    ).toThrow(ForbiddenException);
  });

  it('returns 401 if permission evaluation has no authenticated user', () => {
    reflector.getAllAndOverride.mockReturnValue(['kitchen.read']);
    expect(() => guard.canActivate(context())).toThrow(UnauthorizedException);
  });
});
