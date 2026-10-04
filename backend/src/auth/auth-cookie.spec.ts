import { ConfigService } from '@nestjs/config';
import express from 'express';
import request from 'supertest';
import {
  AUTH_COOKIE_NAME,
  getAuthCookieClearOptions,
  getAuthCookieOptions,
} from './auth-cookie.js';

const config = (values: Record<string, unknown>) => new ConfigService(values);
const DEV = config({
  AUTH_COOKIE_SAME_SITE: 'lax',
  JWT_EXPIRES_IN: 3600,
  NODE_ENV: 'development',
});
const PROD_CROSS_SITE = config({
  AUTH_COOKIE_SAME_SITE: 'none',
  JWT_EXPIRES_IN: 3600,
  NODE_ENV: 'production',
});

/** The Set-Cookie header Express actually emits for these options. */
async function setCookieHeaders(cfg: ConfigService) {
  const app = express();
  app.get('/login', (_req, res) => {
    res.cookie(AUTH_COOKIE_NAME, 'token', getAuthCookieOptions(cfg)).end();
  });
  app.get('/logout', (_req, res) => {
    res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieClearOptions(cfg)).end();
  });
  const header = async (path: string) => {
    const value = (await request(app).get(path)).headers['set-cookie'];
    return (Array.isArray(value) ? value[0] : value) as string;
  };
  return { login: await header('/login'), logout: await header('/logout') };
}

describe('auth cookie options', () => {
  it('uses a host-only Lax, non-Secure, unpartitioned cookie for local development', async () => {
    expect(getAuthCookieOptions(DEV)).toEqual({
      httpOnly: true,
      maxAge: 3_600_000,
      path: '/',
      sameSite: 'lax',
      secure: false,
    });
    const { login } = await setCookieHeaders(DEV);
    expect(login).toMatch(/HttpOnly/);
    expect(login).toMatch(/SameSite=Lax/);
    expect(login).not.toMatch(/Secure|Partitioned|Domain=/);
  });

  it('production cross-site: HttpOnly; Secure; SameSite=None; Partitioned; Path=/; no Domain', async () => {
    const { login } = await setCookieHeaders(PROD_CROSS_SITE);
    expect(login).toMatch(new RegExp(`^${AUTH_COOKIE_NAME}=token;`));
    for (const attribute of [
      'Path=/',
      'HttpOnly',
      'Secure',
      'SameSite=None',
      'Partitioned',
      'Max-Age=3600',
    ])
      expect(login).toContain(attribute);
    expect(login).not.toContain('Domain=');
  });

  it('logout clears the production cookie with the same partition and attributes', async () => {
    const { logout } = await setCookieHeaders(PROD_CROSS_SITE);
    expect(logout).toMatch(new RegExp(`^${AUTH_COOKIE_NAME}=;`));
    expect(logout).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    for (const attribute of [
      'Path=/',
      'HttpOnly',
      'Secure',
      'SameSite=None',
      'Partitioned',
    ])
      expect(logout).toContain(attribute);
    expect(logout).not.toContain('Domain=');
  });

  it('SameSite=None always implies Secure and Partitioned, even outside production', () => {
    expect(
      getAuthCookieOptions(
        config({ AUTH_COOKIE_SAME_SITE: 'none', NODE_ENV: 'development' }),
      ),
    ).toMatchObject({ sameSite: 'none', secure: true, partitioned: true });
  });

  it('same-site production (custom domain, Lax) is Secure and not partitioned', () => {
    const options = getAuthCookieOptions(
      config({ AUTH_COOKIE_SAME_SITE: 'lax', NODE_ENV: 'production' }),
    );
    expect(options).toMatchObject({ sameSite: 'lax', secure: true });
    expect(options).not.toHaveProperty('partitioned');
  });
});
