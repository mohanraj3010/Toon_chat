import { z } from 'zod';

const envSchema = z.object({
  VITE_API_URL: z.string().url().default('http://localhost:8000/api/v1'),
  VITE_WS_URL: z.string().url().default('ws://localhost:8000'),
});

export const env = envSchema.parse({
  VITE_API_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  VITE_WS_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:8000',
});

