import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  INSTAGRAM_APP_ID: z.string().min(1),
  INSTAGRAM_APP_SECRET: z.string().min(1),
  INSTAGRAM_ACCESS_TOKEN: z.string().min(1),
  INSTAGRAM_ACCOUNT_ID: z.string().min(1),
  WEBHOOK_VERIFY_TOKEN: z.string().min(1),
  ADMIN_API_KEY: z.string().min(1),
  PORT: z.coerce.number().default(3000),
  PUBLIC_BASE_URL: z.string().url(),
  TIMEZONE: z.string().default('America/Toronto'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
