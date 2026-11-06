import type { WorldService } from './worldService';
import type {
  WorldPlaceConfig,
  WorldPlaceId,
  WorldCharacterState,
  WorldActivityItem,
  Vector2D,
} from '../types';
import { WORLD_PLACES } from '../config/scenes';
import { avatarService } from '@/features/avatar/api/avatarService';
import type { AvatarConfig } from '@/features/avatar/types';

// Distinct mock avatar configs matching toon-world.jpg characters
const LIAM_AVATAR: AvatarConfig = {
  version: 1,
  name: 'Liam',
  background: 'bg-pastel-swirl',
  backgroundColor: '#bfdbfe',
  headShape: 'head-chubby',
  skinTone: '#ffd8c2',
  eyes: 'eyes-sparkle',
  eyeColor: '#1e293b',
  eyebrows: 'brows-soft',
  eyebrowColor: '#1e293b',
  nose: 'nose-button',
  mouth: 'mouth-open-happy',
  blush: 'blush-soft-pink',
  hairStyle: 'hair-anime-spiky',
  hairColor: '#334155',
  facialHair: 'none',
  facialHairColor: '#1e293b',
  outfit: 'outfit-hoodie',
  outfitPrimaryColor: '#38bdf8',
  outfitSecondaryColor: '#0284c7',
  glasses: 'none',
  glassesColor: '#1e293b',
  hat: 'hat-snapback',
  hatColor: '#0284c7',
  earrings: 'none',
  earringsColor: '#fbbf24',
  headphones: 'none',
  headphonesColor: '#38bdf8',
  expression: 'happy',
};

const LILY_AVATAR: AvatarConfig = {
  version: 1,
  name: 'Lily',
  background: 'bg-pastel-swirl',
  backgroundColor: '#f3e8ff',
  headShape: 'head-chubby',
  skinTone: '#ffd8c2',
  eyes: 'eyes-sparkle',
  eyeColor: '#581c87',
  eyebrows: 'brows-soft',
  eyebrowColor: '#581c87',
  nose: 'nose-button',
  mouth: 'mouth-open-happy',
  blush: 'blush-soft-pink',
  hairStyle: 'hair-bob-bangs',
  hairColor: '#a855f7',
  facialHair: 'none',
  facialHairColor: '#581c87',
  outfit: 'outfit-overalls',
  outfitPrimaryColor: '#c084fc',
  outfitSecondaryColor: '#9333ea',
  glasses: 'none',
  glassesColor: '#1e293b',
  hat: 'none',
  hatColor: '#c084fc',
  earrings: 'none',
  earringsColor: '#fbbf24',
  headphones: 'none',
  headphonesColor: '#c084fc',
  expression: 'happy',
};

const MIA_AVATAR: AvatarConfig = {
  version: 1,
  name: 'Mia',
  background: 'bg-pastel-swirl',
  backgroundColor: '#fce7f3',
  headShape: 'head-chubby',
  skinTone: '#ffd8c2',
  eyes: 'eyes-sparkle',
  eyeColor: '#831843',
  eyebrows: 'brows-soft',
  eyebrowColor: '#ca8a04',
  nose: 'nose-button',
  mouth: 'mouth-open-happy',
  blush: 'blush-soft-pink',
  hairStyle: 'hair-twin-pigtails',
  hairColor: '#fde047',
  facialHair: 'none',
  facialHairColor: '#ca8a04',
  outfit: 'outfit-hoodie',
  outfitPrimaryColor: '#f472b6',
  outfitSecondaryColor: '#db2777',
  glasses: 'none',
  glassesColor: '#1e293b',
  hat: 'none',
  hatColor: '#f472b6',
  earrings: 'none',
  earringsColor: '#fbbf24',
  headphones: 'none',
  headphonesColor: '#f472b6',
  expression: 'happy',
};

const ALEX_AVATAR: AvatarConfig = {
  version: 1,
  name: 'Alex',
  background: 'bg-pastel-swirl',
  backgroundColor: '#ffedd5',
  headShape: 'head-chubby',
  skinTone: '#ffd8c2',
  eyes: 'eyes-sparkle',
  eyeColor: '#7c2d12',
  eyebrows: 'brows-soft',
  eyebrowColor: '#7c2d12',
  nose: 'nose-button',
  mouth: 'mouth-open-happy',
  blush: 'blush-soft-pink',
  hairStyle: 'hair-anime-spiky',
  hairColor: '#9a3412',
  facialHair: 'none',
  facialHairColor: '#7c2d12',
  outfit: 'outfit-jacket',
  outfitPrimaryColor: '#fb923c',
  outfitSecondaryColor: '#ea580c',
  glasses: 'none',
  glassesColor: '#1e293b',
  hat: 'none',
  hatColor: '#fb923c',
  earrings: 'none',
  earringsColor: '#fbbf24',
  headphones: 'none',
  headphonesColor: '#fb923c',
  expression: 'happy',
};

const CHLOE_AVATAR: AvatarConfig = {
  version: 1,
  name: 'Chloe',
  background: 'bg-pastel-swirl',
  backgroundColor: '#ffe4e6',
  headShape: 'head-chubby',
  skinTone: '#ffd8c2',
  eyes: 'eyes-sparkle',
  eyeColor: '#881337',
  eyebrows: 'brows-soft',
  eyebrowColor: '#713f12',
  nose: 'nose-button',
  mouth: 'mouth-open-happy',
  blush: 'blush-soft-pink',
  hairStyle: 'hair-long-wavy',
  hairColor: '#854d0e',
  facialHair: 'none',
  facialHairColor: '#713f12',
  outfit: 'outfit-tshirt',
  outfitPrimaryColor: '#fb7185',
  outfitSecondaryColor: '#e11d48',
  glasses: 'none',
  glassesColor: '#1e293b',
  hat: 'none',
  hatColor: '#fb7185',
  earrings: 'none',
  earringsColor: '#fbbf24',
  headphones: 'none',
  headphonesColor: '#fb7185',
  expression: 'happy',
};

const NOAH_AVATAR: AvatarConfig = {
  version: 1,
  name: 'Noah',
  background: 'bg-pastel-swirl',
  backgroundColor: '#ccfbf1',
  headShape: 'head-chubby',
  skinTone: '#ffd8c2',
  eyes: 'eyes-sparkle',
  eyeColor: '#134e4a',
  eyebrows: 'brows-soft',
  eyebrowColor: '#1e293b',
  nose: 'nose-button',
  mouth: 'mouth-open-happy',
  blush: 'blush-soft-pink',
  hairStyle: 'hair-anime-spiky',
  hairColor: '#1e293b',
  facialHair: 'none',
  facialHairColor: '#1e293b',
  outfit: 'outfit-jacket',
  outfitPrimaryColor: '#2dd4bf',
  outfitSecondaryColor: '#0f766e',
  glasses: 'none',
  glassesColor: '#1e293b',
  hat: 'none',
  hatColor: '#2dd4bf',
  earrings: 'none',
  earringsColor: '#fbbf24',
  headphones: 'none',
  headphonesColor: '#2dd4bf',
  expression: 'happy',
};

class MockWorldServiceImpl implements WorldService {
  private charactersByPlace: Record<WorldPlaceId, WorldCharacterState[]> = {
    park: [
      {
        id: 'user-liam',
        username: 'liam_b',
        displayName: 'Liam',
        avatarConfig: LIAM_AVATAR,
        position: { x: 190, y: 440 },
        targetPosition: null,
        facing: 'right',
        action: 'idle',
        statusText: 'Walking with backpack',
        speech: {
          id: 'sp-1',
          text: 'Hi Lily! 👋',
          createdAt: Date.now() - 5000,
          expiresAt: Date.now() + 15000,
        },
        emote: null,
        isCurrentUser: false,
        walkSpeed: 70,
        wanderCooldown: 6,
      },
      {
        id: 'user-lily',
        username: 'lily_c',
        displayName: 'Lily',
        avatarConfig: LILY_AVATAR,
        position: { x: 300, y: 450 },
        targetPosition: null,
        facing: 'left',
        action: 'idle',
        statusText: 'Catching up with Liam',
        speech: {
          id: 'sp-2',
          text: 'Hey Liam! 😊',
          createdAt: Date.now() - 4000,
          expiresAt: Date.now() + 16000,
        },
        emote: null,
        isCurrentUser: false,
        walkSpeed: 65,
        wanderCooldown: 8,
      },
      {
        id: 'user-mia',
        username: 'mia_w',
        displayName: 'Mia',
        avatarConfig: MIA_AVATAR,
        position: { x: 550, y: 350 },
        targetPosition: null,
        facing: 'right',
        action: 'idle',
        statusText: 'Exploring the trail',
        speech: {
          id: 'sp-3',
          text: 'Love this park!',
          createdAt: Date.now() - 3000,
          expiresAt: Date.now() + 18000,
        },
        emote: null,
        isCurrentUser: false,
        walkSpeed: 75,
        wanderCooldown: 7,
      },
      {
        id: 'user-alex',
        username: 'alex_r',
        displayName: 'Alex',
        avatarConfig: ALEX_AVATAR,
        position: { x: 680, y: 360 },
        targetPosition: null,
        facing: 'left',
        action: 'idle',
        statusText: 'Enjoying the sunshine',
        speech: {
          id: 'sp-4',
          text: "Yeah, it's so bright! 🌸",
          createdAt: Date.now() - 2000,
          expiresAt: Date.now() + 20000,
        },
        emote: null,
        isCurrentUser: false,
        walkSpeed: 70,
        wanderCooldown: 5,
      },
      {
        id: 'user-chloe',
        username: 'chloe_c',
        displayName: 'Chloe',
        avatarConfig: CHLOE_AVATAR,
        position: { x: 610, y: 520 },
        targetPosition: null,
        facing: 'right',
        action: 'idle',
        statusText: 'Taking a morning stroll 🍃',
        speech: null,
        emote: {
          id: 'em-1',
          emoji: '🌸',
          createdAt: Date.now() - 1000,
          expiresAt: Date.now() + 8000,
        },
        isCurrentUser: false,
        walkSpeed: 60,
        wanderCooldown: 10,
      },
      {
        id: 'user-noah',
        username: 'noah_n',
        displayName: 'Noah',
        avatarConfig: NOAH_AVATAR,
        position: { x: 740, y: 510 },
        targetPosition: null,
        facing: 'left',
        action: 'idle',
        statusText: 'Resting by the bench ☀️',
        speech: null,
        emote: null,
        isCurrentUser: false,
        walkSpeed: 65,
        wanderCooldown: 9,
      },
    ],
    cafe: [
      {
        id: 'user-mia',
        username: 'mia_w',
        displayName: 'Mia',
        avatarConfig: MIA_AVATAR,
        position: { x: 380, y: 360 },
        targetPosition: null,
        facing: 'right',
        action: 'sitting',
        statusText: 'Sipping warm vanilla latte ☕',
        speech: {
          id: 'sp-c1',
          text: 'This pastry is amazing! 🥐',
          createdAt: Date.now() - 4000,
          expiresAt: Date.now() + 15000,
        },
        emote: null,
        isCurrentUser: false,
        walkSpeed: 60,
        wanderCooldown: 12,
      },
      {
        id: 'user-alex',
        username: 'alex_r',
        displayName: 'Alex',
        avatarConfig: ALEX_AVATAR,
        position: { x: 500, y: 370 },
        targetPosition: null,
        facing: 'left',
        action: 'sitting',
        statusText: 'Listening to chill lo-fi tunes 🎵',
        speech: null,
        emote: {
          id: 'em-c1',
          emoji: '☕',
          createdAt: Date.now() - 2000,
          expiresAt: Date.now() + 7000,
        },
        isCurrentUser: false,
        walkSpeed: 60,
        wanderCooldown: 15,
      },
      {
        id: 'user-lily',
        username: 'lily_c',
        displayName: 'Lily',
        avatarConfig: LILY_AVATAR,
        position: { x: 700, y: 440 },
        targetPosition: null,
        facing: 'left',
        action: 'idle',
        statusText: 'Browsing cafe books 📚',
        speech: null,
        emote: null,
        isCurrentUser: false,
        walkSpeed: 65,
        wanderCooldown: 8,
      },
    ],
    plaza: [
      {
        id: 'user-liam',
        username: 'liam_b',
        displayName: 'Liam',
        avatarConfig: LIAM_AVATAR,
        position: { x: 420, y: 380 },
        targetPosition: null,
        facing: 'right',
        action: 'idle',
        statusText: 'Making a wish at the fountain ✨',
        speech: {
          id: 'sp-p1',
          text: 'Look at the fountain rainbow! 🌈',
          createdAt: Date.now() - 6000,
          expiresAt: Date.now() + 14000,
        },
        emote: null,
        isCurrentUser: false,
        walkSpeed: 70,
        wanderCooldown: 6,
      },
      {
        id: 'user-chloe',
        username: 'chloe_c',
        displayName: 'Chloe',
        avatarConfig: CHLOE_AVATAR,
        position: { x: 260, y: 410 },
        targetPosition: null,
        facing: 'right',
        action: 'idle',
        statusText: 'Picking fresh sunflowers 🌻',
        speech: null,
        emote: {
          id: 'em-p1',
          emoji: '🌻',
          createdAt: Date.now() - 3000,
          expiresAt: Date.now() + 6000,
        },
        isCurrentUser: false,
        walkSpeed: 60,
        wanderCooldown: 9,
      },
      {
        id: 'user-noah',
        username: 'noah_n',
        displayName: 'Noah',
        avatarConfig: NOAH_AVATAR,
        position: { x: 670, y: 430 },
        targetPosition: null,
        facing: 'left',
        action: 'idle',
        statusText: 'Waiting for the clock chime 🔔',
        speech: null,
        emote: null,
        isCurrentUser: false,
        walkSpeed: 65,
        wanderCooldown: 7,
      },
    ],
  };

  private playerPosition: Record<WorldPlaceId, Vector2D> = {
    park: { x: 490, y: 430 },
    cafe: { x: 480, y: 460 },
    plaza: { x: 500, y: 460 },
  };

  private activities: WorldActivityItem[] = [
    {
      id: 'act-1',
      userId: 'user-mia',
      displayName: 'Mia',
      avatarConfig: MIA_AVATAR,
      action: 'entered',
      placeId: 'park',
      placeName: 'Maple Park',
      timestamp: Date.now() - 1000 * 60 * 3,
    },
    {
      id: 'act-2',
      userId: 'user-liam',
      displayName: 'Liam',
      avatarConfig: LIAM_AVATAR,
      action: 'waved',
      placeId: 'park',
      placeName: 'Maple Park',
      text: 'waved to Lily 👋',
      timestamp: Date.now() - 1000 * 60 * 2,
    },
    {
      id: 'act-3',
      userId: 'user-alex',
      displayName: 'Alex',
      avatarConfig: ALEX_AVATAR,
      action: 'emoted',
      placeId: 'park',
      placeName: 'Maple Park',
      emoji: '🌸',
      timestamp: Date.now() - 1000 * 45,
    },
    {
      id: 'act-4',
      userId: 'user-chloe',
      displayName: 'Chloe',
      avatarConfig: CHLOE_AVATAR,
      action: 'moved',
      placeId: 'park',
      placeName: 'Maple Park',
      text: 'sitting by the flower garden',
      timestamp: Date.now() - 1000 * 15,
    },
  ];

  private subscribers: Map<
    WorldPlaceId,
    Set<(event: { type: 'presence' | 'activity' | 'speech' | 'emote'; data: unknown }) => void>
  > = new Map();

  async getPlaces(): Promise<WorldPlaceConfig[]> {
    return Object.values(WORLD_PLACES);
  }

  async getPlace(id: WorldPlaceId): Promise<WorldPlaceConfig> {
    const place = WORLD_PLACES[id];
    if (!place) throw new Error(`Place ${id} not found`);
    return place;
  }

  getCurrentUserAvatar(): AvatarConfig {
    return avatarService.getAvatarOrDefault();
  }

  async getPresence(placeId: WorldPlaceId): Promise<WorldCharacterState[]> {
    const npcs = this.charactersByPlace[placeId] || [];
    const playerAvatar = this.getCurrentUserAvatar();
    const playerPos = this.playerPosition[placeId] || WORLD_PLACES[placeId].spawnPoint;

    const playerState: WorldCharacterState = {
      id: 'current-user',
      username: 'you',
      displayName: playerAvatar.name || 'You',
      avatarConfig: playerAvatar,
      position: { ...playerPos },
      targetPosition: null,
      facing: 'right',
      action: 'idle',
      statusText: 'Exploring the park',
      speech: null,
      emote: null,
      isCurrentUser: true,
      walkSpeed: 130, // snappy player speed
      wanderCooldown: 99999,
    };

    return [playerState, ...npcs];
  }

  async getActivityFeed(): Promise<WorldActivityItem[]> {
    return [...this.activities];
  }

  async movePlayer(placeId: WorldPlaceId, target: Vector2D): Promise<WorldCharacterState> {
    const place = WORLD_PLACES[placeId];
    // Clamp target to walkable area
    const clampedX = Math.max(place.walkableArea.minX, Math.min(place.walkableArea.maxX, target.x));
    const clampedY = Math.max(place.walkableArea.minY, Math.min(place.walkableArea.maxY, target.y));

    this.playerPosition[placeId] = { x: clampedX, y: clampedY };

    const playerAvatar = this.getCurrentUserAvatar();
    return {
      id: 'current-user',
      username: 'you',
      displayName: playerAvatar.name || 'You',
      avatarConfig: playerAvatar,
      position: { x: clampedX, y: clampedY },
      targetPosition: null,
      facing: clampedX >= this.playerPosition[placeId].x ? 'right' : 'left',
      action: 'idle',
      statusText: 'Exploring the park',
      speech: null,
      emote: null,
      isCurrentUser: true,
      walkSpeed: 130,
      wanderCooldown: 99999,
    };
  }

  async sendEmote(placeId: WorldPlaceId, emoji: string): Promise<void> {
    const playerAvatar = this.getCurrentUserAvatar();
    const newAct: WorldActivityItem = {
      id: `act-${Date.now()}`,
      userId: 'current-user',
      displayName: playerAvatar.name || 'You',
      avatarConfig: playerAvatar,
      action: 'emoted',
      placeId,
      placeName: WORLD_PLACES[placeId].name,
      emoji,
      timestamp: Date.now(),
    };
    this.activities.unshift(newAct);
    if (this.activities.length > 20) this.activities.pop();

    this.notify(placeId, { type: 'activity', data: newAct });
  }

  async sendSpeech(placeId: WorldPlaceId, text: string): Promise<void> {
    const playerAvatar = this.getCurrentUserAvatar();
    const newAct: WorldActivityItem = {
      id: `act-${Date.now()}`,
      userId: 'current-user',
      displayName: playerAvatar.name || 'You',
      avatarConfig: playerAvatar,
      action: 'speech',
      placeId,
      placeName: WORLD_PLACES[placeId].name,
      text,
      timestamp: Date.now(),
    };
    this.activities.unshift(newAct);
    if (this.activities.length > 20) this.activities.pop();

    this.notify(placeId, { type: 'activity', data: newAct });
  }

  async waveTo(placeId: WorldPlaceId, targetUserId: string): Promise<void> {
    const playerAvatar = this.getCurrentUserAvatar();
    const target = this.charactersByPlace[placeId]?.find(c => c.id === targetUserId);
    const targetName = target ? target.displayName : 'a friend';

    const newAct: WorldActivityItem = {
      id: `act-${Date.now()}`,
      userId: 'current-user',
      displayName: playerAvatar.name || 'You',
      avatarConfig: playerAvatar,
      action: 'waved',
      placeId,
      placeName: WORLD_PLACES[placeId].name,
      text: `waved to ${targetName} 👋`,
      timestamp: Date.now(),
    };
    this.activities.unshift(newAct);
    if (this.activities.length > 20) this.activities.pop();

    this.notify(placeId, { type: 'activity', data: newAct });
  }

  subscribe(
    placeId: WorldPlaceId,
    callback: (event: { type: 'presence' | 'activity' | 'speech' | 'emote'; data: unknown }) => void
  ): () => void {
    if (!this.subscribers.has(placeId)) {
      this.subscribers.set(placeId, new Set());
    }
    this.subscribers.get(placeId)!.add(callback);

    return () => {
      this.subscribers.get(placeId)?.delete(callback);
    };
  }

  private notify(
    placeId: WorldPlaceId,
    event: { type: 'presence' | 'activity' | 'speech' | 'emote'; data: unknown }
  ) {
    this.subscribers.get(placeId)?.forEach(cb => cb(event));
  }
}

export const mockWorldService = new MockWorldServiceImpl();
