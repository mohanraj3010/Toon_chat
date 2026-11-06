import type { AvatarConfig } from '@/features/avatar/types';

export type WorldPlaceId = 'park' | 'cafe' | 'plaza';

export interface Vector2D {
  x: number;
  y: number;
}

export interface WorldHotspot {
  id: string;
  name: string;
  position: Vector2D;
  radius?: number;
  icon: string;
  tooltip: string;
  action: 'visit_place' | 'interact' | 'sit' | 'inspect';
  targetPlaceId?: WorldPlaceId;
  message?: string;
}

export interface WalkableArea {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  polygons?: Vector2D[][];
}

export interface WorldPlaceConfig {
  id: WorldPlaceId;
  name: string;
  subtitle: string;
  description: string;
  tag: string;
  themeColor: string;
  skyGradient: [string, string];
  bounds: { width: number; height: number };
  walkableArea: WalkableArea;
  spawnPoint: Vector2D;
  hotspots: WorldHotspot[];
  weatherMood: 'sunny' | 'cozy' | 'breezy';
}

export type CharacterAction = 'idle' | 'walking' | 'waving' | 'sitting';

export interface WorldCharacterSpeech {
  id: string;
  text: string;
  createdAt: number;
  expiresAt: number;
}

export interface WorldCharacterEmote {
  id: string;
  emoji: string;
  createdAt: number;
  expiresAt: number;
}

export interface WorldCharacterState {
  id: string;
  username: string;
  displayName: string;
  avatarConfig: AvatarConfig;
  position: Vector2D;
  targetPosition: Vector2D | null;
  facing: 'left' | 'right';
  action: CharacterAction;
  statusText: string;
  speech: WorldCharacterSpeech | null;
  emote: WorldCharacterEmote | null;
  isCurrentUser: boolean;
  walkSpeed: number; // units per second
  wanderCooldown: number; // seconds until next wander
  lastWavedUserId?: string;
}

export type ActivityActionType = 'entered' | 'left' | 'moved' | 'emoted' | 'waved' | 'speech';

export interface WorldActivityItem {
  id: string;
  userId: string;
  displayName: string;
  avatarConfig?: AvatarConfig;
  action: ActivityActionType;
  placeId: WorldPlaceId;
  placeName: string;
  text?: string;
  emoji?: string;
  timestamp: number;
}

export interface RadialMenuPosition {
  x: number;
  y: number;
  character: WorldCharacterState;
}
