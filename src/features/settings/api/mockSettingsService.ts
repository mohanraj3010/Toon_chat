import type { SettingsService } from './settingsService';
import type { UserSettings } from './types';

const SETTINGS_STORAGE_KEY = 'toonchat_user_settings';

export const DEFAULT_SETTINGS: UserSettings = {
  account: {
    email: 'citizen@maplepark.com',
    phone: '+1 (555) 019-2834',
    username: 'luna_toon',
    displayName: 'Luna Toon',
    joinedDate: 'Recent',
    isVerified: true,
  },
  privacy: {
    whoCanMessage: 'everyone',
    whoCanSeeStatus: 'everyone',
    findByEmail: true,
    findByPhone: false,
    showReadingActivity: true,
  },
  notifications: {
    pushEnabled: true,
    soundEffects: true,
    directMessages: true,
    groupMentions: true,
    friendRequests: true,
    storyUpdates: true,
    reactionAlerts: true,
  },
  appearance: {
    accentColor: 'blue',
    textSize: 'medium',
    reduceMotion: false,
    darkMode: false,
  },
  chat: {
    enterToSend: true,
    stickerSuggestions: true,
    readReceipts: true,
    autoDownloadMedia: true,
    typingIndicators: true,
  },
  security: {
    twoFactorEnabled: false,
    activeSessions: [
      {
        id: 's1',
        device: 'Windows 11 PC (Chrome)',
        browser: 'Chrome 124.0',
        location: 'Seattle, WA',
        lastActive: 'Active Now',
        isCurrent: true,
      },
      {
        id: 's2',
        device: 'iPhone 15 Pro (ToonChat iOS)',
        browser: 'ToonChat App v1.4',
        location: 'Seattle, WA',
        lastActive: '2 hours ago',
        isCurrent: false,
      },
      {
        id: 's3',
        device: 'MacBook Air (Safari)',
        browser: 'Safari 17.4',
        location: 'San Francisco, CA',
        lastActive: '3 days ago',
        isCurrent: false,
      },
    ],
  },
  blockedUsers: [
    {
      id: 'b1',
      username: 'spambot_3000',
      displayName: 'Robo Bot',
      characterBase: 8,
      blockedAt: 'April 2, 2024',
    },
    {
      id: 'b2',
      username: 'grumpy_greg',
      displayName: 'Grumpy Greg',
      characterBase: 6,
      blockedAt: 'March 15, 2024',
    },
  ],
};

class MockSettingsServiceImpl implements SettingsService {
  private async delay(ms = 250) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private loadSettings(): UserSettings {
    let result: UserSettings = DEFAULT_SETTINGS;
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        result = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          account: { ...DEFAULT_SETTINGS.account, ...parsed.account },
          privacy: { ...DEFAULT_SETTINGS.privacy, ...parsed.privacy },
          notifications: { ...DEFAULT_SETTINGS.notifications, ...parsed.notifications },
          appearance: { ...DEFAULT_SETTINGS.appearance, ...parsed.appearance },
          chat: { ...DEFAULT_SETTINGS.chat, ...parsed.chat },
          security: { ...DEFAULT_SETTINGS.security, ...parsed.security },
          blockedUsers: parsed.blockedUsers ?? DEFAULT_SETTINGS.blockedUsers,
        };
      }
    } catch {
      // ignore
    }

    try {
      const rawSession = localStorage.getItem('toonchat_supabase_auth_session_v1');
      if (rawSession) {
        const parsedSession = JSON.parse(rawSession);
        const u = parsedSession?.user;
        if (u) {
          const meta = u.user_metadata || {};
          result = {
            ...result,
            account: {
              ...result.account,
              username: (meta.username as string) || u.email?.split('@')[0] || result.account.username,
              displayName: (meta.displayName as string) || (meta.username as string) || result.account.displayName,
              email: u.email || result.account.email,
            },
          };
        }
      }
    } catch {
      // ignore
    }

    return result;
  }

  private saveSettings(settings: UserSettings): void {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }

  async getSettings(): Promise<UserSettings> {
    await this.delay();
    return this.loadSettings();
  }

  async updateSettings(data: Partial<UserSettings>): Promise<UserSettings> {
    await this.delay();
    const current = this.loadSettings();
    const updated: UserSettings = {
      ...current,
      ...data,
    };
    this.saveSettings(updated);
    return updated;
  }

  async updateSection<K extends keyof UserSettings>(
    section: K,
    data: Partial<UserSettings[K]>
  ): Promise<UserSettings> {
    await this.delay();
    const current = this.loadSettings();
    const currentVal = current[section];
    const updatedVal = Array.isArray(currentVal)
      ? (data as unknown as UserSettings[K])
      : {
          ...(currentVal as Record<string, unknown>),
          ...(data as Record<string, unknown>),
        };
    const updated: UserSettings = {
      ...current,
      [section]: updatedVal,
    };
    this.saveSettings(updated);
    return updated;
  }


  async unblockUser(userId: string): Promise<UserSettings> {
    await this.delay();
    const current = this.loadSettings();
    const updated: UserSettings = {
      ...current,
      blockedUsers: current.blockedUsers.filter((u) => u.id !== userId),
    };
    this.saveSettings(updated);
    return updated;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    await this.delay();
    if (!currentPassword) {
      throw new Error('Current password is required');
    }
    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters');
    }
    return { success: true, message: 'Password updated successfully! 🔒' };
  }

  async terminateOtherSessions(): Promise<UserSettings> {
    await this.delay();
    const current = this.loadSettings();
    const updated: UserSettings = {
      ...current,
      security: {
        ...current.security,
        activeSessions: current.security.activeSessions.filter((s) => s.isCurrent),
      },
    };
    this.saveSettings(updated);
    return updated;
  }

  async resetSettings(): Promise<UserSettings> {
    await this.delay();
    this.saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
}

export const mockSettingsService = new MockSettingsServiceImpl();
