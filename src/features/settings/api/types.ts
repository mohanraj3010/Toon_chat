import { z } from 'zod';

export type SettingsSectionId =
  | 'account'
  | 'privacy'
  | 'notifications'
  | 'appearance'
  | 'chat'
  | 'blocked'
  | 'security'
  | 'logout';

export type AccentColor = 'blue' | 'mint' | 'pink' | 'honey' | 'purple';
export type TextSize = 'small' | 'medium' | 'large';

export interface BlockedUserItem {
  id: string;
  username: string;
  displayName: string;
  characterBase: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  blockedAt: string;
}

export interface ActiveSessionItem {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface UserSettings {
  account: {
    email: string;
    phone: string;
    username: string;
    displayName: string;
    joinedDate: string;
    isVerified: boolean;
  };
  privacy: {
    whoCanMessage: 'everyone' | 'friends_of_friends' | 'friends';
    whoCanSeeStatus: 'everyone' | 'friends' | 'nobody';
    findByEmail: boolean;
    findByPhone: boolean;
    showReadingActivity: boolean;
  };
  notifications: {
    pushEnabled: boolean;
    soundEffects: boolean;
    directMessages: boolean;
    groupMentions: boolean;
    friendRequests: boolean;
    storyUpdates: boolean;
    reactionAlerts: boolean;
  };
  appearance: {
    accentColor: AccentColor;
    textSize: TextSize;
    reduceMotion: boolean;
    darkMode: boolean;
  };
  chat: {
    enterToSend: boolean;
    stickerSuggestions: boolean;
    readReceipts: boolean;
    autoDownloadMedia: boolean;
    typingIndicators: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    activeSessions: ActiveSessionItem[];
  };
  blockedUsers: BlockedUserItem[];
}

export const PasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ['confirmPassword'],
  });

export type PasswordChangeFormData = z.infer<typeof PasswordChangeSchema>;
