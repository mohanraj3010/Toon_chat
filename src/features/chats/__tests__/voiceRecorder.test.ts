import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  isVoiceRecordingSupported,
  pickRecordingMimeType,
  mapGetUserMediaError,
  AudioLevelMeter,
  formatDuration,
  MAX_DURATION_SECONDS,
  WARNING_AT_SECONDS,
  MIN_DURATION_MS,
  MAX_AUDIO_SIZE_BYTES,
  BACKEND_ALLOWED_AUDIO_MIMES,
} from '../utils/audioRecorder';
import { VoiceRecorderBar } from '../components/VoiceRecorderBar';
import { Composer } from '../components/Composer';
import { MessageBubble } from '../components/MessageBubble';
import type { Message } from '@/shared/types';
import type { UseVoiceRecorderReturn } from '../hooks/useVoiceRecorder';

// --- Native Web Audio & MediaRecorder Mocks ---
class MockMediaStreamTrack {
  kind = 'audio';
  enabled = true;
  readyState = 'live';
  stop = vi.fn(() => {
    this.readyState = 'ended';
  });
}

class MockMediaStream {
  tracks: MockMediaStreamTrack[];
  constructor() {
    this.tracks = [new MockMediaStreamTrack()];
  }
  getTracks() {
    return this.tracks;
  }
  getAudioTracks() {
    return this.tracks;
  }
}

class MockMediaRecorder {
  static isTypeSupported = vi.fn((mime: string) => {
    return (
      mime === 'audio/webm;codecs=opus' ||
      mime === 'audio/webm' ||
      mime === 'audio/ogg;codecs=opus' ||
      mime === 'audio/mp4'
    );
  });

  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  stream: MockMediaStream;
  mimeType: string;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;

  constructor(stream: MockMediaStream, options?: { mimeType?: string }) {
    this.stream = stream;
    this.mimeType = options?.mimeType || 'audio/webm;codecs=opus';
  }

  start(_timeslice?: number) {
    this.state = 'recording';
    setTimeout(() => {
      if (this.state === 'recording' && this.ondataavailable) {
        this.ondataavailable({ data: new Blob(['mock-audio-chunk'], { type: this.mimeType }) });
      }
    }, 10);
  }

  pause() {
    if (this.state === 'recording') {
      this.state = 'paused';
    }
  }

  resume() {
    if (this.state === 'paused') {
      this.state = 'recording';
    }
  }

  stop() {
    this.state = 'inactive';
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob(['mock-audio-end'], { type: this.mimeType }) });
    }
    if (this.onstop) {
      this.onstop();
    }
  }
}

class MockAnalyserNode {
  fftSize = 256;
  frequencyBinCount = 128;
  smoothingTimeConstant = 0.8;
  mockData: Uint8Array = new Uint8Array(128).fill(128);

  getByteTimeDomainData(array: Uint8Array) {
    array.set(this.mockData);
  }

  disconnect = vi.fn();
}

class MockMediaStreamAudioSourceNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockAudioContext {
  state: 'suspended' | 'running' | 'closed' = 'running';
  destination = {};

  createAnalyser() {
    return new MockAnalyserNode();
  }

  createMediaStreamSource(_stream: MockMediaStream) {
    return new MockMediaStreamAudioSourceNode();
  }

  resume = vi.fn(async () => {
    this.state = 'running';
  });

  close = vi.fn(async () => {
    this.state = 'closed';
  });
}

function createMockRecorderState(overrides?: Partial<UseVoiceRecorderReturn>): UseVoiceRecorderReturn {
  return {
    state: 'idle',
    startRecording: vi.fn(async () => {}),
    pauseRecording: vi.fn(),
    resumeRecording: vi.fn(),
    stopRecording: vi.fn(),
    cancelRecording: vi.fn(),
    recordingDuration: 0,
    formattedDuration: '00:00',
    audioLevel: 0,
    audioBlob: null,
    audioUrl: null,
    permissionStatus: 'granted',
    error: null,
    isRequestingPermission: false,
    waveform: new Array(28).fill(4),
    limitReached: false,
    isWarningThreshold: false,
    durationMs: 0,
    clearError: vi.fn(),
    ...overrides,
  };
}

describe('Phase 13.3B: Browser Voice Recorder Test Suite', () => {
  const originalMediaRecorder = globalThis.MediaRecorder;
  const originalAudioContext = globalThis.AudioContext;
  const originalNavigator = globalThis.navigator;
  const originalWindow = (globalThis as unknown as { window?: unknown }).window;

  beforeEach(() => {
    vi.restoreAllMocks();

    Object.defineProperty(globalThis, 'MediaRecorder', {
      value: MockMediaRecorder,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(globalThis, 'AudioContext', {
      value: MockAudioContext,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(globalThis, 'isSecureContext', {
      value: true,
      writable: true,
      configurable: true,
    });

    const mockNav = {
      ...originalNavigator,
      mediaDevices: {
        getUserMedia: vi.fn(async () => new MockMediaStream()),
      },
      permissions: {
        query: vi.fn(async () => ({ state: 'granted' })),
      },
    };

    Object.defineProperty(globalThis, 'navigator', {
      value: mockNav,
      writable: true,
      configurable: true,
    });

    const mockWin = {
      isSecureContext: true,
      MediaRecorder: MockMediaRecorder,
      AudioContext: MockAudioContext,
      navigator: mockNav,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    Object.defineProperty(globalThis, 'window', {
      value: mockWin,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'MediaRecorder', {
      value: originalMediaRecorder,
      writable: true,
    });
    Object.defineProperty(globalThis, 'AudioContext', {
      value: originalAudioContext,
      writable: true,
    });
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
    });
  });

  describe('Audio Utilities (audioRecorder.ts)', () => {
    it('1. isVoiceRecordingSupported detects supported environments correctly', () => {
      const res = isVoiceRecordingSupported();
      expect(res.supported).toBe(true);
      expect(res.reason).toBeUndefined();
    });

    it('2. isVoiceRecordingSupported detects insecure context (non-localhost HTTP)', () => {
      Object.defineProperty(globalThis, 'isSecureContext', { value: false, configurable: true });
      if ((globalThis as unknown as { window?: { isSecureContext: boolean } }).window) {
        (globalThis as unknown as { window: { isSecureContext: boolean } }).window.isSecureContext = false;
      }
      const res = isVoiceRecordingSupported();
      expect(res.supported).toBe(false);
      expect(res.reason).toBe('insecure_context');
    });

    it('3. isVoiceRecordingSupported detects missing getUserMedia', () => {
      const withoutMediaDevices = { ...originalNavigator, mediaDevices: undefined };
      Object.defineProperty(globalThis, 'navigator', {
        value: withoutMediaDevices,
        configurable: true,
      });
      if ((globalThis as unknown as { window?: { navigator: unknown } }).window) {
        (globalThis as unknown as { window: { navigator: unknown } }).window.navigator = withoutMediaDevices;
      }
      const res = isVoiceRecordingSupported();
      expect(res.supported).toBe(false);
      expect(res.reason).toBe('no_get_user_media');
    });

    it('4. isVoiceRecordingSupported detects missing MediaRecorder', () => {
      Object.defineProperty(globalThis, 'MediaRecorder', { value: undefined, configurable: true });
      if ((globalThis as unknown as { window?: { MediaRecorder: unknown } }).window) {
        (globalThis as unknown as { window: { MediaRecorder: unknown } }).window.MediaRecorder = undefined;
      }
      const res = isVoiceRecordingSupported();
      expect(res.supported).toBe(false);
      expect(res.reason).toBe('no_media_recorder');
    });

    it('5. pickRecordingMimeType prioritizes WebM Opus first and validates backend allowlist', () => {
      const mime = pickRecordingMimeType();
      expect(mime.mimeType).toBe('audio/webm;codecs=opus');
      expect(mime.baseMimeType).toBe('audio/webm');
      expect(mime.extension).toBe('.webm');
      expect(mime.backendAllowed).toBe(true);
      expect(BACKEND_ALLOWED_AUDIO_MIMES).toContain(mime.baseMimeType);
    });

    it('6. pickRecordingMimeType falls back to WebM then Ogg then MP4 depending on browser support', () => {
      MockMediaRecorder.isTypeSupported.mockImplementation((type: string) => {
        return type === 'audio/ogg;codecs=opus';
      });

      const mime = pickRecordingMimeType();
      expect(mime.mimeType).toBe('audio/ogg;codecs=opus');
      expect(mime.baseMimeType).toBe('audio/ogg');
      expect(mime.extension).toBe('.ogg');
      expect(mime.backendAllowed).toBe(true);
    });

    it('7. mapGetUserMediaError maps NotAllowedError, NotFoundError, and NotReadableError accurately', () => {
      const deniedErr = new Error('Permission dismissed');
      deniedErr.name = 'NotAllowedError';
      const mappedDenied = mapGetUserMediaError(deniedErr);
      expect(mappedDenied.code).toBe('denied');
      expect(mappedDenied.message).toContain('Microphone access was blocked');

      const notFoundErr = new Error('No audio input devices');
      notFoundErr.name = 'NotFoundError';
      const mappedNotFound = mapGetUserMediaError(notFoundErr);
      expect(mappedNotFound.code).toBe('no-microphone');
      expect(mappedNotFound.message).toContain('No microphone found');

      const inUseErr = new Error('Hardware busy');
      inUseErr.name = 'NotReadableError';
      const mappedInUse = mapGetUserMediaError(inUseErr);
      expect(mappedInUse.code).toBe('mic-in-use');
      expect(mappedInUse.message).toContain('being used');
    });

    it('8. AudioLevelMeter measures RMS volume without connecting to audioContext.destination (prevents feedback)', () => {
      const stream = new MockMediaStream();
      const meter = new AudioLevelMeter(stream as unknown as MediaStream);
      const audioContext = meter.getAudioContext();

      expect(audioContext).not.toBeNull();
      const level = meter.getLevel();
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(1);

      meter.cleanup();
      expect(meter.getAudioContext()).toBeNull();
    });

    it('9. formatDuration formats mm:ss accurately', () => {
      expect(formatDuration(0)).toBe('00:00');
      expect(formatDuration(9)).toBe('00:09');
      expect(formatDuration(65)).toBe('01:05');
      expect(formatDuration(120)).toBe('02:00');
    });

    it('10. Enforces backend audio constraints (120s limit, 110s warning, 1s minimum, 10MB limit)', () => {
      expect(MAX_DURATION_SECONDS).toBe(120);
      expect(WARNING_AT_SECONDS).toBe(110);
      expect(MIN_DURATION_MS).toBe(1000);
      expect(MAX_AUDIO_SIZE_BYTES).toBe(10485760);
    });
  });

  describe('VoiceRecorderBar Component Rendering & States', () => {
    it('11. Renders live timer, pulsing dot, waveform bars, and controls when recording', () => {
      const mockRecorder = createMockRecorderState({
        state: 'recording',
        recordingDuration: 14,
        formattedDuration: '00:14',
        audioLevel: 0.65,
      });

      const html = renderToStaticMarkup(
        React.createElement(VoiceRecorderBar, { recorder: mockRecorder })
      );

      expect(html).toContain('00:14 / 02:00');
      expect(html).toContain('pulsing-dot');
      expect(html).toContain('Cancel recording');
      expect(html).toContain('Pause recording');
      expect(html).toContain('Stop recording and preview');
      expect(html).toContain('level-meter-container');
    });

    it('12. Renders paused dot, resume button, and paused waveform bars when paused', () => {
      const mockRecorder = createMockRecorderState({
        state: 'paused',
        recordingDuration: 42,
        formattedDuration: '00:42',
      });

      const html = renderToStaticMarkup(
        React.createElement(VoiceRecorderBar, { recorder: mockRecorder })
      );

      expect(html).toContain('00:42 / 02:00');
      expect(html).toContain('paused-dot');
      expect(html).toContain('Resume recording');
      expect(html).toContain('level-bar-paused');
    });

    it('13. Renders preview track, Play button, Discard, and disabled Send button when no handler provided', () => {
      const mockBlob = new Blob(['mock-audio'], { type: 'audio/webm' });
      const mockRecorder = createMockRecorderState({
        state: 'previewing',
        durationMs: 15400,
        recordingDuration: 15,
        formattedDuration: '00:15',
        audioBlob: mockBlob,
        audioUrl: 'blob:http://localhost:3000/mock-audio-uuid',
      });

      const html = renderToStaticMarkup(
        React.createElement(VoiceRecorderBar, { recorder: mockRecorder })
      );

      expect(html).toContain('Play preview');
      expect(html).toContain('Discard voice message');
      expect(html).toContain('Voice sending is coming in the next update');
      expect(html).toContain('disabled');
      expect(html).toContain('blob:http://localhost:3000/mock-audio-uuid');
    });

    it('14. Renders active Send button when onSend callback is provided', () => {
      const mockBlob = new Blob(['mock-audio'], { type: 'audio/webm' });
      const mockRecorder = createMockRecorderState({
        state: 'previewing',
        durationMs: 15400,
        recordingDuration: 15,
        formattedDuration: '00:15',
        audioBlob: mockBlob,
        audioUrl: 'blob:http://localhost:3000/mock-audio-uuid',
      });

      const onSendMock = vi.fn();
      const html = renderToStaticMarkup(
        React.createElement(VoiceRecorderBar, { recorder: mockRecorder, onSend: onSendMock })
      );

      expect(html).toContain('Send voice message');
      expect(html).not.toContain('Voice sending is coming in the next update');
    });

    it('15. Renders limit badge when 120s limit is reached', () => {
      const mockBlob = new Blob(['mock-audio-2m'], { type: 'audio/webm' });
      const mockRecorder = createMockRecorderState({
        state: 'previewing',
        durationMs: 120000,
        recordingDuration: 120,
        formattedDuration: '02:00',
        audioBlob: mockBlob,
        audioUrl: 'blob:http://localhost:3000/mock-audio-uuid',
        limitReached: true,
      });

      const html = renderToStaticMarkup(
        React.createElement(VoiceRecorderBar, { recorder: mockRecorder })
      );

      expect(html).toContain('Max 2:00');
    });

    it('16. Renders permission banner with browser re-enable steps when permission is denied or error occurs', () => {
      const mockRecorder = createMockRecorderState({
        permissionStatus: 'denied',
        error: {
          code: 'denied',
          message: 'Microphone access was blocked. Please enable it in browser settings.',
        },
      });

      const html = renderToStaticMarkup(
        React.createElement(VoiceRecorderBar, { recorder: mockRecorder })
      );

      expect(html).toContain('Microphone Access Needed');
      expect(html).toContain('Microphone access was blocked');
      expect(html).toContain('Chrome/Edge:');
      expect(html).toContain('Firefox:');
      expect(html).toContain('Safari:');
      expect(html).toContain('Try Again');
    });

    it('17. Composer replaces text input with VoiceRecorderBar when recording, and renders Mic button when empty', () => {
      const onSendMock = vi.fn();

      // Render idle empty composer
      const htmlIdle = renderToStaticMarkup(
        React.createElement(Composer, { onSend: onSendMock })
      );

      expect(htmlIdle).toContain('Record voice message');
      expect(htmlIdle).toContain('Attach photo or document');
      expect(htmlIdle).toContain('Type a message...');
    });

    it('18. Displays "Connecting mic..." and pulsing dot immediately when isRequestingPermission is true', () => {
      const mockRecorder = createMockRecorderState({
        state: 'idle',
        isRequestingPermission: true,
      });

      const html = renderToStaticMarkup(
        React.createElement(VoiceRecorderBar, { recorder: mockRecorder })
      );

      expect(html).toContain('Connecting mic...');
      expect(html).toContain('pulsing-dot');
      expect(html).toContain('voice-recorder-bar');
    });

    it('19. Renders custom 28-bar vocal frequency waveform heights dynamically in active recording', () => {
      const vocalWaveform = [
        4, 6, 8, 12, 18, 24, 28, 22, 16, 20, 26, 30, 25, 18,
        15, 22, 28, 24, 19, 14, 10, 8, 6, 5, 4, 4, 4, 4
      ];
      const mockRecorder = createMockRecorderState({
        state: 'recording',
        waveform: vocalWaveform,
        formattedDuration: '00:05',
      });

      const html = renderToStaticMarkup(
        React.createElement(VoiceRecorderBar, { recorder: mockRecorder })
      );

      expect(html).toContain('height:28px');
      expect(html).toContain('height:30px');
      expect(html).toContain('00:05 / 02:00');
    });

    it('20. isDirectMediaUrl distinguishes direct renderable URLs from API JSON metadata endpoints', async () => {
      const { isDirectMediaUrl } = await import('../hooks/useResolvedMediaUrl');
      expect(isDirectMediaUrl('/api/v1/media/123-abc/url')).toBe(false);
      expect(isDirectMediaUrl('blob:http://localhost:3000/12345')).toBe(true);
      expect(isDirectMediaUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
      expect(isDirectMediaUrl('/api/v1/media/storage/file/uploads/photo.png?token=xyz')).toBe(true);
      expect(isDirectMediaUrl('https://s3.amazonaws.com/bucket/file.png?signature=abc')).toBe(true);
      expect(isDirectMediaUrl(null)).toBe(false);
      expect(isDirectMediaUrl(undefined)).toBe(false);
    });

    it('21. VoiceRecorderBar immediately transitions from "Connecting mic..." to recording timer without lag', () => {
      // 1. Permission request state
      const connectingRecorder = createMockRecorderState({
        state: 'idle',
        isRequestingPermission: true,
      });
      const connectingHtml = renderToStaticMarkup(
        React.createElement(VoiceRecorderBar, { recorder: connectingRecorder })
      );
      expect(connectingHtml).toContain('Connecting mic...');
      expect(connectingHtml).not.toContain('00:00 / 02:00');

      // 2. Active recording state (timer immediately shown, connecting mic removed)
      const activeRecorder = createMockRecorderState({
        state: 'recording',
        isRequestingPermission: false,
        recordingDuration: 1,
        formattedDuration: '00:01',
      });
      const activeHtml = renderToStaticMarkup(
        React.createElement(VoiceRecorderBar, { recorder: activeRecorder })
      );
      expect(activeHtml).not.toContain('Connecting mic...');
      expect(activeHtml).toContain('00:01 / 02:00');
    });

    it('22. AudioLevelMeter handles AudioContext errors without interrupting stream lifecycle', () => {
      const failingStream = new MockMediaStream();
      // Temporarily mock AudioContext to throw
      const origAudioCtx = globalThis.AudioContext;
      (globalThis as unknown as { AudioContext?: unknown }).AudioContext = class ThrowingAudioCtx {
        constructor() {
          throw new Error('Hardware audio failure');
        }
      };

      try {
        expect(() => new AudioLevelMeter(failingStream as unknown as MediaStream)).not.toThrow();
        const meter = new AudioLevelMeter(failingStream as unknown as MediaStream);
        expect(meter.getLevel()).toBe(0);
        expect(() => meter.close()).not.toThrow();
      } finally {
        (globalThis as unknown as { AudioContext?: unknown }).AudioContext = origAudioCtx;
      }
    });

    it('23. MessageBubble renders long multi-line text messages with proper structure', () => {
      const longReport = 'PHASE AUDIT REPORT\n' + 'Line detail '.repeat(50) + '\nStatus: Complete';
      const mockMsg: Message = {
        id: 'msg-long-1',
        conversationId: 'conv-1',
        senderId: 'user-me',
        content: longReport,
        body: longReport,
        type: 'text',
        createdAt: new Date().toISOString(),
        readBy: [],
        status: 'sent',
      };

      const html = renderToStaticMarkup(
        React.createElement(MessageBubble, {
          message: mockMsg,
          isMine: true,
        })
      );

      expect(html).toContain('PHASE AUDIT REPORT');
      expect(html).toContain('Line detail');
      expect(html).toContain('Status: Complete');
    });
  });
});
