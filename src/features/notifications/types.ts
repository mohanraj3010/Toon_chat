import { z } from 'zod';
import type { AvatarConfig } from '@/features/avatar/types';

export type NotificationType =
  | 'friend_request'
  | 'message'
  | 'reaction'
  | 'story_interaction'
  | 'group_activity'
  | 'world_activity';

export interface NotificationActor {
  id: string;
  username: string;
  displayName: string;
  themeBase?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  avatarConfig?: AvatarConfig;
}

export const NotificationItemSchema = z.object({
  id: z.string(),
  type: z.enum([
    'friend_request',
    'message',
    'reaction',
    'story_interaction',
    'group_activity',
    'world_activity',
  ]),
  actor: z.object({
    id: z.string(),
    username: z.string(),
    displayName: z.string(),
    themeBase: z.number().optional(),
    avatarConfig: z.custom<AvatarConfig>().optional(),
  }),
  content: z.string(),
  expression: z.enum(['happy', 'wink', 'surprised', 'cool', 'sleepy', 'laughing', 'neutral']).default('happy'),
  timestamp: z.string(),
  read: z.boolean().default(false),
  targetUrl: z.string().optional(),
  actionData: z.record(z.string(), z.any()).optional(),
});
export type NotificationItem = z.infer<typeof NotificationItemSchema>;
