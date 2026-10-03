import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.type.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions?.length) {
      return true;
    }

    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;

    if (!user) {
      throw new UnauthorizedException();
    }

    const grantedPermissions = new Set(user.permissions);
    if (
      !requiredPermissions.every((permission) =>
        grantedPermissions.has(permission),
      )
    ) {
      throw new ForbiddenException();
    }

    return true;
  }
}
