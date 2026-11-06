import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import { formatBytes } from '../hooks/useMediaUpload';
import { useAudioPlaybackCoordinator } from '../hooks/useAudioPlaybackCoordinator';
import { useResolvedMediaUrl, isDirectMediaUrl } from '../hooks/useResolvedMediaUrl';
import styles from './VoiceMessage.module.css';

export interface VoiceMessageProps {
  messageId?: string;
  mediaId?: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  duration?: string;
  isMine?: boolean;
  status?: 'uploading' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  onRetry?: () => void;
}

// Preset cartoon waveform heights (in px) for visual charm
const WAVEFORM_HEIGHTS = [8, 14, 20, 12, 24, 16, 26, 18, 12, 22, 19, 14, 22, 17, 10, 16, 12, 8];

function formatSeconds(secTotal: number): string {
  if (isNaN(secTotal) || secTotal < 0) return '00:00';
  const s = Math.floor(secTotal);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

function parseDurationSeconds(durationStr?: string): number {
  if (!durationStr) return 0;
  const parts = durationStr.split(':').map((p) => parseInt(p, 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

export const VoiceMessage: React.FC<VoiceMessageProps> = ({
  messageId,
  mediaId,
  mediaUrl,
  fileSize,
  duration,
  isMine = false,
  status,
  onRetry,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [metadataDuration, setMetadataDuration] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const hasAttemptedRefreshRef = useRef<boolean>(false);

  // Playback coordination across message list (single active player)
  const coordinator = useAudioPlaybackCoordinator();
  const playerId = messageId || mediaId || mediaUrl || 'voice-msg-player';

  // Signed URL resolution & auto-refresh
  const {
    resolvedUrl,
    isLoading: isLoadingUrl,
    refreshUrl,
  } = useResolvedMediaUrl(mediaId, mediaUrl);

  const effectiveUrl = resolvedUrl || (isDirectMediaUrl(mediaUrl) ? mediaUrl : null);

  // Compute total duration in seconds with robust fallbacks
  const totalDurationSec = useMemo(() => {
    if (metadataDuration && metadataDuration > 0) {
      return metadataDuration;
    }
    const parsed = parseDurationSeconds(duration);
    if (parsed > 0) {
      return parsed;
    }
    // Fallback: estimate ~4KB per second for standard voice opus, or 15s default
    if (fileSize && fileSize > 0) {
      const estimated = Math.round(fileSize / 4000);
      return Math.max(1, Math.min(120, estimated));
    }
    return 15;
  }, [duration, metadataDuration, fileSize]);

  const displayDuration = useMemo(() => {
    return duration || formatSeconds(totalDurationSec);
  }, [duration, totalDurationSec]);

  // Register player with the audio coordinator so starting another voice note pauses this one
  useEffect(() => {
    const unregister = coordinator.registerPlayer(playerId, () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    });
    return unregister;
  }, [coordinator, playerId]);

  // Synchronize playback speed with coordinator
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = coordinator.playbackSpeed;
    }
  }, [coordinator.playbackSpeed]);

  // Clean up audio on unmount
  useEffect(() => {
    const audioElement = audioRef.current;
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, []);

  // Update duration when native audio metadata loads
  const handleLoadedMetadata = () => {
    if (audioRef.current && isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
      setMetadataDuration(audioRef.current.duration);
    }
  };

  // Play / Pause toggle
  const togglePlay = useCallback(async () => {
    if (status === 'uploading' || status === 'failed') return;

    let activeUrl = effectiveUrl;
    if (!activeUrl && mediaId) {
      activeUrl = await refreshUrl();
      if (!activeUrl) {
        setAudioError('Could not load voice note');
        return;
      }
    }

    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      coordinator.pauseAudio(playerId);
      setIsPlaying(false);
    } else {
      setAudioError(null);
      try {
        if (activeUrl && audio.src !== activeUrl) {
          audio.src = activeUrl;
        }
        audio.playbackRate = coordinator.playbackSpeed;
        await audio.play();
        coordinator.playAudio(playerId);
        setIsPlaying(true);
      } catch (err) {
        console.warn('Audio playback failed:', err);
        // Attempt one auto-refresh if signed URL might have expired
        if (mediaId && !hasAttemptedRefreshRef.current) {
          hasAttemptedRefreshRef.current = true;
          const freshUrl = await refreshUrl(true);
          if (freshUrl && audio) {
            try {
              audio.src = freshUrl;
              audio.playbackRate = coordinator.playbackSpeed;
              await audio.play();
              coordinator.playAudio(playerId);
              setIsPlaying(true);
              return;
            } catch {
              // fall through to error
            }
          }
        }
        setAudioError('Playback failed');
        setIsPlaying(false);
      }
    }
  }, [isPlaying, playerId, effectiveUrl, mediaId, status, coordinator, refreshUrl]);

  // Error recovery handler when HTMLAudioElement triggers error event
  const handleAudioError = async () => {
    if (mediaId && !hasAttemptedRefreshRef.current) {
      hasAttemptedRefreshRef.current = true;
      const freshUrl = await refreshUrl(true);
      if (freshUrl && audioRef.current) {
        audioRef.current.src = freshUrl;
        if (isPlaying) {
          audioRef.current.play().catch(() => {
            setAudioError('Playback failed');
            setIsPlaying(false);
          });
        }
        return;
      }
    }
    setAudioError('Audio playback failed');
    setIsPlaying(false);
  };

  const handleTimeUpdate = () => {
    if (!isScrubbing && audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    coordinator.pauseAudio(playerId);
  };

  // Scrubbing & Seeking along waveform
  const computeSeekSeconds = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || totalDurationSec <= 0) return 0;

      const rect = track.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      return ratio * totalDurationSec;
    },
    [totalDurationSec]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (status === 'uploading' || status === 'failed') return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if pointer capture unsupported
    }
    setIsScrubbing(true);
    const targetSeconds = computeSeekSeconds(e.clientX);
    setCurrentTime(targetSeconds);
    if (audioRef.current) {
      audioRef.current.currentTime = targetSeconds;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    const targetSeconds = computeSeekSeconds(e.clientX);
    setCurrentTime(targetSeconds);
    if (audioRef.current) {
      audioRef.current.currentTime = targetSeconds;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsScrubbing(false);
    const targetSeconds = computeSeekSeconds(e.clientX);
    setCurrentTime(targetSeconds);
    if (audioRef.current) {
      audioRef.current.currentTime = targetSeconds;
    }
  };

  const isUploading = status === 'uploading';
  const isFailed = status === 'failed';

  // Highlight bars up to current playback / scrubbed fraction
  const currentRatio = totalDurationSec > 0 ? Math.min(1, currentTime / totalDurationSec) : 0;
  const activeBarIndex = Math.floor(currentRatio * WAVEFORM_HEIGHTS.length);

  return (
    <div
      className={styles['voice-card']}
      role="region"
      aria-label={`Voice message, duration ${displayDuration}`}
    >
      <audio
        ref={audioRef}
        src={effectiveUrl || undefined}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleAudioError}
      />

      <div className={styles['voice-main-row']}>
        {/* Play/Pause / Uploading button */}
        <button
          type="button"
          onClick={togglePlay}
          disabled={isUploading || isFailed || isLoadingUrl}
          className={`${styles['play-btn']} ${isMine ? styles['play-btn-mine'] : ''}`}
          aria-label={
            isUploading
              ? 'Uploading voice note'
              : isPlaying
              ? 'Pause voice note'
              : 'Play voice note'
          }
          title={
            isUploading
              ? 'Uploading voice note...'
              : isPlaying
              ? 'Pause'
              : 'Play'
          }
        >
          {isUploading || isLoadingUrl ? (
            <Loader2 size={18} className={styles.spin} />
          ) : isPlaying ? (
            <Pause size={18} />
          ) : (
            <Play size={18} style={{ marginLeft: 2 }} />
          )}
        </button>

        {/* Waveform Visualization track with Scrubbing */}
        <div
          ref={trackRef}
          className={`${styles['waveform-track']} ${
            isScrubbing ? styles['waveform-track-scrubbing'] : ''
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          role="slider"
          aria-valuenow={Math.round(currentTime)}
          aria-valuemin={0}
          aria-valuemax={Math.round(totalDurationSec)}
          aria-label="Audio timeline seeker"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' && audioRef.current) {
              const next = Math.min(totalDurationSec, currentTime + 2);
              audioRef.current.currentTime = next;
              setCurrentTime(next);
            } else if (e.key === 'ArrowLeft' && audioRef.current) {
              const next = Math.max(0, currentTime - 2);
              audioRef.current.currentTime = next;
              setCurrentTime(next);
            } else if (e.key === 'Home' && audioRef.current) {
              audioRef.current.currentTime = 0;
              setCurrentTime(0);
            } else if (e.key === 'End' && audioRef.current) {
              audioRef.current.currentTime = totalDurationSec;
              setCurrentTime(totalDurationSec);
            }
          }}
        >
          {WAVEFORM_HEIGHTS.map((height, i) => {
            const isPlayed = i <= activeBarIndex;
            const isCurrentlyActive = isPlaying && !isScrubbing && i === activeBarIndex;
            return (
              <div
                key={i}
                className={`${styles['waveform-bar']} ${
                  isPlayed ? styles['waveform-bar-played'] : ''
                } ${isCurrentlyActive ? styles['waveform-bar-playing'] : ''}`}
                style={{
                  height: `${height}px`,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Voice Footer: Timer, Speed Toggle & Meta */}
      <div className={styles['voice-footer']}>
        {isUploading ? (
          <span className={styles['uploading-badge']}>
            <Loader2 size={12} className={styles.spin} />
            Uploading voice note... 🎈
          </span>
        ) : isFailed ? (
          <div className={styles['failed-row']}>
            <span className={styles['failed-text']}>
              <AlertCircle size={12} />
              Failed
            </span>
            {onRetry && (
              <button
                type="button"
                className={styles['retry-button']}
                onClick={onRetry}
                title="Retry upload"
              >
                <RotateCcw size={10} />
                Retry
              </button>
            )}
          </div>
        ) : (
          <>
            <span className={styles['voice-timer']}>
              {isPlaying || isScrubbing
                ? `${formatSeconds(currentTime)} / ${displayDuration}`
                : displayDuration}
            </span>

            <div className={styles['voice-meta-right']}>
              {/* Playback speed toggle button */}
              <button
                type="button"
                onClick={coordinator.cyclePlaybackSpeed}
                className={`${styles['speed-btn']} ${isMine ? styles['speed-btn-mine'] : ''}`}
                title={`Playback speed: ${coordinator.playbackSpeed}x. Click to change.`}
                aria-label={`Playback speed ${coordinator.playbackSpeed}x`}
              >
                {coordinator.playbackSpeed}x
              </button>

              {fileSize && fileSize > 0 && <span>{formatBytes(fileSize)}</span>}
              {audioError && <span style={{ color: '#ef4444' }}>{audioError}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
