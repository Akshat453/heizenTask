import { z } from 'zod';

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
    // Optional: photo proof storage. Credentials use the AWS default provider chain.
    AWS_REGION: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? value : undefined)),
    AWS_S3_BUCKET: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? value : undefined)),
  })
  .passthrough();

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  return environmentSchema.parse(environment);
}
