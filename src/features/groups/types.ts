import { z } from 'zod';
import type { AvatarConfig } from '@/features/avatar/types';

export type GroupRole = 'owner' | 'admin' | 'member';
export type GroupPrivacy = 'public' | 'private';
export type GroupCategory = 'gaming' | 'art' | 'skate' | 'music' | 'hangout' | 'tech';

export const GroupAvatarSchema = z.object({
  emblem: z.string().default('🛹'),
  backgroundColor: z.string().default('#ffedd5'),
  pattern: z.enum(['dots', 'stars', 'stripes', 'clouds', 'solid']).default('dots'),
});
export type GroupAvatar = z.infer<typeof GroupAvatarSchema>;

export const GroupMemberSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  themeBase: z.number().optional(),
  avatarConfig: z.custom<AvatarConfig>().optional(),
  role: z.enum(['owner', 'admin', 'member']).default('member'),
  joinedAt: z.string(),
  isMuted: z.boolean().optional(),
});
export type GroupMember = z.infer<typeof GroupMemberSchema>;

export const JoinRequestSchema = z.object({
  id: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string(),
    displayName: z.string(),
    themeBase: z.number().optional(),
  }),
  requestedAt: z.string(),
});
export type JoinRequest = z.infer<typeof JoinRequestSchema>;

export const PinnedMessageSchema = z.object({
  id: z.string(),
  content: z.string(),
  pinnedBy: z.string(),
  pinnedAt: z.string(),
});
export type PinnedMessage = z.infer<typeof PinnedMessageSchema>;

export const GroupItemSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  name: z.string().min(2).max(30),
  description: z.string().max(140),
  category: z.enum(['gaming', 'art', 'skate', 'music', 'hangout', 'tech']).default('hangout'),
  privacy: z.enum(['public', 'private']).default('public'),
  avatar: GroupAvatarSchema,
  bannerColor: z.string().default('#ffedd5'),
  members: z.array(GroupMemberSchema),
  joinRequests: z.array(JoinRequestSchema).default([]),
  pinnedMessage: PinnedMessageSchema.optional(),
  createdAt: z.string(),
});
export type GroupItem = z.infer<typeof GroupItemSchema>;

export interface GroupPermissions {
  canInvite: boolean;
  canRemove: boolean;
  canEdit: boolean;
  canPin: boolean;
  canDelete: boolean;
  canApproveRequests: boolean;
  canPromoteDemote: boolean;
}

export function getGroupPermissions(userRole?: GroupRole): GroupPermissions {
  if (userRole === 'owner') {
    return {
      canInvite: true,
      canRemove: true,
      canEdit: true,
      canPin: true,
      canDelete: true,
      canApproveRequests: true,
      canPromoteDemote: true,
    };
  }
  if (userRole === 'admin') {
    return {
      canInvite: true,
      canRemove: true,
      canEdit: true,
      canPin: true,
      canDelete: false,
      canApproveRequests: true,
      canPromoteDemote: false,
    };
  }
  return {
    canInvite: true,
    canRemove: false,
    canEdit: false,
    canPin: false,
    canDelete: false,
    canApproveRequests: false,
    canPromoteDemote: false,
  };
}

export const CreateGroupInputSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(30, 'Name must be under 30 characters'),
  description: z.string().max(140, 'Description must be under 140 characters').default(''),
  category: z.enum(['gaming', 'art', 'skate', 'music', 'hangout', 'tech']).default('hangout'),
  privacy: z.enum(['public', 'private']).default('public'),
  avatar: GroupAvatarSchema,
  initialMemberIds: z.array(z.string()).default([]),
});
export type CreateGroupInput = z.infer<typeof CreateGroupInputSchema>;
