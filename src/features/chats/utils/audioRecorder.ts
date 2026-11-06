/**
 * Audio Recording Utilities for ToonChat
 * Phase 13.3B — In-Browser Voice Recorder
 *
 * Implements browser capability checks, MIME type selection,
 * Web Audio API level metering (no echo), typed error mapping,
 * and duration/size constants aligned with Phase 13.3A backend rules.
 */

export const MAX_DURATION_SECONDS = 120; // 2 minutes maximum
export const WARNING_AT_SECONDS = 110; // Warning threshold at 1m 50s
export const MIN_DURATION_MS = 1000; // Minimum 1 second recording
export const CHUNK_TIMESLICE_MS = 250; // Emit data chunk every 250ms
export const AUDIO_BITS_PER_SECOND = 48000; // 48 kbps (~720 KB for 120s, far below 10MB limit)
export const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB backend limit

export const BACKEND_ALLOWED_AUDIO_MIMES = [
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
] as const;

export type BackendAllowedAudioMime = (typeof BACKEND_ALLOWED_AUDIO_MIMES)[number];

export type PermissionStatusType = 'prompt' | 'granted' | 'denied' | 'unsupported';

export type VoiceRecorderErrorCode =
  | 'unsupported'
  | 'denied'
  | 'no-microphone'
  | 'mic-in-use'
  | 'too-short'
  | 'recorder-error'
  | 'unknown';

export interface VoiceRecorderError {
  code: VoiceRecorderErrorCode;
  message: string;
  technicalError?: unknown;
}

export interface SupportCheckResult {
  supported: boolean;
  reason?: 'insecure_context' | 'no_get_user_media' | 'no_media_recorder';
  message?: string;
}

/**
 * Checks whether the current runtime environment supports voice recording.
 * Requires a secure context (https or localhost), navigator.mediaDevices.getUserMedia,
 * and the MediaRecorder API.
 */
export function isVoiceRecordingSupported(): SupportCheckResult {
  const isSecure = typeof window !== 'undefined' ? window.isSecureContext !== false : (globalThis.isSecureContext !== false);
  if (!isSecure) {
    return {
      supported: false,
      reason: 'insecure_context',
      message: 'Voice recording requires a secure connection (HTTPS or localhost).',
    };
  }

  const nav = typeof navigator !== 'undefined' ? navigator : globalThis.navigator;
  if (!nav?.mediaDevices?.getUserMedia) {
    return {
      supported: false,
      reason: 'no_get_user_media',
      message: 'Your browser does not support audio capture via MediaDevices.',
    };
  }

  const MR = typeof MediaRecorder !== 'undefined' ? MediaRecorder : (typeof window !== 'undefined' ? window.MediaRecorder : undefined);
  if (typeof MR === 'undefined') {
    return {
      supported: false,
      reason: 'no_media_recorder',
      message: 'Your browser does not support the MediaRecorder API.',
    };
  }

  return { supported: true };
}

/**
 * Extracts the base MIME type (e.g. 'audio/webm' from 'audio/webm;codecs=opus').
 */
export function extractBaseMimeType(mime: string): string {
  if (!mime) return '';
  return mime.split(';')[0].trim().toLowerCase();
}

/**
 * Picks the most appropriate supported audio MIME type across browsers in priority order:
 * "audio/webm;codecs=opus" -> "audio/webm" -> "audio/ogg;codecs=opus" -> "audio/mp4".
 * Verifies that the base MIME type is allowed by the ToonChat backend allowlist.
 */
export function pickRecordingMimeType(): {
  mimeType: string | undefined;
  baseMimeType: string | undefined;
  extension: string | undefined;
  isBackendAllowed: boolean;
  backendAllowed: boolean;
} {
  const MR = typeof MediaRecorder !== 'undefined' ? MediaRecorder : (typeof window !== 'undefined' ? window.MediaRecorder : undefined);
  if (!MR) {
    return {
      mimeType: undefined,
      baseMimeType: undefined,
      extension: undefined,
      isBackendAllowed: false,
      backendAllowed: false,
    };
  }

  const candidateMimes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ];

  let selectedMime: string | undefined;

  for (const candidate of candidateMimes) {
    try {
      if (typeof MR.isTypeSupported === 'function') {
        if (MR.isTypeSupported(candidate)) {
          selectedMime = candidate;
          break;
        }
      }
    } catch {
      // Continue to next candidate
    }
  }

  const base = selectedMime ? extractBaseMimeType(selectedMime) : undefined;
  const isBackendAllowed = base
    ? (BACKEND_ALLOWED_AUDIO_MIMES as readonly string[]).includes(base)
    : true; // If undefined, browser defaults will be validated on stop

  const extMap: Record<string, string> = {
    'audio/webm': '.webm',
    'audio/ogg': '.ogg',
    'audio/mp4': '.m4a',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
  };
  const extension = base ? extMap[base] || '.audio' : undefined;

  return {
    mimeType: selectedMime,
    baseMimeType: base,
    extension,
    isBackendAllowed,
    backendAllowed: isBackendAllowed,
  };
}

/**
 * Queries microphone permission state if supported by the browser.
 * Falls back to 'prompt' on browsers where permissions.query throws or is unsupported.
 */
export async function getMicrophonePermissionStatus(): Promise<PermissionStatusType> {
  const support = isVoiceRecordingSupported();
  if (!support.supported) {
    return 'unsupported';
  }

  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return 'prompt';
  }

  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    if (status.state === 'granted') return 'granted';
    if (status.state === 'denied') return 'denied';
    return 'prompt';
  } catch {
    // Safari / Firefox may reject { name: 'microphone' }
    return 'prompt';
  }
}

/**
 * Subscribes to microphone permission changes if the PermissionStatus API is available.
 * Returns an unsubscribe callback.
 */
export function subscribeToMicrophonePermission(
  onChange: (status: PermissionStatusType) => void
): () => void {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return () => {};
  }

  let permissionObj: PermissionStatus | null = null;
  let handler: (() => void) | null = null;

  navigator.permissions
    .query({ name: 'microphone' as PermissionName })
    .then((pStatus) => {
      permissionObj = pStatus;
      handler = () => {
        if (permissionObj?.state === 'granted') onChange('granted');
        else if (permissionObj?.state === 'denied') onChange('denied');
        else onChange('prompt');
      };
      permissionObj.addEventListener('change', handler);
    })
    .catch(() => {
      // Silently ignore if unsupported
    });

  return () => {
    if (permissionObj && handler) {
      permissionObj.removeEventListener('change', handler);
    }
  };
}

/**
 * Maps standard getUserMedia error exceptions to typed ToonChat errors with friendly copy.
 */
export function mapGetUserMediaError(error: unknown): VoiceRecorderError {
  const err = error as { name?: string; message?: string } | null;
  const errorName = err?.name || '';

  if (errorName === 'NotAllowedError' || errorName === 'SecurityError' || errorName === 'PermissionDeniedError') {
    return {
      code: 'denied',
      message: 'Microphone access was blocked. Tap the lock icon in your address bar to enable your mic for ToonChat! 🎙️🔒',
      technicalError: error,
    };
  }

  if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError' || errorName === 'OverconstrainedError') {
    return {
      code: 'no-microphone',
      message: 'No microphone found! Please plug in a microphone or headset and try again. 🎧✨',
      technicalError: error,
    };
  }

  if (errorName === 'NotReadableError' || errorName === 'TrackStartError' || errorName === 'AbortError') {
    return {
      code: 'mic-in-use',
      message: 'Your microphone is currently being used by another application or call. 📞⏳',
      technicalError: error,
    };
  }

  return {
    code: 'unknown',
    message: 'Could not start voice recording. Check your device settings and try again! 🎈',
    technicalError: error,
  };
}

/**
 * Formats duration in seconds to "mm:ss" display string.
 */
export function formatDuration(seconds: number): string {
  const safeSec = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safeSec / 60);
  const s = safeSec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Web Audio API Level Meter
 * Measures microphone RMS volume without connecting to destination to prevent audio feedback/echo.
 */
export class AudioLevelMeter {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> | null = null;
  private prevLevel = 0;

  constructor(stream: MediaStream) {
    try {
      const AudioCtxClass =
        typeof AudioContext !== 'undefined'
          ? AudioContext
          : typeof window !== 'undefined'
            ? window.AudioContext ||
              (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
            : undefined;
      if (!AudioCtxClass) return;

      this.audioContext = new AudioCtxClass();
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.7;

      this.source = this.audioContext.createMediaStreamSource(stream);
      // NOTE: Connecting only to AnalyserNode, NOT to audioContext.destination (avoids loopback echo)
      this.source.connect(this.analyser);

      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    } catch (e) {
      console.warn('[AudioLevelMeter] Failed to initialize Web Audio meter:', e);
    }
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Resumes the AudioContext if suspended (e.g. after tab visibility change).
   */
  public resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
  }

  /**
   * Reads the current RMS volume level and returns a normalized value between 0.0 and 1.0.
   */
  public getLevel(): number {
    if (!this.analyser || !this.dataArray) {
      return 0;
    }

    try {
      this.analyser.getByteTimeDomainData(this.dataArray);

      let sumSquares = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        // Center around 128 (8-bit PCM neutral position)
        const deviation = (this.dataArray[i] - 128) / 128;
        sumSquares += deviation * deviation;
      }

      const rms = Math.sqrt(sumSquares / this.dataArray.length);

      // Noise floor and non-linear perceived boost for responsive cartoon visualization
      const noiseFloor = 0.02;
      const rawLevel = Math.max(0, (rms - noiseFloor) / (1 - noiseFloor));
      const boosted = Math.min(1, Math.pow(rawLevel * 3.5, 0.85));

      // Light EMA smoothing: 60% new value, 40% previous value
      const smoothed = this.prevLevel * 0.4 + boosted * 0.6;
      this.prevLevel = smoothed;

      return Math.round(smoothed * 100) / 100;
    } catch {
      return 0;
    }
  }

  /**
   * Generates real-time animated waveform bar heights (in px, min 4, max 32)
   * representing voice audio activity. When silent, returns a gentle breathing cartoon idle wave.
   */
  public getWaveformData(numBars: number = 28): number[] {
    const level = this.getLevel();
    const bars: number[] = [];

    if (this.analyser && this.frequencyData) {
      try {
        this.analyser.getByteFrequencyData(this.frequencyData);
      } catch {
        // Fallback
      }
    }

    const now = Date.now();
    const isSilent = level < 0.02;

    for (let i = 0; i < numBars; i++) {
      if (isSilent) {
        // Subtle cartoon breathing wave during quiet/silence
        const idleWave = Math.sin((now / 220) + (i * 0.45)) * 0.5 + 0.5;
        const idleHeight = Math.max(4, Math.round(4 + idleWave * 7));
        bars.push(idleHeight);
      } else {
        // Sample speech frequency bins (human voice is concentrated in bins 2 to 40)
        let freqValue = 0;
        if (this.frequencyData && this.frequencyData.length > 0) {
          const binIndex = Math.min(
            this.frequencyData.length - 1,
            Math.floor(2 + (i / numBars) * 36)
          );
          freqValue = this.frequencyData[binIndex] / 255;
        }

        // Center curve factor: speech visualizers emphasize center bars
        const centerFactor = 1 - Math.abs(i - numBars / 2) / (numBars / 2);
        const dynamicMultiplier = 0.5 + centerFactor * 0.5;

        // Combine frequency amplitude with overall RMS volume
        const combined = (freqValue * 0.65 + level * 0.35) * dynamicMultiplier;
        const height = Math.max(4, Math.min(32, Math.round(4 + combined * 28)));
        bars.push(height);
      }
    }

    return bars;
  }

  /**
   * Complete cleanup: disconnects audio nodes and closes the AudioContext.
   */
  public close(): void {
    try {
      if (this.source) {
        this.source.disconnect();
        this.source = null;
      }
      if (this.analyser) {
        this.analyser.disconnect();
        this.analyser = null;
      }
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close().catch(() => {});
        this.audioContext = null;
      }
    } catch {
      // ignore
    }
  }

  public cleanup(): void {
    this.close();
  }
}

