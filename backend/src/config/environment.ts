import { z } from 'zod';

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

export const CLOUDINARY_VARS = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
] as const;

const environmentSchema = z
  .object({
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: z.coerce.number().int().positive().default(28_800),
    FRONTEND_URL: z
      .string()
      .default('http://localhost:3000')
      .refine(
        (value) =>
          value
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean)
            .every((origin) => z.url().safeParse(origin).success),
        'FRONTEND_URL must be a comma-separated list of valid origins',
      ),
    AUTH_COOKIE_SAME_SITE: z.enum(['lax', 'none']).default('lax'),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().max(65_535).default(3001),
    // Optional delivery-proof photo storage (private Cloudinary assets).
    // All three or none; see the refinement below.
    CLOUDINARY_CLOUD_NAME: optionalText,
    CLOUDINARY_API_KEY: optionalText,
    CLOUDINARY_API_SECRET: optionalText,
  })
  .passthrough()
  .superRefine((env, ctx) => {
    const missing = CLOUDINARY_VARS.filter((name) => !env[name]);
    // None set: photos are disabled. All set: configured. Anything else is a mistake.
    if (missing.length > 0 && missing.length < CLOUDINARY_VARS.length)
      ctx.addIssue({
        code: 'custom',
        path: [missing[0]!],
        message: `Cloudinary is partially configured; also set ${missing.join(', ')} (or remove all CLOUDINARY_* variables to disable photos).`,
      });
  });

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  return environmentSchema.parse(environment);
}
