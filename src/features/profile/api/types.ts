import { z } from 'zod';

export type UserStatus = 'online' | 'offline' | 'away' | 'dnd';
export type RelationshipStatus = 'self' | 'friends' | 'requested' | 'pending' | 'none' | 'blocked';

export interface ProfilePost {
  id: string;
  caption: string;
  createdAt: string;
  likesCount: number;
  themeColor: string;
  emoji: string;
  tag?: string;
}

export interface ProfileFriendPreview {
  id: string;
  username: string;
  displayName: string;
  characterBase: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  isOnline: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: UserStatus;
  vibeText: string;
  bio: string;
  joinedAt: string;
  friendsCount: number;
  postsCount: number;
  characterBase: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  skinTone?: string;
  hairColor?: string;
  clothingColor?: string;
  favoriteReaction?: string;
  mood?: string;
  recentActivity?: string;
  mutualFriends?: number;
  relationship: RelationshipStatus;
  posts: ProfilePost[];
  friendsPreview: ProfileFriendPreview[];
}

export const EditProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(30, 'Display name must be 30 characters or less'),
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be 20 characters or less')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  bio: z
    .string()
    .max(160, 'Bio must be 160 characters or less'),
  status: z.enum(['online', 'offline', 'away', 'dnd']),
  vibeText: z
    .string()
    .max(50, 'Status bubble must be 50 characters or less'),
  characterBase: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
    z.literal(7),
    z.literal(8),
  ]),
});

export type EditProfileFormData = z.infer<typeof EditProfileSchema>;
