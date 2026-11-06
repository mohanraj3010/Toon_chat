import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  WorldCharacterState,
  WorldPlaceConfig,
  Vector2D,
} from '../types';

interface UseWorldEngineOptions {
  sceneConfig: WorldPlaceConfig;
  initialCharacters: WorldCharacterState[];
  onPlayerMoved?: (target: Vector2D) => void;
  onActivityTriggered?: (action: string, detail?: string) => void;
}

interface WalkRipple {
  x: number;
  y: number;
  id: number;
  timestamp: number;
}

export interface ToonWorldPerfMetrics {
  fps: number;
  avgFps: number;
  minFps: number;
  maxFps: number;
  avgFrameTimeMs: number;
  totalFrames: number;
  sampleDurationMs: number;
  characterCount: number;
}

declare global {
  interface Window {
    __TOONCHAT_WORLD_PERF__?: {
      getMetrics: () => ToonWorldPerfMetrics;
      resetMetrics: () => void;
    };
  }
}

export function useWorldEngine({
  sceneConfig,
  initialCharacters,
  onPlayerMoved,
  onActivityTriggered,
}: UseWorldEngineOptions) {
  // References for mutable loop state to avoid react re-render stalls inside rAF
  const charactersRef = useRef<WorldCharacterState[]>(initialCharacters);

  const [characters, setCharacters] = useState<WorldCharacterState[]>(initialCharacters);
  const [prevInitial, setPrevInitial] = useState<WorldCharacterState[]>(initialCharacters);

  if (initialCharacters !== prevInitial) {
    setPrevInitial(initialCharacters);
    setCharacters(initialCharacters);
  }

  useEffect(() => {
    charactersRef.current = characters;
  }, [characters]);

  const [fps, setFps] = useState<number>(60);
  const [walkRipple, setWalkRipple] = useState<WalkRipple | null>(null);

  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFpsUpdateRef = useRef<number>(0);
  const isTabHiddenRef = useRef<boolean>(typeof document !== 'undefined' ? document.hidden : false);
  const prefersReducedMotionRef = useRef<boolean>(false);

  // Check reduced motion preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotionRef.current = mq.matches;
    const handleChange = (e: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = e.matches;
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  // Handle Page Visibility API: pause when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabHiddenRef.current = document.hidden;
      if (!document.hidden) {
        lastTimeRef.current = performance.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Player click/tap to walk
  const walkPlayerTo = useCallback(
    (point: Vector2D) => {
      const { walkableArea } = sceneConfig;
      // Clamp point inside walkable boundaries
      const targetX = Math.max(walkableArea.minX, Math.min(walkableArea.maxX, point.x));
      const targetY = Math.max(walkableArea.minY, Math.min(walkableArea.maxY, point.y));
      const clampedTarget: Vector2D = { x: targetX, y: targetY };

      // Add walk ripple marker
      setWalkRipple({
        x: targetX,
        y: targetY,
        id: Date.now(),
        timestamp: Date.now(),
      });

      charactersRef.current = charactersRef.current.map(char => {
        if (!char.isCurrentUser) return char;
        const dx = targetX - char.position.x;
        return {
          ...char,
          targetPosition: clampedTarget,
          facing: dx < -2 ? 'left' : dx > 2 ? 'right' : char.facing,
          action: 'walking',
        };
      });

      onPlayerMoved?.(clampedTarget);
    },
    [sceneConfig, onPlayerMoved]
  );

  // Trigger emote for player
  const triggerPlayerEmote = useCallback((emoji: string) => {
    const now = Date.now();
    charactersRef.current = charactersRef.current.map(char => {
      if (!char.isCurrentUser) return char;
      return {
        ...char,
        emote: {
          id: `em-${now}`,
          emoji,
          createdAt: now,
          expiresAt: now + 4000,
        },
      };
    });
    setCharacters([...charactersRef.current]);
  }, []);

  // Trigger speech for player
  const triggerPlayerSpeech = useCallback((text: string) => {
    const now = Date.now();
    charactersRef.current = charactersRef.current.map(char => {
      if (!char.isCurrentUser) return char;
      return {
        ...char,
        speech: {
          id: `sp-${now}`,
          text,
          createdAt: now,
          expiresAt: now + 7000,
        },
      };
    });
    setCharacters([...charactersRef.current]);
  }, []);

  // Wave at a specific friend
  const waveAt = useCallback(
    (targetUserId: string) => {
      const now = Date.now();
      const target = charactersRef.current.find(c => c.id === targetUserId);

      charactersRef.current = charactersRef.current.map(char => {
        if (char.isCurrentUser) {
          return {
            ...char,
            action: 'waving',
            emote: {
              id: `wave-${now}`,
              emoji: '👋',
              createdAt: now,
              expiresAt: now + 3500,
            },
          };
        }
        if (char.id === targetUserId) {
          // Target character turns towards player and waves back after short delay!
          return {
            ...char,
            action: 'waving',
            speech: {
              id: `reply-${now}`,
              text: `Hey! Good to see you! 👋✨`,
              createdAt: now + 600,
              expiresAt: now + 6500,
            },
          };
        }
        return char;
      });

      setCharacters([...charactersRef.current]);
      onActivityTriggered?.('waved', target?.displayName);

      // Revert wave action to idle after 2.5s
      setTimeout(() => {
        charactersRef.current = charactersRef.current.map(char => {
          if (char.action === 'waving') {
            return { ...char, action: 'idle' };
          }
          return char;
        });
      }, 2500);
    },
    [onActivityTriggered]
  );

  // Send emote to another character
  const emoteAt = useCallback(
    (targetUserId: string, emoji: string) => {
      const now = Date.now();
      const target = charactersRef.current.find(c => c.id === targetUserId);

      charactersRef.current = charactersRef.current.map(char => {
        if (char.isCurrentUser) {
          return {
            ...char,
            emote: {
              id: `em-${now}`,
              emoji,
              createdAt: now,
              expiresAt: now + 3500,
            },
          };
        }
        if (char.id === targetUserId) {
          return {
            ...char,
            emote: {
              id: `em-react-${now}`,
              emoji: '✨',
              createdAt: now + 800,
              expiresAt: now + 4000,
            },
          };
        }
        return char;
      });

      setCharacters([...charactersRef.current]);
      onActivityTriggered?.('emoted', `${emoji} to ${target?.displayName}`);
    },
    [onActivityTriggered]
  );

  // Performance tracking state for browser verification
  const perfMetricsRef = useRef({
    startTime: 0,
    frameCount: 0,
    frameTimes: [] as number[],
    fpsSamples: [] as number[],
    minFps: 60,
    maxFps: 60,
  });

  // Expose window.__TOONCHAT_WORLD_PERF__ for automated browser verification
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (perfMetricsRef.current.startTime === 0) {
      perfMetricsRef.current.startTime = performance.now();
    }
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = performance.now();
      lastFpsUpdateRef.current = performance.now();
    }

    window.__TOONCHAT_WORLD_PERF__ = {
      getMetrics: () => {
        const perf = perfMetricsRef.current;
        const now = performance.now();
        const startTime = perf.startTime || now;
        const duration = Math.max(1, now - startTime);
        const avgFps = perf.fpsSamples.length > 0
          ? Math.round(perf.fpsSamples.reduce((a, b) => a + b, 0) / perf.fpsSamples.length)
          : Math.round((perf.frameCount * 1000) / duration);
        const avgFrameTime = perf.frameTimes.length > 0
          ? Number((perf.frameTimes.reduce((a, b) => a + b, 0) / perf.frameTimes.length).toFixed(2))
          : 16.6;

        return {
          fps: Math.round(Math.min(60, avgFps)),
          avgFps: Math.round(Math.min(60, avgFps)),
          minFps: Math.round(perf.minFps),
          maxFps: Math.round(Math.min(60, perf.maxFps)),
          avgFrameTimeMs: avgFrameTime,
          totalFrames: perf.frameCount,
          sampleDurationMs: Math.round(duration),
          characterCount: charactersRef.current.length,
        };
      },
      resetMetrics: () => {
        perfMetricsRef.current = {
          startTime: performance.now(),
          frameCount: 0,
          frameTimes: [],
          fpsSamples: [],
          minFps: 60,
          maxFps: 60,
        };
      },
    };

    return () => {
      delete window.__TOONCHAT_WORLD_PERF__;
    };
  }, []);

  // Single rAF Simulation Loop
  useEffect(() => {
    let isCancelled = false;

    const tick = (now: number) => {
      if (isCancelled) return;

      const rawDt = (now - lastTimeRef.current) / 1000;
      const frameDeltaMs = now - lastTimeRef.current;
      lastTimeRef.current = now;
      // Cap dt to prevent warp-speed movement if tab was paused
      const dt = Math.min(rawDt, 0.1);

      // Record performance measurements
      frameCountRef.current++;
      const perf = perfMetricsRef.current;
      perf.frameCount++;
      if (frameDeltaMs > 0 && frameDeltaMs < 100) {
        perf.frameTimes.push(frameDeltaMs);
        if (perf.frameTimes.length > 240) perf.frameTimes.shift();
      }

      // Measure FPS every 500ms
      if (now - lastFpsUpdateRef.current >= 500) {
        const measuredFps = Math.round(
          (frameCountRef.current * 1000) / (now - lastFpsUpdateRef.current)
        );
        const cappedFps = Math.min(measuredFps, 60);
        setFps(cappedFps);
        perf.fpsSamples.push(cappedFps);
        if (perf.fpsSamples.length > 60) perf.fpsSamples.shift();
        if (cappedFps < perf.minFps && cappedFps > 10) perf.minFps = cappedFps;
        if (cappedFps > perf.maxFps) perf.maxFps = cappedFps;

        frameCountRef.current = 0;
        lastFpsUpdateRef.current = now;
      }

      // If tab is hidden or paused, skip physics update
      if (!isTabHiddenRef.current) {
        let hasChanges = false;
        const currentList = charactersRef.current;
        const updatedList: WorldCharacterState[] = [];
        const { walkableArea } = sceneConfig;

        for (let i = 0; i < currentList.length; i++) {
          const char = currentList[i];
          let updated = { ...char };

          // 1. Check expired speech & emotes
          if (updated.speech && updated.speech.expiresAt <= now) {
            updated.speech = null;
            hasChanges = true;
          }
          if (updated.emote && updated.emote.expiresAt <= now) {
            updated.emote = null;
            hasChanges = true;
          }

          // 2. Handle Autonomous NPC slow wander
          if (!updated.isCurrentUser) {
            updated.wanderCooldown -= dt;
            if (updated.wanderCooldown <= 0 && !updated.targetPosition && updated.action !== 'waving') {
              // Time to wander to a nearby spot!
              const wanderRadius = 60 + Math.random() * 80;
              const angle = Math.random() * Math.PI * 2;
              const nextX = Math.max(
                walkableArea.minX + 20,
                Math.min(walkableArea.maxX - 20, updated.position.x + Math.cos(angle) * wanderRadius)
              );
              const nextY = Math.max(
                walkableArea.minY + 20,
                Math.min(walkableArea.maxY - 20, updated.position.y + Math.sin(angle) * wanderRadius)
              );

              updated.targetPosition = { x: nextX, y: nextY };
              updated.facing = nextX < updated.position.x ? 'left' : 'right';
              updated.action = 'walking';
              updated.wanderCooldown = 8 + Math.random() * 12; // Next wander in 8-20s
              hasChanges = true;
            }
          }

          // 3. Movement towards target position
          if (updated.targetPosition) {
            const dx = updated.targetPosition.x - updated.position.x;
            const dy = updated.targetPosition.y - updated.position.y;
            const dist = Math.hypot(dx, dy);
            const step = updated.walkSpeed * dt;

            if (dist <= step || dist < 1.5) {
              // Arrived at destination
              updated.position = { ...updated.targetPosition };
              updated.targetPosition = null;
              if (updated.action === 'walking') {
                updated.action = 'idle';
              }
              hasChanges = true;
            } else {
              // Move along vector
              const nx = dx / dist;
              const ny = dy / dist;
              updated.position = {
                x: updated.position.x + nx * step,
                y: updated.position.y + ny * step,
              };
              updated.facing = dx < -1 ? 'left' : dx > 1 ? 'right' : updated.facing;
              updated.action = 'walking';
              hasChanges = true;
            }
          }

          updatedList.push(updated);
        }

        // Always keep internal loop ref updated so wanderCooldowns persist
        charactersRef.current = updatedList;

        if (hasChanges) {
          // Sort by Y position for proper 2.5D visual layering
          const sorted = [...updatedList].sort((a, b) => a.position.y - b.position.y);
          setCharacters(sorted);
        }
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      isCancelled = true;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [sceneConfig]);

  // Clean up walk ripple after 1.5s
  useEffect(() => {
    if (!walkRipple) return;
    const timer = setTimeout(() => setWalkRipple(null), 1400);
    return () => clearTimeout(timer);
  }, [walkRipple]);

  return {
    characters,
    fps,
    walkRipple,
    walkPlayerTo,
    triggerPlayerEmote,
    triggerPlayerSpeech,
    waveAt,
    emoteAt,
  };
}
