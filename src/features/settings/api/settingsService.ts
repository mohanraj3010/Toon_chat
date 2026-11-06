import type { UserSettings } from './types';

export interface SettingsService {
  getSettings(): Promise<UserSettings>;
  updateSettings(data: Partial<UserSettings>): Promise<UserSettings>;
  updateSection<K extends keyof UserSettings>(
    section: K,
    data: Partial<UserSettings[K]>
  ): Promise<UserSettings>;
  unblockUser(userId: string): Promise<UserSettings>;
  changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }>;
  terminateOtherSessions(): Promise<UserSettings>;
  resetSettings(): Promise<UserSettings>;
}
