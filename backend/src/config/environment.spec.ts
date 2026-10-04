import { validateEnvironment } from './environment.js';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost/db',
  JWT_SECRET: 'x'.repeat(32),
};

describe('environment validation: Cloudinary', () => {
  it('starts without any CLOUDINARY_* variable (photos disabled)', () => {
    expect(() => validateEnvironment({ ...base })).not.toThrow();
    expect(() =>
      validateEnvironment({
        ...base,
        CLOUDINARY_CLOUD_NAME: '',
        CLOUDINARY_API_KEY: ' ',
      }),
    ).not.toThrow();
  });

  it('accepts all three', () => {
    expect(() =>
      validateEnvironment({
        ...base,
        CLOUDINARY_CLOUD_NAME: 'demo',
        CLOUDINARY_API_KEY: 'key',
        CLOUDINARY_API_SECRET: 'secret-value',
      }),
    ).not.toThrow();
  });

  it('fails a partial set, naming the missing variables but never the values', () => {
    let message = '';
    try {
      validateEnvironment({
        ...base,
        CLOUDINARY_CLOUD_NAME: 'demo',
        CLOUDINARY_API_SECRET: 'super-secret-value',
      });
    } catch (error) {
      message = String(error);
    }
    expect(message).toContain('CLOUDINARY_API_KEY');
    expect(message).not.toContain('super-secret-value');
    expect(message).not.toContain('demo');
  });
});
