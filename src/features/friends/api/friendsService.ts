import type { User as BaseUser } from '@/shared/types';

export type FriendStatus = 'friends' | 'requested' | 'pending' | 'blocked' | 'none';

export interface DiscoverUser extends BaseUser {
  friendStatus: FriendStatus;
  isOnline: boolean;
  bio?: string;
  themeBase?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  mutualFriends?: number;
  interests?: string[];
  suggestedReason?: string;
}

export interface FriendsService {
  getFriends(): Promise<DiscoverUser[]>;
  getOnlineFriends(): Promise<DiscoverUser[]>;
  getFriendRequests(): Promise<DiscoverUser[]>;
  getSentRequests(): Promise<DiscoverUser[]>;
  getBlockedUsers(): Promise<DiscoverUser[]>;
  getDiscoverUsers(query: string, interests: string[]): Promise<DiscoverUser[]>;

  sendRequest(userId: string): Promise<void>;
  acceptRequest(userId: string): Promise<void>;
  declineRequest(userId: string): Promise<void>;
  cancelRequest(userId: string): Promise<void>;
  removeFriend(userId: string): Promise<void>;
  blockUser(userId: string): Promise<void>;
  unblockUser(userId: string): Promise<void>;
  
  // For testing
  setShouldFail(fail: boolean): void;
}
