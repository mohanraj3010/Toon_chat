import type {
  WorldPlaceConfig,
  WorldPlaceId,
  WorldCharacterState,
  WorldActivityItem,
  Vector2D,
} from '../types';

export interface WorldService {
  getPlaces(): Promise<WorldPlaceConfig[]>;
  getPlace(id: WorldPlaceId): Promise<WorldPlaceConfig>;
  getPresence(placeId: WorldPlaceId): Promise<WorldCharacterState[]>;
  getActivityFeed(): Promise<WorldActivityItem[]>;
  movePlayer(placeId: WorldPlaceId, target: Vector2D): Promise<WorldCharacterState>;
  sendEmote(placeId: WorldPlaceId, emoji: string): Promise<void>;
  sendSpeech(placeId: WorldPlaceId, text: string): Promise<void>;
  waveTo(placeId: WorldPlaceId, targetUserId: string): Promise<void>;
  subscribe(
    placeId: WorldPlaceId,
    callback: (event: {
      type: 'presence' | 'activity' | 'speech' | 'emote';
      data: unknown;
    }) => void
  ): () => void;
}
