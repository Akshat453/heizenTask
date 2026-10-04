import type { ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../types/authenticated-user.type.js';
import { currentUserFactory } from './current-user.decorator.js';

const user: AuthenticatedUser = {
  id: '6f1f9b5e-0000-4000-8000-000000000001',
  name: 'Demo Driver',
  email: 'driver@test.com',
  role: 'DRIVER',
  permissions: ['driver.own_drops.read'],
};

const contextFor = (requestUser: AuthenticatedUser | undefined) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user: requestUser }) }),
  }) as unknown as ExecutionContext;

describe('CurrentUser decorator factory', () => {
  it("returns only the id string for @CurrentUser('id')", () => {
    expect(currentUserFactory('id', contextFor(user))).toBe(user.id);
  });

  it('returns the whole user without an argument', () => {
    expect(currentUserFactory(undefined, contextFor(user))).toBe(user);
  });

  it('returns undefined when no user is on the request', () => {
    expect(currentUserFactory('id', contextFor(undefined))).toBeUndefined();
  });
});
