import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().url().optional(),
  status: z.enum(['online', 'offline', 'away', 'dnd']),
  vibeText: z.string().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const ProfileSchema = UserSchema.extend({
  bio: z.string().optional(),
  joinedAt: z.string().datetime(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const FriendshipSchema = z.object({
  userId: z.string().uuid(),
  friendId: z.string().uuid(),
  status: z.enum(['pending', 'accepted', 'blocked']),
  createdAt: z.string().datetime(),
});
export type Friendship = z.infer<typeof FriendshipSchema>;

export const MessageSchema = z.object({
  id: z.string().uuid().or(z.string()),
  conversationId: z.string().uuid().or(z.string()),
  senderId: z.string().uuid().or(z.string()),
  content: z.string(),
  type: z.enum(['text', 'image', 'sticker', 'voice', 'file']),
  mediaId: z.string().optional(),
  mediaUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().int().optional(),
  mimeType: z.string().optional(),
  createdAt: z.string(),
  readBy: z.array(z.string().uuid().or(z.string())),
  status: z.enum(['uploading', 'sending', 'sent', 'delivered', 'read', 'failed']).optional(),
  replyToId: z.string().optional(),
  reactions: z.array(z.any()).optional(), // Will type as Reaction[] below
  sequence: z.number().int().optional(),
  clientMessageId: z.string().optional(),
  sender: z
    .object({
      id: z.string(),
      username: z.string(),
      displayName: z.string(),
      avatarUrl: z.string().nullable().optional(),
    })
    .optional(),
});
export type Message = z.infer<typeof MessageSchema>;

export const ConversationSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['direct', 'group']),
  participants: z.array(UserSchema),
  lastMessage: MessageSchema.optional(),
  unreadCount: z.number().default(0),
  updatedAt: z.string().datetime(),
});
export type Conversation = z.infer<typeof ConversationSchema>;

export const GroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  avatarUrl: z.string().url().optional(),
  members: z.array(UserSchema),
  createdAt: z.string().datetime(),
});
export type Group = z.infer<typeof GroupSchema>;

export const StorySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  mediaUrl: z.string().url(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});
export type Story = z.infer<typeof StorySchema>;

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(['friend_request', 'message', 'reaction', 'mention']),
  content: z.string(),
  read: z.boolean().default(false),
  createdAt: z.string().datetime(),
});
export type Notification = z.infer<typeof NotificationSchema>;

export const AvatarSchema = z.object({
  userId: z.string().uuid(),
  base: z.string(),
  hair: z.string(),
  eyes: z.string(),
  mouth: z.string(),
  outfit: z.string(),
  accessories: z.array(z.string()),
});
export type Avatar = z.infer<typeof AvatarSchema>;

export const StickerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  imageUrl: z.string().url(),
  category: z.string(),
});
export type Sticker = z.infer<typeof StickerSchema>;

export const MediaSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  type: z.enum(['image', 'video', 'voice']),
  size: z.number(),
});
export type Media = z.infer<typeof MediaSchema>;

export const ReactionSchema = z.object({
  id: z.string().uuid().or(z.string()),
  messageId: z.string().uuid().or(z.string()),
  userId: z.string().uuid().or(z.string()),
  emoji: z.string(),
});
export type Reaction = z.infer<typeof ReactionSchema>;

export const WorldPresenceSchema = z.object({
  userId: z.string().uuid(),
  location: z.object({ x: z.number(), y: z.number() }),
  status: z.enum(['active', 'idle']),
  lastUpdate: z.string().datetime(),
});
export type WorldPresence = z.infer<typeof WorldPresenceSchema>;
