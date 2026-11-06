import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import {
  AudioPlaybackContext,
  type AudioPlaybackContextValue,
  type PlaybackSpeed,
} from './audioPlaybackTypes';

interface AudioPlaybackProviderProps {
  children: ReactNode;
  conversationId?: string;
}

export const AudioPlaybackProvider: React.FC<AudioPlaybackProviderProps> = ({
  children,
  conversationId,
}) => {
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeedState] = useState<PlaybackSpeed>(1);

  // Map of registered player pause callbacks
  const registeredPlayersRef = useRef<Map<string, () => void>>(new Map());
  const activeIdRef = useRef<string | null>(null);

  // Keep activeIdRef in sync with state
  useEffect(() => {
    activeIdRef.current = activeAudioId;
  }, [activeAudioId]);

  const stopAll = useCallback(() => {
    if (activeIdRef.current) {
      const pauseFn = registeredPlayersRef.current.get(activeIdRef.current);
      if (pauseFn) {
        try {
          pauseFn();
        } catch {
          // ignore error in pause callback
        }
      }
    }
    setActiveAudioId(null);
    activeIdRef.current = null;
  }, []);

  // Stop all playing audio whenever the active conversation changes or unmounts
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [conversationId, stopAll]);

  const registerPlayer = useCallback((id: string, pauseCallback: () => void) => {
    registeredPlayersRef.current.set(id, pauseCallback);
    return () => {
      registeredPlayersRef.current.delete(id);
      if (activeIdRef.current === id) {
        setActiveAudioId(null);
        activeIdRef.current = null;
      }
    };
  }, []);

  const playAudio = useCallback((id: string) => {
    const currentActive = activeIdRef.current;
    if (currentActive && currentActive !== id) {
      const prevPauseFn = registeredPlayersRef.current.get(currentActive);
      if (prevPauseFn) {
        try {
          prevPauseFn();
        } catch {
          // ignore error in previous pause callback
        }
      }
    }
    setActiveAudioId(id);
    activeIdRef.current = id;
  }, []);

  const pauseAudio = useCallback((id: string) => {
    if (activeIdRef.current === id) {
      setActiveAudioId(null);
      activeIdRef.current = null;
    }
  }, []);

  const setPlaybackSpeed = useCallback((speed: PlaybackSpeed) => {
    setPlaybackSpeedState(speed);
  }, []);

  const cyclePlaybackSpeed = useCallback((): PlaybackSpeed => {
    let next: PlaybackSpeed = 1;
    setPlaybackSpeedState((prev) => {
      if (prev === 1) next = 1.5;
      else if (prev === 1.5) next = 2;
      else next = 1;
      return next;
    });
    return next;
  }, []);

  const value: AudioPlaybackContextValue = {
    activeAudioId,
    playbackSpeed,
    playAudio,
    pauseAudio,
    stopAll,
    setPlaybackSpeed,
    cyclePlaybackSpeed,
    registerPlayer,
  };

  return (
    <AudioPlaybackContext.Provider value={value}>
      {children}
    </AudioPlaybackContext.Provider>
  );
};
