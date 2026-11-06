import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Trash2, Pause, Play, Square, Send, AlertTriangle, X } from 'lucide-react';
import type { UseVoiceRecorderReturn } from '../hooks/useVoiceRecorder';
import styles from './VoiceRecorder.module.css';
import { cn } from '@/shared/lib/utils';

export interface VoiceMetadata {
  durationMs: number;
  mimeType: string;
  baseMimeType: string;
  sizeBytes: number;
}

export interface VoiceRecorderBarProps {
  recorder: UseVoiceRecorderReturn;
  onSend?: (blob: Blob, meta: VoiceMetadata) => void;
  onCancel?: () => void;
  onDismissError?: () => void;
}

const TOTAL_LEVEL_BARS = 28;

function formatMmSs(secondsTotal: number): string {
  const s = Math.max(0, Math.floor(secondsTotal));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export const VoiceRecorderBar: React.FC<VoiceRecorderBarProps> = ({
  recorder,
  onSend,
  onCancel,
  onDismissError,
}) => {
  const {
    state,
    recordingDuration,
    formattedDuration,
    audioLevel,
    audioBlob,
    audioUrl,
    error,
    permissionStatus,
    limitReached,
    isWarningThreshold,
    isRequestingPermission,
    waveform,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    startRecording,
    clearError,
    durationMs,
  } = recorder;

  // Audio element state for preview
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const stopButtonRef = useRef<HTMLButtonElement | null>(null);

  // Screen reader polite announcement text
  const announcement = useMemo(() => {
    if (state === 'recording') return 'Recording voice note. Use Escape to cancel.';
    if (state === 'paused') return 'Recording paused.';
    if (state === 'previewing') return `Recording finished. Length: ${formattedDuration}. Preview ready.`;
    return '';
  }, [state, formattedDuration]);

  const handleCancel = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setPlaybackTime(0);
    cancelRecording();
    onCancel?.();
  }, [cancelRecording, onCancel]);

  // Auto-focus Stop button when entering recording state
  useEffect(() => {
    if (state === 'recording') {
      stopButtonRef.current?.focus();
    }
  }, [state]);

  // Handle Escape key to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (state === 'recording' || state === 'paused' || state === 'previewing')) {
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, handleCancel]);

  // Handle preview playback
  const togglePlayPreview = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;

    if (isPlaying) {
      el.pause();
    } else {
      el.play().catch((err) => {
        console.warn('Playback failed:', err);
      });
    }
  }, [isPlaying]);

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setPlaybackTime(audioRef.current.currentTime);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setPlaybackTime(0);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !durationMs) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSeconds = (durationMs / 1000) * ratio;
    el.currentTime = targetSeconds;
    setPlaybackTime(targetSeconds);
  };

  const handleSend = () => {
    if (!audioBlob) return;
    const mimeType = audioBlob.type || 'audio/webm';
    const baseMimeType = mimeType.split(';')[0].trim().toLowerCase();

    const meta: VoiceMetadata = {
      durationMs,
      mimeType,
      baseMimeType,
      sizeBytes: audioBlob.size,
    };

    onSend?.(audioBlob, meta);
  };

  // Generate 28 animated waveform bars based on real-time vocal frequency data and level
  const waveformBars = useMemo(() => {
    if (state === 'paused') {
      return new Array(TOTAL_LEVEL_BARS).fill(6);
    }
    if (waveform && waveform.length === TOTAL_LEVEL_BARS) {
      return waveform;
    }
    // Fallback: smoothed curve calculation
    const bars: number[] = [];
    for (let i = 0; i < TOTAL_LEVEL_BARS; i++) {
      const centerFactor = 1 - Math.abs(i - TOTAL_LEVEL_BARS / 2) / (TOTAL_LEVEL_BARS / 2);
      const dynamicMultiplier = 0.4 + centerFactor * 0.6;
      const variation = Math.sin((i + recordingDuration * 8) * 0.4) * 0.2;
      const computed = Math.max(
        4,
        Math.min(28, 4 + (audioLevel * dynamicMultiplier + variation) * 24)
      );
      bars.push(computed);
    }
    return bars;
  }, [waveform, state, recordingDuration, audioLevel]);

  const progressPercent = durationMs > 0 ? Math.min(100, (playbackTime / (durationMs / 1000)) * 100) : 0;

  // Permission / Denied banner
  const isDenied = permissionStatus === 'denied' || error?.code === 'denied';
  const showBanner = Boolean(error || isDenied);

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {/* Screen reader live region */}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {announcement}
      </div>

      {/* Permission / Error Banner */}
      {showBanner && (
        <div className={styles['permission-banner']} role="alert">
          <div className={styles['banner-header']}>
            <div className={styles['banner-title-group']}>
              <AlertTriangle size={18} color="var(--color-danger, #ef4444)" />
              <span>Microphone Access Needed</span>
            </div>
            <button
              type="button"
              onClick={() => {
                clearError();
                onDismissError?.();
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
              aria-label="Dismiss error banner"
            >
              <X size={16} />
            </button>
          </div>

          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-base, #1e293b)' }}>
            {error?.message ||
              'ToonChat needs microphone access so your friends can hear your cartoon voice!'}
          </p>

          <ol className={styles['banner-steps']}>
            <li><strong>Chrome/Edge:</strong> Click the lock or tune icon in the address bar &rarr; Microphone &rarr; Allow.</li>
            <li><strong>Firefox:</strong> Click the microphone icon next to the URL &rarr; Clear block &rarr; Reload.</li>
            <li><strong>Safari:</strong> Settings &rarr; Websites &rarr; Microphone &rarr; Allow.</li>
          </ol>

          <div className={styles['banner-actions']}>
            <button
              type="button"
              className={styles['banner-try-again']}
              onClick={() => startRecording()}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Main Bar */}
      {(state === 'recording' || state === 'paused' || isRequestingPermission) && (
        <div className={styles['voice-recorder-bar']} role="region" aria-label="Voice recorder">
          {/* Status Indicator & Timer */}
          <div className={styles['recording-indicator']}>
            <div
              className={
                state === 'recording' || (isRequestingPermission && state === 'idle')
                  ? styles['pulsing-dot']
                  : styles['paused-dot']
              }
              aria-hidden="true"
            />
            <span
              className={cn(
                styles['recording-timer'],
                isWarningThreshold && styles['timer-warning']
              )}
              aria-label={`Recording duration: ${isRequestingPermission && state === 'idle' ? 'Connecting mic' : formattedDuration} of 2 minutes maximum`}
            >
              {isRequestingPermission && state === 'idle' ? 'Connecting mic...' : `${formattedDuration} / 02:00`}
            </span>
          </div>

          {/* Waveform Level Meter */}
          <div
            className={styles['level-meter-container']}
            aria-hidden="true"
            title={state === 'paused' ? 'Paused' : 'Recording audio'}
          >
            {waveformBars.map((barHeight, idx) => (
              <div
                key={idx}
                className={cn(
                  styles['level-bar'],
                  state === 'paused' && styles['level-bar-paused']
                )}
                style={{ height: `${barHeight}px` }}
              />
            ))}
          </div>

          {/* Action Controls */}
          <div className={styles['action-controls']}>
            {/* Cancel (Trash) Button */}
            <button
              type="button"
              className={cn(styles['recorder-btn'], styles['btn-cancel'])}
              onClick={handleCancel}
              title="Cancel recording (Esc)"
              aria-label="Cancel recording"
            >
              <Trash2 size={18} />
            </button>

            {/* Pause / Resume Button */}
            {state === 'recording' ? (
              <button
                type="button"
                className={styles['recorder-btn']}
                onClick={pauseRecording}
                title="Pause recording"
                aria-label="Pause recording"
              >
                <Pause size={18} />
              </button>
            ) : (
              <button
                type="button"
                className={styles['recorder-btn']}
                onClick={resumeRecording}
                title="Resume recording"
                aria-label="Resume recording"
              >
                <Play size={18} />
              </button>
            )}

            {/* Stop & Preview Button */}
            <button
              ref={stopButtonRef}
              type="button"
              className={cn(styles['recorder-btn'], styles['btn-stop'])}
              onClick={stopRecording}
              title="Stop and preview recording"
              aria-label="Stop recording and preview"
            >
              <Square size={16} fill="currentColor" />
            </button>
          </div>
        </div>
      )}

      {/* Preview State */}
      {state === 'previewing' && (
        <div className={styles['voice-recorder-bar']} role="region" aria-label="Voice note preview">
          {/* Hidden audio element */}
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={handleAudioTimeUpdate}
              onEnded={handleAudioEnded}
            />
          )}

          {/* Play / Pause button */}
          <button
            type="button"
            className={styles['recorder-btn']}
            onClick={togglePlayPreview}
            title={isPlaying ? 'Pause preview' : 'Play preview'}
            aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          {/* Progress Slider Track */}
          <div className={styles['preview-track-container']}>
            <div
              className={styles['preview-slider']}
              onClick={handleSeek}
              role="slider"
              tabIndex={0}
              aria-label="Voice note playback progress"
              aria-valuemin={0}
              aria-valuemax={Math.round(durationMs / 1000)}
              aria-valuenow={Math.round(playbackTime)}
            >
              <div
                className={styles['preview-slider-fill']}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Timer */}
            <span className={styles['recording-timer']}>
              {formatMmSs(playbackTime)} / {formattedDuration}
            </span>

            {limitReached && (
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  backgroundColor: 'var(--color-brand-100, #ffedd5)',
                  color: 'var(--color-brand-700, #c2410c)',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  whiteSpace: 'nowrap',
                }}
              >
                Max 2:00
              </span>
            )}
          </div>

          {/* Action Controls */}
          <div className={styles['action-controls']}>
            {/* Discard button */}
            <button
              type="button"
              className={cn(styles['recorder-btn'], styles['btn-cancel'])}
              onClick={handleCancel}
              title="Discard voice message (Esc)"
              aria-label="Discard voice message"
            >
              <Trash2 size={18} />
            </button>

            {/* Send stub button */}
            <button
              type="button"
              className={cn(styles['recorder-btn'], styles['btn-send'])}
              onClick={handleSend}
              disabled={!onSend}
              title={
                onSend
                  ? 'Send voice message'
                  : 'Voice sending is coming in the next update'
              }
              aria-label={
                onSend
                  ? 'Send voice message'
                  : 'Voice sending is coming in the next update'
              }
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
