import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  DB_SSL: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),
  DATA_FILE: z.string().default('./data/teaching-materials.json'),
  DEFAULT_SEARCH_LIMIT: z.coerce.number().int().positive().max(100).default(20)
});

export const env = EnvSchema.parse(process.env);
