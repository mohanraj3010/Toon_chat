import type { ProfileService } from './profileService';
import type { UserProfile } from './types';

const STORAGE_KEY = 'toonchat_profile_me';

const DEFAULT_CURRENT_PROFILE: UserProfile = {
  id: 'c1f7f0aa-b54c-47ea-bd56-621aa906e001',
  username: 'luna_toon',
  displayName: 'Luna Toon',
  status: 'online',
  vibeText: 'Exploring Maple Park 🌳✨',
  bio: 'Cartoon explorer and friendly Maple Park neighbor.',
  joinedAt: 'Recent',
  friendsCount: 0,
  postsCount: 0,
  characterBase: 1,
  favoriteReaction: '❤️',
  mood: 'Playful & Creative 🎨',
  recentActivity: 'Joined ToonChat 🎉',
  relationship: 'self',
  friendsPreview: [],
  posts: [],
};

const OTHER_PROFILES: Record<string, UserProfile> = {
  lucy_sky: {
    id: '1',
    username: 'lucy_sky',
    displayName: 'Lucy Sky',
    status: 'online',
    vibeText: 'Good vibes • Big dreams ✨',
    bio: 'Daydreamer, digital doodler, and strawberry boba lover. Let us explore Maple Park together!',
    joinedAt: 'January 2024',
    friendsCount: 18,
    postsCount: 3,
    characterBase: 2,
    favoriteReaction: '🌸',
    mood: 'Daydreaming ☁️',
    recentActivity: 'Drew a cute cat sticker (1h ago)',
    mutualFriends: 6,
    relationship: 'friends',
    friendsPreview: [
      { id: 'c1f7f0aa-b54c-47ea-bd56-621aa906e001', username: 'luna_toon', displayName: 'Luna Toon', characterBase: 1, isOnline: true },
      { id: '3', username: 'bella_b', displayName: 'Bella Brooks', characterBase: 3, isOnline: true },
      { id: '5', username: 'mia_w', displayName: 'Mia Wang', characterBase: 5, isOnline: false },
    ],
    posts: [
      {
        id: 'lucy-1',
        caption: 'Boba tea date in Maple Park plaza! Strawberry with pudding 🧋🍓',
        createdAt: '4 hours ago',
        likesCount: 36,
        themeColor: 'var(--color-pastel-pink)',
        emoji: '🧋',
      },
      {
        id: 'lucy-2',
        caption: 'Working on a secret animated world scene. Can you guess which one? 🤫',
        createdAt: '2 days ago',
        likesCount: 52,
        themeColor: 'var(--color-pastel-blue)',
        emoji: '🎨',
      },
      {
        id: 'lucy-3',
        caption: 'Happy weekend to all ToonChat pals! Stay creative! 🎈',
        createdAt: '5 days ago',
        likesCount: 44,
        themeColor: 'var(--color-pastel-yellow)',
        emoji: '✨',
      },
    ],
  },
  max_power: {
    id: '2',
    username: 'max_power',
    displayName: 'Max Power',
    status: 'offline',
    vibeText: 'Gaming marathon mode 🎮',
    bio: 'Speedrunning indie platformers & retro classics. Hit me up for co-op on weekends!',
    joinedAt: 'February 2024',
    friendsCount: 31,
    postsCount: 2,
    characterBase: 1,
    favoriteReaction: '🔥',
    mood: 'Boss Fight Ready ⚔️',
    recentActivity: 'Defeated world 7 boss (3h ago)',
    mutualFriends: 4,
    relationship: 'friends',
    friendsPreview: [
      { id: 'c1f7f0aa-b54c-47ea-bd56-621aa906e001', username: 'luna_toon', displayName: 'Luna Toon', characterBase: 1, isOnline: true },
      { id: '4', username: 'sam_smith', displayName: 'Sam Smith', characterBase: 4, isOnline: true },
    ],
    posts: [
      {
        id: 'max-1',
        caption: 'Hit a new personal best speedrun record! 14m 22s! 🏆',
        createdAt: '1 day ago',
        likesCount: 48,
        themeColor: 'var(--color-pastel-mint)',
        emoji: '🎮',
      },
      {
        id: 'max-2',
        caption: 'Setting up the Friday night game lobby. Who is in? 🕹️',
        createdAt: '4 days ago',
        likesCount: 29,
        themeColor: 'var(--color-pastel-peach)',
        emoji: '👾',
      },
    ],
  },
  bella_b: {
    id: '3',
    username: 'bella_b',
    displayName: 'Bella Brooks',
    status: 'away',
    vibeText: 'Dreaming of sunshine ☀️',
    bio: 'Plant mom, cozy gamer, and aspiring watercolorist. Taking things one petal at a time.',
    joinedAt: 'March 2024',
    friendsCount: 14,
    postsCount: 1,
    characterBase: 3,
    favoriteReaction: '🌱',
    mood: 'Watering Plants 🪴',
    recentActivity: 'Re-potted my monstera (5h ago)',
    mutualFriends: 2,
    relationship: 'requested',
    friendsPreview: [
      { id: '1', username: 'lucy_sky', displayName: 'Lucy Sky', characterBase: 2, isOnline: true },
      { id: '5', username: 'mia_w', displayName: 'Mia Wang', characterBase: 5, isOnline: false },
    ],
    posts: [
      {
        id: 'bella-1',
        caption: 'My succulent nursery just sprouted 3 new little babies! 🌱💚',
        createdAt: '3 days ago',
        likesCount: 27,
        themeColor: 'var(--color-pastel-mint)',
        emoji: '🌿',
      },
    ],
  },
  sam_smith: {
    id: '4',
    username: 'sam_smith',
    displayName: 'Sam Smith',
    status: 'online',
    vibeText: 'Chilling by the fountain ⛲',
    bio: 'Coffee explorer, lo-fi beatmaker, always looking for vinyl and music recs.',
    joinedAt: 'April 2024',
    friendsCount: 9,
    postsCount: 0,
    characterBase: 4,
    favoriteReaction: '🎵',
    mood: 'Listening to Jazz 🎷',
    recentActivity: 'Saved a new playlist (30m ago)',
    mutualFriends: 3,
    relationship: 'none',
    friendsPreview: [
      { id: '2', username: 'max_power', displayName: 'Max Power', characterBase: 1, isOnline: false },
    ],
    posts: [],
  },
  mia_w: {
    id: '5',
    username: 'mia_w',
    displayName: 'Mia Wang',
    status: 'dnd',
    vibeText: 'Do not disturb, sketching ✏️',
    bio: 'Comic artist & animation enthusiast. Creating tiny cartoon worlds with ink and paper.',
    joinedAt: 'February 2024',
    friendsCount: 22,
    postsCount: 2,
    characterBase: 5,
    favoriteReaction: '🎨',
    mood: 'In the Zone 🎧',
    recentActivity: 'Uploaded comic chapter 4 (6h ago)',
    mutualFriends: 5,
    relationship: 'pending',
    friendsPreview: [
      { id: '1', username: 'lucy_sky', displayName: 'Lucy Sky', characterBase: 2, isOnline: true },
      { id: '3', username: 'bella_b', displayName: 'Bella Brooks', characterBase: 3, isOnline: true },
    ],
    posts: [
      {
        id: 'mia-1',
        caption: 'Preview of the new Maple Park character sketches! 🐶🐱',
        createdAt: '1 day ago',
        likesCount: 65,
        themeColor: 'var(--color-pastel-lavender)',
        emoji: '✍️',
      },
      {
        id: 'mia-2',
        caption: 'Inktober drawings are finally complete! 🎃',
        createdAt: '6 days ago',
        likesCount: 41,
        themeColor: 'var(--color-pastel-peach)',
        emoji: '🖌️',
      },
    ],
  },
};

class MockProfileServiceImpl implements ProfileService {
  private async delay(ms = 350) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private loadMeFromStorage(): UserProfile {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_CURRENT_PROFILE, ...JSON.parse(stored), relationship: 'self' };
      }

      // Check active auth session in storage for dynamic user
      const rawSession = localStorage.getItem('toonchat_supabase_auth_session_v1');
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        const u = parsed?.user;
        if (u) {
          const meta = u.user_metadata || {};
          const username = (meta.username as string) || u.email?.split('@')[0] || 'toon_citizen';
          const displayName = (meta.displayName as string) || (meta.username as string) || username;
          const characterBase = meta.characterBase ? (Number(meta.characterBase) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8) : 1;
          const joinedAt = u.created_at
            ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            : 'Recent';

          return {
            id: u.id,
            username,
            displayName,
            status: 'online',
            vibeText: (meta.vibeText as string) || '',
            bio: (meta.bio as string) || '',
            joinedAt,
            friendsCount: 0,
            postsCount: 0,
            characterBase,
            relationship: 'self',
            friendsPreview: [],
            posts: [],
          };
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_CURRENT_PROFILE;
  }

  private saveMeToStorage(profile: UserProfile): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }

  async getCurrentProfile(): Promise<UserProfile> {
    await this.delay();
    return this.loadMeFromStorage();
  }

  async getProfileByUsername(username: string): Promise<UserProfile | null> {
    await this.delay();
    const clean = username.replace(/^@/, '').toLowerCase();
    const me = this.loadMeFromStorage();

    if (clean === me.username.toLowerCase()) {
      return me;
    }

    if (OTHER_PROFILES[clean]) {
      return { ...OTHER_PROFILES[clean] };
    }

    // Check if it's a known user prefix or synthetic profile
    return null;
  }

  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    await this.delay();
    const current = this.loadMeFromStorage();
    const updated: UserProfile = {
      ...current,
      ...data,
      relationship: 'self',
    };
    this.saveMeToStorage(updated);
    return updated;
  }

  async updateRelationship(
    username: string,
    action: 'add' | 'remove' | 'cancel' | 'accept' | 'decline' | 'block' | 'unblock'
  ): Promise<UserProfile> {
    await this.delay();
    const clean = username.replace(/^@/, '').toLowerCase();
    const target = OTHER_PROFILES[clean];
    if (!target) {
      throw new Error('User not found');
    }

    let newStatus = target.relationship;
    let friendsCount = target.friendsCount;

    switch (action) {
      case 'add':
        newStatus = 'requested';
        break;
      case 'cancel':
        newStatus = 'none';
        break;
      case 'accept':
        newStatus = 'friends';
        friendsCount += 1;
        break;
      case 'decline':
      case 'remove':
        newStatus = 'none';
        if (target.relationship === 'friends') {
          friendsCount = Math.max(0, friendsCount - 1);
        }
        break;
      case 'block':
        newStatus = 'blocked';
        break;
      case 'unblock':
        newStatus = 'none';
        break;
    }

    const updated = {
      ...target,
      relationship: newStatus,
      friendsCount,
    };
    OTHER_PROFILES[clean] = updated;
    return updated;
  }
}

export const mockProfileService = new MockProfileServiceImpl();
