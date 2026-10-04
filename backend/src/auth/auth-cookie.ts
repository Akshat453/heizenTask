import type { CookieOptions } from 'express';
import type { ConfigService } from '@nestjs/config';

export const AUTH_COOKIE_NAME = 'heizen_access_token';

/**
 * Host-only (no Domain) HttpOnly session cookie.
 *
 * - Same-site deployments (local dev, or app./api. on one domain) use
 *   SameSite=Lax; Secure only in production so http://localhost keeps working.
 * - Cross-site deployments (e.g. *.vercel.app → *.onrender.com) set
 *   AUTH_COOKIE_SAME_SITE=none, which also forces Secure and adds Partitioned
 *   (CHIPS): browsers that block unpartitioned third-party cookies still keep
 *   it, scoped to the frontend's top-level site.
 */
export function getAuthCookieOptions(config: ConfigService): CookieOptions {
  const sameSite = config.get<'lax' | 'none'>('AUTH_COOKIE_SAME_SITE', 'lax');
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  const crossSite = sameSite === 'none';

  return {
    httpOnly: true,
    maxAge: config.get<number>('JWT_EXPIRES_IN', 28_800) * 1000,
    path: '/',
    sameSite,
    secure: isProduction || crossSite,
    ...(crossSite ? { partitioned: true } : {}),
  };
}

/** Same attributes as the session cookie (a partitioned cookie can only be cleared as partitioned). */
export function getAuthCookieClearOptions(
  config: ConfigService,
): CookieOptions {
  const { maxAge: _maxAge, ...options } = getAuthCookieOptions(config);
  return options;
}
