import { apiClient } from '@/services/api/httpClient';
import { supabase, updateSessionUserMetadata } from '@/features/auth/api/supabaseClient';
import type { CurrentUserResponse } from '@/features/auth/api/authService';
import type { ProfileService } from './profileService';
import type { UserProfile, UserStatus } from './types';
import { mockProfileService } from './mockProfileService';
import { realFriendsService } from '@/features/friends/api/realFriendsService';

export function formatJoinedAt(dateStr?: string | Date): string {
  if (!dateStr) return 'Recently';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return 'Recently';
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function toCharacterBase(val: unknown): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 {
  const n = Number(val);
  if (n >= 1 && n <= 8) return n as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  return 1;
}

function toUserStatus(val: unknown): UserStatus {
  if (val === 'online' || val === 'offline' || val === 'away' || val === 'dnd') {
    return val;
  }
  return 'online';
}

function mapCurrentUserResponseToProfile(res: CurrentUserResponse, isSelf: boolean = true): UserProfile {
  const user = res.user;
  const prof = res.profile;

  const rawJoined = prof?.joinedAt || user.createdAt;
  return {
    id: user.id,
    username: user.username,
    displayName: prof?.displayName || user.displayName || user.username,
    avatarUrl: prof?.avatarUrl || user.avatarUrl,
    status: toUserStatus(prof?.status || user.status),
    vibeText: prof?.vibeText || user.vibeText || '',
    bio: prof?.bio || '',
    joinedAt: formatJoinedAt(rawJoined),
    friendsCount: 0,
    postsCount: 0,
    characterBase: toCharacterBase(prof?.characterBase || 1),
    skinTone: prof?.skinTone,
    hairColor: prof?.hairColor,
    clothingColor: prof?.clothingColor,
    favoriteReaction: prof?.favoriteReaction || '❤️',
    mood: prof?.mood || undefined,
    relationship: isSelf ? 'self' : 'none',
    posts: [],
    friendsPreview: [],
  };
}

export class RealProfileService implements ProfileService {
  async getCurrentProfile(): Promise<UserProfile> {
    try {
      const res = await apiClient.get<CurrentUserResponse>('/me', { requiresAuth: true });
      if (res && res.authenticated && res.user) {
        return mapCurrentUserResponseToProfile(res, true);
      }
    } catch (err) {
      console.warn('RealProfileService: /me fetch error, falling back to local session:', err);
    }

    // Fallback: derive dynamic profile directly from active Supabase / local session
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      const u = data.session.user;
      const meta = u.user_metadata || {};
      const username = (meta.username as string) || u.email?.split('@')[0] || 'toon_friend';
      const displayName = (meta.displayName as string) || (meta.username as string) || username;
      const characterBase = toCharacterBase(meta.characterBase);

      return {
        id: u.id,
        username,
        displayName,
        status: 'online',
        vibeText: (meta.vibeText as string) || '',
        bio: (meta.bio as string) || '',
        joinedAt: formatJoinedAt(u.created_at),
        friendsCount: 0,
        postsCount: 0,
        characterBase,
        relationship: 'self',
        posts: [],
        friendsPreview: [],
      };
    }

    throw new Error('Not authenticated');
  }

  async getProfileByUsername(username: string): Promise<UserProfile | null> {
    const clean = username.replace(/^@/, '').toLowerCase().trim();
    if (!clean || clean === 'me') {
      return this.getCurrentProfile();
    }

    // If matches current authenticated user, return own profile
    try {
      const current = await this.getCurrentProfile().catch(() => null);
      if (current && current.username.toLowerCase() === clean) {
        return current;
      }
    } catch {
      // Continue to fetch user by username
    }

    // Try backend user route: GET /users/{username}
    try {
      const res = await apiClient.get<any>(`/users/${encodeURIComponent(clean)}`, {
        requiresAuth: true,
      });
      if (res) {
        if (res.user) {
          return mapCurrentUserResponseToProfile(res, false);
        }
        if (res.username) {
          return {
            id: res.id,
            username: res.username,
            displayName: res.display_name || res.username,
            avatarUrl: res.avatar_url || undefined,
            status: toUserStatus(res.status),
            vibeText: res.vibe_text || '',
            bio: res.bio || '',
            joinedAt: formatJoinedAt(res.joined_at),
            friendsCount: 0,
            postsCount: 0,
            characterBase: toCharacterBase(res.character_base || 1),
            favoriteReaction: '❤️',
            relationship: 'none',
            posts: [],
            friendsPreview: [],
          };
        }
      }
    } catch (err) {
      console.warn(`RealProfileService: failed to fetch user ${clean} from backend:`, err);
    }

    // Fall back to demo bot profiles if available
    return mockProfileService.getProfileByUsername(clean);
  }

  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const payload: Record<string, unknown> = {};
      if (data.displayName !== undefined) payload.displayName = data.displayName;
      if (data.bio !== undefined) payload.bio = data.bio;
      if (data.vibeText !== undefined) payload.vibeText = data.vibeText;
      if (data.characterBase !== undefined) payload.characterBase = data.characterBase;
      if (data.status !== undefined) payload.status = data.status;
      if (data.mood !== undefined) payload.mood = data.mood;
      if (data.username !== undefined) payload.username = data.username;

      const res = await apiClient.patch<CurrentUserResponse>('/me', payload, {
        requiresAuth: true,
      });

      if (res && res.user) {
        // Update local auth metadata if available
        updateSessionUserMetadata({
          displayName: res.profile?.displayName || res.user.displayName,
          characterBase: res.profile?.characterBase,
          status: res.profile?.status || res.user.status,
          vibeText: res.profile?.vibeText || res.user.vibeText,
        });
        return mapCurrentUserResponseToProfile(res, true);
      }
    } catch (err) {
      console.warn('RealProfileService: PATCH /me error, updating session locally:', err);
    }

    // Fallback: update local session
    updateSessionUserMetadata({
      displayName: data.displayName,
      characterBase: data.characterBase,
      status: data.status,
      vibeText: data.vibeText,
    });

    return this.getCurrentProfile();
  }

  async updateRelationship(
    username: string,
    action: 'add' | 'remove' | 'cancel' | 'accept' | 'decline' | 'block' | 'unblock'
  ): Promise<UserProfile> {
    const current = await this.getProfileByUsername(username);
    if (!current) {
      return mockProfileService.updateRelationship(username, action);
    }

    try {
      switch (action) {
        case 'add':
          await realFriendsService.sendRequest(current.id);
          return { ...current, relationship: 'requested' };
        case 'accept':
          await realFriendsService.acceptRequest(current.id);
          return { ...current, relationship: 'friends' };
        case 'decline':
          await realFriendsService.declineRequest(current.id);
          return { ...current, relationship: 'none' };
        case 'cancel':
          await realFriendsService.cancelRequest(current.id);
          return { ...current, relationship: 'none' };
        case 'remove':
          await realFriendsService.removeFriend(current.id);
          return { ...current, relationship: 'none' };
        case 'block':
          await realFriendsService.blockUser(current.id);
          return { ...current, relationship: 'blocked' };
        case 'unblock':
          await realFriendsService.unblockUser(current.id);
          return { ...current, relationship: 'none' };
      }
    } catch (err) {
      console.warn('RealProfileService: updateRelationship failed, falling back:', err);
    }

    return mockProfileService.updateRelationship(username, action);
  }
}

export const realProfileService = new RealProfileService();
