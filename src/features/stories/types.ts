import { z } from 'zod';
import type { AvatarConfig } from '@/features/avatar/types';

export type StoryType = 'expression' | 'sticker' | 'text';

export const StoryStickerSchema = z.object({
  id: z.string(),
  emoji: z.string(),
  x: z.number(), // Percentage 0-100
  y: z.number(), // Percentage 0-100
  scale: z.number().default(1),
  rotation: z.number().default(0),
});
export type StorySticker = z.infer<typeof StoryStickerSchema>;

export const StoryContentSchema = z.object({
  caption: z.string().max(120).optional(),
  expression: z.enum(['happy', 'wink', 'surprised', 'cool', 'sleepy', 'laughing', 'neutral']).default('happy'),
  backgroundColor: z.string().default('#ffedd5'),
  backgroundPattern: z.enum(['dots', 'stars', 'stripes', 'clouds', 'hearts', 'solid']).default('dots'),
  stickers: z.array(StoryStickerSchema).default([]),
  textColor: z.string().default('#1f2937'),
  fontFamily: z.enum(['fredoka', 'nunito']).default('fredoka'),
});
export type StoryContent = z.infer<typeof StoryContentSchema>;

export const StoryReactionSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  emoji: z.string(),
  createdAt: z.string(),
});
export type StoryReaction = z.infer<typeof StoryReactionSchema>;

export const StoryViewerSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  themeBase: z.number().optional(),
  viewedAt: z.string(),
});
export type StoryViewer = z.infer<typeof StoryViewerSchema>;

export const StoryItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string(),
    displayName: z.string(),
    avatarConfig: z.custom<AvatarConfig>().optional(),
    themeBase: z.number().optional(),
  }),
  type: z.enum(['expression', 'sticker', 'text']),
  content: StoryContentSchema,
  createdAt: z.string(),
  expiresAt: z.string(),
  viewed: z.boolean().default(false),
  reactions: z.array(StoryReactionSchema).default([]),
  viewers: z.array(StoryViewerSchema).default([]),
});
export type StoryItem = z.infer<typeof StoryItemSchema>;

export interface UserStoryGroup {
  userId: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarConfig?: AvatarConfig;
    themeBase?: number;
  };
  stories: StoryItem[];
  hasUnviewed: boolean;
  lastStoryAt: string;
}

export const StoryCreateInputSchema = z.object({
  type: z.enum(['expression', 'sticker', 'text']),
  content: StoryContentSchema,
});
export type StoryCreateInput = z.infer<typeof StoryCreateInputSchema>;
