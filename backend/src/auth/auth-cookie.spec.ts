import { ConfigService } from '@nestjs/config';
import { getAuthCookieOptions } from './auth-cookie.js';

describe('auth cookie options', () => {
  function config(values: Record<string, unknown>): ConfigService {
    return new ConfigService(values);
  }

  it('uses a host-only Lax cookie for same-site development', () => {
    const options = getAuthCookieOptions(
      config({
        AUTH_COOKIE_SAME_SITE: 'lax',
        JWT_EXPIRES_IN: 3600,
        NODE_ENV: 'development',
      }),
    );

    expect(options).toMatchObject({
      httpOnly: true,
      maxAge: 3_600_000,
      path: '/',
      sameSite: 'lax',
      secure: false,
    });
    expect(options).not.toHaveProperty('domain');
  });

  it('forces Secure when SameSite=None is configured', () => {
    expect(
      getAuthCookieOptions(
        config({
          AUTH_COOKIE_SAME_SITE: 'none',
          JWT_EXPIRES_IN: 3600,
          NODE_ENV: 'development',
        }),
      ),
    ).toMatchObject({ sameSite: 'none', secure: true });
  });

  it('uses Secure cookies in production', () => {
    expect(
      getAuthCookieOptions(
        config({
          AUTH_COOKIE_SAME_SITE: 'lax',
          JWT_EXPIRES_IN: 3600,
          NODE_ENV: 'production',
        }),
      ),
    ).toMatchObject({ sameSite: 'lax', secure: true });
  });
});
