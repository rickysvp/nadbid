import { z } from 'zod';

/**
 * Runtime environment variable validation.
 * Keep the schema strict: fail fast at boot if a required variable is missing
 * instead of crashing later in a user-facing feature.
 */
const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default('https://api.nadbid.fun'),
  VITE_WS_URL: z.string().url().default('wss://ws.nadbid.fun'),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  /** 单一真源：vite.config.ts 从 package.json 注入。 */
  VITE_APP_VERSION: z.string().default('0.1.0'),
  // Coerce empty/missing string -> 'true' string first, then cast to boolean.
  VITE_ENABLE_MOCKS: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  MODE: z.string().default('development'),
  DEV: z.boolean().default(false),
  PROD: z.boolean().default(false),
});

export type AppEnv = z.infer<typeof envSchema>;

export const env: AppEnv = envSchema.parse(import.meta.env);
