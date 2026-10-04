import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../types/authenticated-request.type.js';
import type { AuthenticatedUser } from '../types/authenticated-user.type.js';

/**
 * Resolves the authenticated user (or one of its fields) from the request.
 * Exported separately so the factory can be unit tested.
 */
export function currentUserFactory(
  data: keyof AuthenticatedUser | undefined,
  context: ExecutionContext,
): AuthenticatedUser | AuthenticatedUser[keyof AuthenticatedUser] | undefined {
  const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
  return data ? user?.[data] : user;
}

/**
 * `@CurrentUser()` injects the authenticated user; `@CurrentUser('id')`
 * injects only that field. The key is constrained to AuthenticatedUser keys.
 */
export const CurrentUser = createParamDecorator<
  keyof AuthenticatedUser | undefined
>(currentUserFactory);
