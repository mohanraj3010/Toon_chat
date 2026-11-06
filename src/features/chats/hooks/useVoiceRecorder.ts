import { useState, useRef, useEffect, useCallback } from 'react';
import {
  isVoiceRecordingSupported,
  pickRecordingMimeType,
  getMicrophonePermissionStatus,
  subscribeToMicrophonePermission,
  mapGetUserMediaError,
  formatDuration,
  AudioLevelMeter,
  MAX_DURATION_SECONDS,
  WARNING_AT_SECONDS,
  MIN_DURATION_MS,
  CHUNK_TIMESLICE_MS,
  AUDIO_BITS_PER_SECOND,
  type PermissionStatusType,
  type VoiceRecorderError,
} from '../utils/audioRecorder';
import { showToast } from '@/shared/ui/Toast';

export type VoiceRecorderState = 'idle' | 'recording' | 'paused' | 'previewing';

export interface UseVoiceRecorderReturn {
  state: VoiceRecorderState;
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  cancelRecording: () => void;
  recordingDuration: number;
  formattedDuration: string;
  audioLevel: number;
  waveform: number[];
  audioBlob: Blob | null;
  audioUrl: string | null;
  permissionStatus: PermissionStatusType;
  error: VoiceRecorderError | null;
  isRequestingPermission: boolean;
  limitReached: boolean;
  isWarningThreshold: boolean;
  durationMs: number;
  clearError: () => void;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [state, setState] = useState<VoiceRecorderState>('idle');
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatusType>('prompt');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [error, setError] = useState<VoiceRecorderError | null>(null);

  const [recordingDuration, setRecordingDuration] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [waveform, setWaveform] = useState<number[]>(() => new Array(28).fill(4));
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  // References to preserve instances and prevent race conditions
  const isMountedRef = useRef(true);
  const isPendingPromptRef = useRef(false);
  const isCancelledWhilePendingRef = useRef(false);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioMeterRef = useRef<AudioLevelMeter | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Duration time-tracking references based on performance.now()
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const pauseStartRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastLevelUpdateRef = useRef<number>(0);
  const previewUrlRef = useRef<string | null>(null);

  // Synchronous state ref for transition guards
  const stateRef = useRef<VoiceRecorderState>('idle');
  const updateState = useCallback((nextState: VoiceRecorderState) => {
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Initialize permission status check and subscriber
  useEffect(() => {
    isMountedRef.current = true;

    getMicrophonePermissionStatus().then((status) => {
      if (isMountedRef.current) {
        setPermissionStatus(status);
      }
    });

    const unsubscribe = subscribeToMicrophonePermission((status) => {
      if (isMountedRef.current) {
        setPermissionStatus(status);
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, []);

  // Safe revoker for Object URLs
  const revokeCurrentPreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      try {
        URL.revokeObjectURL(previewUrlRef.current);
      } catch {
        // Ignored
      }
      previewUrlRef.current = null;
    }
  }, []);

  // Complete cleanup helper
  const releaseAudioResources = useCallback(() => {
    // 1. Clear timers and animation frames
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // 2. Close Web Audio Level Meter
    if (audioMeterRef.current) {
      audioMeterRef.current.close();
      audioMeterRef.current = null;
    }

    // 3. Stop MediaStream tracks (crucial: turns off browser mic LED indicator)
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      } catch {
        // Ignored
      }
      mediaStreamRef.current = null;
    }

    // 4. Detach MediaRecorder listeners
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onerror = null;
        mediaRecorderRef.current.onstop = null;
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch {
        // Ignored
      }
      mediaRecorderRef.current = null;
    }

    chunksRef.current = [];
    if (isMountedRef.current) {
      setAudioLevel(0);
      setWaveform(new Array(28).fill(4));
    }
  }, []);

  // Tab visibility change: resume audio meter if active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && stateRef.current === 'recording') {
        audioMeterRef.current?.resume();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Audio level & animated waveform loop (~25 Hz update rate for responsive speaking visualizer)
  const runAudioLevelLoop = useCallback(() => {
    const loop = (timestamp: number) => {
      if (!isMountedRef.current || stateRef.current !== 'recording') {
        return;
      }

      if (timestamp - lastLevelUpdateRef.current >= 40) {
        lastLevelUpdateRef.current = timestamp;
        if (audioMeterRef.current) {
          const level = audioMeterRef.current.getLevel();
          const bars = audioMeterRef.current.getWaveformData(28);
          setAudioLevel(level);
          setWaveform(bars);
        }
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);
  }, []);

  // Assembles chunks into Blob and transitions to 'previewing'
  const finalizeRecordingBlob = useCallback(
    (finalMs: number, wasAutoLimit: boolean) => {
      const mimeInfo = pickRecordingMimeType();
      const recorderMime = mediaRecorderRef.current?.mimeType || mimeInfo.mimeType || 'audio/webm';

      const blob = new Blob(chunksRef.current, { type: recorderMime });
      chunksRef.current = [];

      releaseAudioResources();
      revokeCurrentPreviewUrl();

      const objectUrl = URL.createObjectURL(blob);
      previewUrlRef.current = objectUrl;

      if (isMountedRef.current) {
        setAudioBlob(blob);
        setAudioUrl(objectUrl);
        setDurationMs(Math.round(finalMs));
        setRecordingDuration(Math.round(finalMs / 1000));
        setLimitReached(wasAutoLimit);
        updateState('previewing');

        if (wasAutoLimit) {
          showToast('Reached the 2:00 maximum voice note limit ⏱️✨', 'info');
        }
      }
    },
    [releaseAudioResources, revokeCurrentPreviewUrl, updateState]
  );

  // Stop recording logic and blob finalization
  const performStop = useCallback(
    (reason: 'manual' | 'auto_limit' | 'cancel') => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      // Calculate final exact duration
      let finalMs = 0;
      if (startTimeRef.current > 0) {
        const endTime = pauseStartRef.current ?? performance.now();
        finalMs = Math.max(0, endTime - startTimeRef.current - pausedDurationRef.current);
      }

      if (reason === 'cancel') {
        releaseAudioResources();
        revokeCurrentPreviewUrl();
        if (isMountedRef.current) {
          updateState('idle');
          setRecordingDuration(0);
          setDurationMs(0);
          setAudioBlob(null);
          setAudioUrl(null);
          setLimitReached(false);
          setAudioLevel(0);
          setWaveform(new Array(28).fill(4));
        }
        return;
      }

      // Discard recordings under 1 second (1000 ms)
      if (finalMs < MIN_DURATION_MS) {
        releaseAudioResources();
        if (isMountedRef.current) {
          updateState('idle');
          setRecordingDuration(0);
          setDurationMs(0);
          setAudioBlob(null);
          setAudioUrl(null);
          setLimitReached(false);
          setAudioLevel(0);
          setWaveform(new Array(28).fill(4));
          showToast('Hold on a bit longer to record a voice message! ⏱️', 'info');
        }
        return;
      }

      // Safe MediaRecorder stopping
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // Fallback handled in onstop
        }
      } else {
        // If already inactive or missing
        finalizeRecordingBlob(finalMs, reason === 'auto_limit');
      }
    },
    [finalizeRecordingBlob, releaseAudioResources, revokeCurrentPreviewUrl, updateState]
  );

  // Starts voice recording
  const startRecording = useCallback(async () => {
    // Transition guard: only idle state can start
    if (stateRef.current !== 'idle') {
      return;
    }

    // Race safety: prevent rapid duplicate triggers
    if (isPendingPromptRef.current) {
      return;
    }

    // Check environment support
    const support = isVoiceRecordingSupported();
    if (!support.supported) {
      const err: VoiceRecorderError = {
        code: 'unsupported',
        message: support.message || 'Voice recording is not supported in this browser.',
      };
      setError(err);
      setPermissionStatus('unsupported');
      return;
    }

    // Check MIME compatibility with backend allowlist
    const mimeCheck = pickRecordingMimeType();
    if (!mimeCheck.isBackendAllowed) {
      const err: VoiceRecorderError = {
        code: 'unsupported',
        message: 'Your browser cannot record in an audio container supported by ToonChat.',
      };
      setError(err);
      setPermissionStatus('unsupported');
      return;
    }

    setError(null);
    setLimitReached(false);
    revokeCurrentPreviewUrl();
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingDuration(0);
    setDurationMs(0);

    isPendingPromptRef.current = true;
    isCancelledWhilePendingRef.current = false;
    setIsRequestingPermission(true);

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Race condition check: cancelled or unmounted while permission prompt was open
      if (!isMountedRef.current || isCancelledWhilePendingRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      setPermissionStatus('granted');
      mediaStreamRef.current = stream;

      // Safe AudioLevelMeter init: wrap so it NEVER blocks MediaRecorder.start()
      try {
        audioMeterRef.current = new AudioLevelMeter(stream);
      } catch (meterErr) {
        console.warn('[useVoiceRecorder] AudioLevelMeter initialization failed:', meterErr);
      }

      // Initialize MediaRecorder
      const options: MediaRecorderOptions = {};
      if (mimeCheck.mimeType) {
        options.mimeType = mimeCheck.mimeType;
      }
      if (
        typeof MediaRecorder.isTypeSupported === 'function' &&
        mimeCheck.mimeType &&
        !MediaRecorder.isTypeSupported(mimeCheck.mimeType)
      ) {
        delete options.mimeType;
      }
      options.audioBitsPerSecond = AUDIO_BITS_PER_SECOND;

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch {
        // Fallback to browser default options
        recorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onerror = (e) => {
        console.error('[useVoiceRecorder] MediaRecorder error:', e);
        releaseAudioResources();
        if (isMountedRef.current) {
          setError({
            code: 'recorder-error',
            message: 'An unexpected recorder error occurred. Please try again.',
            technicalError: e,
          });
          updateState('idle');
        }
      };

      recorder.onstop = () => {
        let finalMs = 0;
        if (startTimeRef.current > 0) {
          const endTime = pauseStartRef.current ?? performance.now();
          finalMs = Math.max(0, endTime - startTimeRef.current - pausedDurationRef.current);
        }
        finalizeRecordingBlob(finalMs, limitReached);
      };

      // Start recording with 250ms timeslices
      recorder.start(CHUNK_TIMESLICE_MS);

      // Initialize performance timestamps
      const now = performance.now();
      startTimeRef.current = now;
      pausedDurationRef.current = 0;
      pauseStartRef.current = null;

      // Synchronously transition state to recording and release requesting flag
      isPendingPromptRef.current = false;
      if (isMountedRef.current) {
        setIsRequestingPermission(false);
        setRecordingDuration(0);
        setDurationMs(0);
        updateState('recording');
        runAudioLevelLoop();
      }

      // Interval timer ticking ~100ms derived from performance.now()
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      timerIntervalRef.current = setInterval(() => {
        if (!isMountedRef.current || stateRef.current !== 'recording') {
          return;
        }

        const currentNow = performance.now();
        const currentMs = Math.max(0, currentNow - startTimeRef.current - pausedDurationRef.current);
        const currentSec = currentMs / 1000;

        setDurationMs(Math.round(currentMs));
        setRecordingDuration(Math.floor(currentSec));

        // Auto-stop at 120 seconds
        if (currentSec >= MAX_DURATION_SECONDS) {
          performStop('auto_limit');
        }
      }, 100);
    } catch (err) {
      if (isMountedRef.current && !isCancelledWhilePendingRef.current) {
        const mappedError = mapGetUserMediaError(err);
        setError(mappedError);
        setPermissionStatus('denied');
        updateState('idle');
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    } finally {
      if (isMountedRef.current) {
        setIsRequestingPermission(false);
      }
      isPendingPromptRef.current = false;
    }
  }, [finalizeRecordingBlob, performStop, releaseAudioResources, revokeCurrentPreviewUrl, runAudioLevelLoop, limitReached, updateState]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (stateRef.current !== 'recording') {
      return;
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      try {
        recorder.pause();
      } catch {
        // Ignored
      }
    }

    pauseStartRef.current = performance.now();
    setAudioLevel(0);
    updateState('paused');
  }, [updateState]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (stateRef.current !== 'paused') {
      return;
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'paused') {
      try {
        recorder.resume();
      } catch {
        // Ignored
      }
    }

    if (pauseStartRef.current !== null) {
      pausedDurationRef.current += performance.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }

    audioMeterRef.current?.resume();
    updateState('recording');
    runAudioLevelLoop();
  }, [runAudioLevelLoop, updateState]);

  // Stop recording (transitions to 'previewing')
  const stopRecording = useCallback(() => {
    if (stateRef.current !== 'recording' && stateRef.current !== 'paused') {
      return;
    }
    performStop('manual');
  }, [performStop]);

  // Cancel recording (transitions to 'idle', releases resources, revokes URL)
  const cancelRecording = useCallback(() => {
    if (isPendingPromptRef.current) {
      isCancelledWhilePendingRef.current = true;
    }
    performStop('cancel');
  }, [performStop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      releaseAudioResources();
      revokeCurrentPreviewUrl();
    };
  }, [releaseAudioResources, revokeCurrentPreviewUrl]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const isWarningThreshold = recordingDuration >= WARNING_AT_SECONDS && recordingDuration < MAX_DURATION_SECONDS;

  return {
    state,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    recordingDuration,
    formattedDuration: formatDuration(recordingDuration),
    audioLevel,
    waveform,
    audioBlob,
    audioUrl,
    permissionStatus,
    error,
    isRequestingPermission,
    limitReached,
    isWarningThreshold,
    durationMs,
    clearError,
  };
}

