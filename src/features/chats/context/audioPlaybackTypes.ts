import { createContext } from 'react';

export type PlaybackSpeed = 1 | 1.5 | 2;

export interface AudioPlaybackContextValue {
  activeAudioId: string | null;
  playbackSpeed: PlaybackSpeed;
  playAudio: (id: string) => void;
  pauseAudio: (id: string) => void;
  stopAll: () => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  cyclePlaybackSpeed: () => PlaybackSpeed;
  registerPlayer: (id: string, pauseCallback: () => void) => () => void;
}

export const AudioPlaybackContext = createContext<AudioPlaybackContextValue | null>(null);

// Safe fallback for components rendered outside of a Provider
export const fallbackCoordinator: AudioPlaybackContextValue = {
  activeAudioId: null,
  playbackSpeed: 1,
  playAudio: () => {},
  pauseAudio: () => {},
  stopAll: () => {},
  setPlaybackSpeed: () => {},
  cyclePlaybackSpeed: () => 1,
  registerPlayer: () => () => {},
};

