import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mockSettingsService } from './mockSettingsService';
import type { UserSettings, AccentColor, TextSize } from './types';
import { useEffect } from 'react';

export const settingsKeys = {
  all: ['settings'] as const,
  current: () => [...settingsKeys.all, 'current'] as const,
};

export const useSettings = () => {
  return useQuery({
    queryKey: settingsKeys.current(),
    queryFn: () => mockSettingsService.getSettings(),
  });
};

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<UserSettings>) => mockSettingsService.updateSettings(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(settingsKeys.current(), updated);
    },
  });
};

export type UpdateSectionVariables = {
  [K in keyof UserSettings]: {
    section: K;
    data: Partial<UserSettings[K]>;
  };
}[keyof UserSettings];

export const useUpdateSection = () => {
  const queryClient = useQueryClient();

  return useMutation<UserSettings, Error, UpdateSectionVariables>({
    mutationFn: ({ section, data }) => mockSettingsService.updateSection(section, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(settingsKeys.current(), updated);
    },
  });
};


export const useUnblockUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => mockSettingsService.unblockUser(userId),
    onSuccess: (updated) => {
      queryClient.setQueryData(settingsKeys.current(), updated);
    },
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      mockSettingsService.changePassword(currentPassword, newPassword),
  });
};

export const useTerminateSessions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => mockSettingsService.terminateOtherSessions(),
    onSuccess: (updated) => {
      queryClient.setQueryData(settingsKeys.current(), updated);
    },
  });
};

export const useResetSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => mockSettingsService.resetSettings(),
    onSuccess: (updated) => {
      queryClient.setQueryData(settingsKeys.current(), updated);
    },
  });
};

// Appearance applier hook to dynamically reflect settings tokens in DOM
const ACCENT_MAP: Record<AccentColor, { brand500: string; brand600: string; brand100: string }> = {
  blue: { brand500: '#0ea5e9', brand600: '#0284c7', brand100: '#e0f2fe' },
  mint: { brand500: '#10b981', brand600: '#059669', brand100: '#d1fae5' },
  pink: { brand500: '#ec4899', brand600: '#db2777', brand100: '#fce7f3' },
  honey: { brand500: '#f59e0b', brand600: '#d97706', brand100: '#fef3c7' },
  purple: { brand500: '#8b5cf6', brand600: '#7c3aed', brand100: '#ede9fe' },
};

const FONT_SIZE_MAP: Record<TextSize, string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
};

export const useApplyAppearance = (appearance?: UserSettings['appearance']) => {
  useEffect(() => {
    if (!appearance) return;

    const root = document.documentElement;
    const body = document.body;

    // Apply accent colors
    const colors = ACCENT_MAP[appearance.accentColor] || ACCENT_MAP.blue;
    root.style.setProperty('--color-brand-500', colors.brand500);
    root.style.setProperty('--color-brand-600', colors.brand600);
    root.style.setProperty('--color-brand-100', colors.brand100);

    // Apply font size
    root.style.fontSize = FONT_SIZE_MAP[appearance.textSize] || '16px';

    // Apply reduced motion
    if (appearance.reduceMotion) {
      body.classList.add('reduce-motion');
    } else {
      body.classList.remove('reduce-motion');
    }

    // Apply dark mode
    if (appearance.darkMode) {
      body.classList.add('dark');
    } else {
      body.classList.remove('dark');
    }
  }, [appearance]);
};
