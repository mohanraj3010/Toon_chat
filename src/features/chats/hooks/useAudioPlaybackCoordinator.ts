import { useContext } from 'react';
import {
  AudioPlaybackContext,
  fallbackCoordinator,
  type AudioPlaybackContextValue,
  type PlaybackSpeed,
} from '../context/audioPlaybackTypes';

export function useAudioPlaybackCoordinator(): AudioPlaybackContextValue {
  const ctx = useContext(AudioPlaybackContext);
  return ctx || fallbackCoordinator;
}

export type { AudioPlaybackContextValue, PlaybackSpeed };
