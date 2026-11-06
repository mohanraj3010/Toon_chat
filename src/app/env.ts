import { z } from 'zod';

export const DEFAULT_API_BASE_URL = 'https://toonchat-backend.onrender.com/api/v1';
export const DEFAULT_WS_BASE_URL = 'wss://toonchat-backend.onrender.com';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default(DEFAULT_API_BASE_URL),
  VITE_API_URL: z.string().url().default(DEFAULT_API_BASE_URL),
  VITE_WS_BASE_URL: z.string().url().default(DEFAULT_WS_BASE_URL),
  VITE_WS_URL: z.string().url().default(DEFAULT_WS_BASE_URL),
});

const resolvedApiUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
  DEFAULT_API_BASE_URL;

const resolvedWsUrl =
  (import.meta.env.VITE_WS_BASE_URL as string | undefined)?.trim() ||
  (import.meta.env.VITE_WS_URL as string | undefined)?.trim() ||
  DEFAULT_WS_BASE_URL;

export const env = envSchema.parse({
  VITE_API_BASE_URL: resolvedApiUrl,
  VITE_API_URL: resolvedApiUrl,
  VITE_WS_BASE_URL: resolvedWsUrl,
  VITE_WS_URL: resolvedWsUrl,
});

export const API_BASE_URL = resolvedApiUrl.replace(/\/+$/, '');
export const WS_BASE_URL = resolvedWsUrl.replace(/\/+$/, '');
