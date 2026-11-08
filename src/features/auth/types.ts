import { z } from 'zod';

export const RESERVED_USERNAMES = [
  'admin',
  'administrator',
  'root',
  'system',
  'toonchat',
  'maplepark',
  'moderator',
  'mod',
  'support',
  'help',
  'api',
  'bot',
  'auth',
];

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters! 📝')
    .max(30, 'Username cannot exceed 30 characters!')
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores allowed! ⭐')
    .refine(
      (val) => !RESERVED_USERNAMES.includes(val.toLowerCase()),
      'That username is reserved for Maple Park system accounts! 🏰'
    ),
  displayName: z
    .string()
    .min(1, 'Please enter a cartoon display name! ✨')
    .max(50, 'Display name cannot exceed 50 characters!'),
  email: z
    .string()
    .min(1, 'Please enter your email! ✉️')
    .email('Please enter a valid email address! 📬'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters! 🔒')
    .regex(/[0-9!@#$%^&*(),.?":{}|<>]/, 'Include at least one number or symbol! 💡'),
  characterBase: z.number().int().min(1).max(8).default(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Please enter your email! ✉️')
    .email('Please enter a valid email address! 📬'),
  password: z.string().min(1, 'Please enter your password! 🔒'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required!'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters! 🔒')
      .regex(/[0-9!@#$%^&*(),.?":{}|<>]/, 'Include at least one number or symbol! 💡'),
    confirmPassword: z.string().min(1, 'Please confirm your new password!'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match! 🙈",
    path: ['confirmPassword'],
  });

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  characterBase: number;
  status: string;
  vibeText?: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
}

export interface AuthSession {
  accessToken: string;
  access_token?: string;
  refreshToken?: string;
  refresh_token?: string;
  expiresAt: number;
  expires_at?: number;
  user: AuthUser;
}

export interface PasswordStrengthResult {
  score: number; // 0 to 4
  label: string;
  color: string;
  hint: string;
}

export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return {
      score: 0,
      label: 'Too sleepy 😴',
      color: 'var(--color-text-muted, #94a3b8)',
      hint: 'Type at least 8 characters to wake up your password fort!',
    };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[0-9]/.test(password) && /[a-zA-Z]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  switch (score) {
    case 1:
      return {
        score: 1,
        label: 'Noodle soft 🍜',
        color: '#f87171',
        hint: 'Add numbers or make it a bit longer to strengthen it!',
      };
    case 2:
      return {
        score: 2,
        label: 'Getting chunky 🧀',
        color: '#fbbf24',
        hint: 'Nice! Add a special symbol like ! or # to toughen up.',
      };
    case 3:
      return {
        score: 3,
        label: 'Cartoon tough 💪',
        color: '#34d399',
        hint: 'Great password! A couple more characters makes it unbreakable.',
      };
    case 4:
    default:
      return {
        score: 4,
        label: 'Toon Fort 🏰✨',
        color: '#0ea5e9',
        hint: 'Maximum toon protection! Nothing gets past this gate.',
      };
  }
}
