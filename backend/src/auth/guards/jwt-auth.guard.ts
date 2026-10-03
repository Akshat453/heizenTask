import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { StaffService } from '../../staff/staff.service.js';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request.type.js';
import { AUTH_COOKIE_NAME } from '../auth-cookie.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

type AccessTokenPayload = {
  sub: string;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly staffService: StaffService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.[AUTH_COOKIE_NAME] as unknown;

    if (typeof token !== 'string' || !token) {
      throw new UnauthorizedException();
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }

    if (typeof payload.sub !== 'string' || !payload.sub) {
      throw new UnauthorizedException();
    }

    const user = await this.staffService.findActiveAuthenticatedUserById(
      payload.sub,
    );
    if (!user) {
      throw new UnauthorizedException();
    }

    request.user = user;
    return true;
  }
}
