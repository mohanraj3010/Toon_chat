import type { SettingsSectionId } from '../api/types';
import { User, Shield, Bell, Palette, MessageSquare, Ban, Key, LogOut, type LucideIcon } from 'lucide-react';

export interface SettingsNavItem {
  id: SettingsSectionId;
  label: string;
  icon: LucideIcon;
  badge?: string;
  color: string;
}

export const SETTINGS_ITEMS: SettingsNavItem[] = [
  { id: 'account', label: 'Account Info', icon: User, color: 'var(--color-pastel-mint)' },
  { id: 'privacy', label: 'Privacy & Visibility', icon: Shield, color: 'var(--color-pastel-pink)' },
  { id: 'notifications', label: 'Notifications', icon: Bell, color: 'var(--color-pastel-yellow)' },
  { id: 'appearance', label: 'Appearance & Theme', icon: Palette, color: 'var(--color-pastel-lavender)' },
  { id: 'chat', label: 'Chat Settings', icon: MessageSquare, color: 'var(--color-pastel-blue)' },
  { id: 'blocked', label: 'Blocked Pals', icon: Ban, color: 'var(--color-pastel-peach)' },
  { id: 'security', label: 'Security & Sessions', icon: Key, color: 'var(--color-pastel-mint)' },
  { id: 'logout', label: 'Log Out', icon: LogOut, color: 'var(--color-danger-light)' },
];
