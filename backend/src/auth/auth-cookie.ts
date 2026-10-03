import type { CookieOptions } from 'express';
import type { ConfigService } from '@nestjs/config';

export const AUTH_COOKIE_NAME = 'heizen_access_token';

export function getAuthCookieOptions(config: ConfigService): CookieOptions {
  const sameSite = config.get<'lax' | 'none'>('AUTH_COOKIE_SAME_SITE', 'lax');
  const isProduction = config.get<string>('NODE_ENV') === 'production';

  return {
    httpOnly: true,
    maxAge: config.get<number>('JWT_EXPIRES_IN', 28_800) * 1000,
    path: '/',
    sameSite,
    secure: isProduction || sameSite === 'none',
  };
}

export function getAuthCookieClearOptions(
  config: ConfigService,
): CookieOptions {
  const { maxAge: _maxAge, ...options } = getAuthCookieOptions(config);
  return options;
}
