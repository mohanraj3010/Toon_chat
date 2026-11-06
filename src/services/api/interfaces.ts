import type { User, Conversation, Message, Friendship, WorldPresence } from '@/shared/types';

export interface IChatService {
  getConversations(): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation>;
  getMessages(conversationId: string): Promise<Message[]>;
  sendMessage(conversationId: string, content: string, type: Message['type']): Promise<Message>;
}

export interface IUserService {
  getCurrentUser(): Promise<User>;
  getUserProfile(userId: string): Promise<User>;
  updateProfile(data: Partial<User>): Promise<User>;
}

export interface IFriendsService {
  getFriends(): Promise<Friendship[]>;
  sendFriendRequest(userId: string): Promise<void>;
  acceptFriendRequest(requestId: string): Promise<void>;
}

export interface IWorldService {
  getPresence(): Promise<WorldPresence[]>;
  updateLocation(x: number, y: number): Promise<void>;
}
