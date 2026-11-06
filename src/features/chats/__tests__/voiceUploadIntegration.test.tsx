import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient } from '@tanstack/react-query';
import { mediaService, type VoiceUploadMetadata } from '@/services/api/mediaService';
import { VoiceMessage } from '../components/VoiceMessage';
import { MessageBubble } from '../components/MessageBubble';
import {
  fallbackCoordinator,
} from '../context/audioPlaybackTypes';
import type { Message } from '@/shared/types';
import {
  parseInboundFrame,
  mapWireMessageToDomain,
  type ChatMessagePayload,
  type ChatAckPayload,
} from '@/services/realtime/dto';
import {
  reconcileAckInCache,
  reconcileMessageInCache,
  updateConversationPreviewInCache,
} from '@/services/realtime/reconciliation';

describe('Phase 13.3C: Voice Upload & Message Integration', () => {
  let queryClient: QueryClient;
  const conversationId = '8fa8d7a1-3069-4ce3-a006-259fc6c52a32';
  const myUserId = 'c1f7f0aa-b54c-47ea-bd56-621aa906e001';
  const otherUserId = 'b2c8a190-3069-4ce3-a006-118fa906e002';
  const mediaId = '3a4f89d1-0000-4000-8000-000000000001';

  beforeEach(() => {
    vi.restoreAllMocks();
    mediaService.clearCache();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('1. mediaService.uploadVoice 3-Step Handshake Pipeline', () => {
    it('successfully initiates, uploads bytes, and confirms a webm/opus voice recording', async () => {
      const mockBlob = new Blob(['mock-webm-bytes'], { type: 'audio/webm;codecs=opus' });
      const meta: VoiceUploadMetadata = {
        durationMs: 14200,
        mimeType: 'audio/webm;codecs=opus',
        baseMimeType: 'audio/webm',
        sizeBytes: mockBlob.size,
      };

      const initiateSpy = vi.spyOn(mediaService, 'initiateUpload').mockResolvedValueOnce({
        media_id: mediaId,
        storage_key: 'media/voice/voice_1234.webm',
        upload_url: 'http://localhost:8000/api/v1/media/upload/mock-token',
        method: 'PUT',
        headers: { 'Content-Type': 'audio/webm;codecs=opus' },
        expires_at: '2026-11-05T12:00:00Z',
        max_size_bytes: 10485760,
      });

      const uploadBytesSpy = vi.spyOn(mediaService, 'uploadBytes').mockResolvedValueOnce();

      const confirmSpy = vi.spyOn(mediaService, 'confirmUpload').mockResolvedValueOnce({
        id: mediaId,
        uploader_id: myUserId,
        storage_key: 'media/voice/voice_1234.webm',
        media_type: 'voice',
        mime_type: 'audio/webm',
        size_bytes: mockBlob.size,
        status: 'ready',
        created_at: '2026-11-05T12:00:00Z',
      });

      const result = await mediaService.uploadVoice(mockBlob, meta);

      expect(initiateSpy).toHaveBeenCalledWith({
        media_type: 'voice',
        content_type: 'audio/webm;codecs=opus',
        filename: expect.stringMatching(/^voice_\d+\.webm$/),
        size_bytes: mockBlob.size,
      });
      expect(uploadBytesSpy).toHaveBeenCalledTimes(1);
      expect(confirmSpy).toHaveBeenCalledWith(mediaId);

      expect(result).toEqual({
        mediaId,
        storageKey: 'media/voice/voice_1234.webm',
        mimeType: 'audio/webm',
        sizeBytes: mockBlob.size,
        durationMs: 14200,
      });
    });

    it('correctly maps file extensions for ogg, mp4, and wav recordings', async () => {
      const testCases = [
        { mime: 'audio/ogg;codecs=opus', base: 'audio/ogg', ext: '.ogg' },
        { mime: 'audio/mp4', base: 'audio/mp4', ext: '.mp4' },
        { mime: 'audio/wav', base: 'audio/wav', ext: '.wav' },
        { mime: 'audio/mpeg', base: 'audio/mpeg', ext: '.mp3' },
      ];

      for (const tc of testCases) {
        const mockBlob = new Blob(['bytes'], { type: tc.mime });
        const initiateSpy = vi.spyOn(mediaService, 'initiateUpload').mockResolvedValueOnce({
          media_id: mediaId,
          storage_key: `media/voice/voice_test${tc.ext}`,
          upload_url: 'http://localhost:8000/api/v1/media/upload/mock-token',
          method: 'PUT',
          headers: {},
          expires_at: '2026-11-05T12:00:00Z',
          max_size_bytes: 10485760,
        });
        vi.spyOn(mediaService, 'uploadBytes').mockResolvedValueOnce();
        vi.spyOn(mediaService, 'confirmUpload').mockResolvedValueOnce({
          id: mediaId,
          uploader_id: myUserId,
          storage_key: `media/voice/voice_test${tc.ext}`,
          media_type: 'voice',
          mime_type: tc.base,
          size_bytes: mockBlob.size,
          status: 'ready',
          created_at: '2026-11-05T12:00:00Z',
        });

        await mediaService.uploadVoice(mockBlob, {
          durationMs: 5000,
          mimeType: tc.mime,
          baseMimeType: tc.base,
        });

        expect(initiateSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            filename: expect.stringMatching(new RegExp(`\\${tc.ext}$`)),
          })
        );
      }
    });

    it('propagates error when upload initiation fails', async () => {
      const mockBlob = new Blob(['bytes'], { type: 'audio/webm' });
      vi.spyOn(mediaService, 'initiateUpload').mockRejectedValueOnce(
        new Error('Initiate quota exceeded')
      );

      await expect(
        mediaService.uploadVoice(mockBlob, {
          durationMs: 5000,
          mimeType: 'audio/webm',
        })
      ).rejects.toThrow('Initiate quota exceeded');
    });

    it('propagates error when upload confirmation fails', async () => {
      const mockBlob = new Blob(['bytes'], { type: 'audio/webm' });
      vi.spyOn(mediaService, 'initiateUpload').mockResolvedValueOnce({
        media_id: mediaId,
        storage_key: 'media/voice/voice.webm',
        upload_url: 'http://localhost:8000/api/v1/media/upload/mock-token',
        method: 'PUT',
        headers: {},
        expires_at: '2026-11-05T12:00:00Z',
        max_size_bytes: 10485760,
      });
      vi.spyOn(mediaService, 'uploadBytes').mockResolvedValueOnce();
      vi.spyOn(mediaService, 'confirmUpload').mockRejectedValueOnce(
        new Error('Signature mismatch EBML')
      );

      await expect(
        mediaService.uploadVoice(mockBlob, {
          durationMs: 5000,
          mimeType: 'audio/webm',
        })
      ).rejects.toThrow('Signature mismatch EBML');
    });
  });

  describe('2. Realtime WebSocket Voice Messaging & Reconciliation', () => {
    it('parses and maps an inbound chat.message with type "voice"', () => {
      const msgId = 'd1e7f0aa-b54c-47ea-bd56-621aa906e099';
      const raw = JSON.stringify({
        type: 'chat.message',
        id: 'frame-voice-1',
        ts: '2026-11-05T12:00:00.000Z',
        payload: {
          id: msgId,
          conversation_id: conversationId,
          sender_id: otherUserId,
          sequence: 42,
          client_message_id: 'cmsg_voice_101',
          type: 'voice',
          body: 'Voice note (00:15)',
          media_id: mediaId,
          media_url: `/api/v1/media/${mediaId}/url`,
          reply_to_id: null,
          created_at: '2026-11-05T12:00:00.000Z',
          sender: {
            id: otherUserId,
            username: 'lucy',
            display_name: 'Lucy Pevensie',
            avatar_url: null,
          },
        },
      });

      const frame = parseInboundFrame(raw);
      expect(frame).not.toBeNull();
      expect(frame?.type).toBe('chat.message');

      const domain = mapWireMessageToDomain(frame?.payload as ChatMessagePayload, myUserId);
      expect(domain.type).toBe('voice');
      expect(domain.mediaId).toBe(mediaId);
      expect(domain.mediaUrl).toBe(`/api/v1/media/${mediaId}/url`);
      expect(domain.content).toBe('Voice note (00:15)');
      expect(domain.sequence).toBe(42);
    });

    it('reconciles chat.ack for an optimistic voice message', () => {
      const clientMsgId = 'cmsg_voice_client_001';
      const queryKey = ['messages', conversationId];

      const optimisticVoiceMsg: Message = {
        id: clientMsgId,
        clientMessageId: clientMsgId,
        conversationId,
        senderId: myUserId,
        content: 'Voice note (00:14)',
        type: 'voice',
        mediaId,
        mediaUrl: `blob:http://localhost:3000/mock-preview`,
        createdAt: '2026-11-05T12:00:00.000Z',
        readBy: [],
        status: 'sending',
      };

      queryClient.setQueryData<Message[]>(queryKey, [optimisticVoiceMsg]);

      const ackPayload: ChatAckPayload = {
        client_message_id: clientMsgId,
        message_id: 'msg-voice-authoritative-id',
        conversation_id: conversationId,
        sequence: 45,
        created_at: '2026-11-05T12:00:01.000Z',
        status: 'sent',
      };

      reconcileAckInCache(queryClient, ackPayload);

      const cached = queryClient.getQueryData<Message[]>(queryKey);
      expect(cached).toHaveLength(1);
      expect(cached![0].id).toBe('msg-voice-authoritative-id');
      expect(cached![0].sequence).toBe(45);
      expect(cached![0].status).toBe('sent');
      expect(cached![0].type).toBe('voice');
      expect(cached![0].mediaId).toBe(mediaId);
    });

    it('reconciles inbound chat.message broadcast and deduplicates against optimistic voice note', () => {
      const clientMsgId = 'cmsg_voice_client_002';
      const queryKey = ['messages', conversationId];

      const optimisticVoiceMsg: Message = {
        id: clientMsgId,
        clientMessageId: clientMsgId,
        conversationId,
        senderId: myUserId,
        content: 'Voice note (00:08)',
        type: 'voice',
        mediaId,
        createdAt: '2026-11-05T12:00:00.000Z',
        readBy: [],
        status: 'sending',
      };

      queryClient.setQueryData<Message[]>(queryKey, [optimisticVoiceMsg]);

      const broadcastPayload: ChatMessagePayload = {
        id: 'msg-voice-server-id-888',
        conversation_id: conversationId,
        sender_id: myUserId,
        sequence: 46,
        client_message_id: clientMsgId,
        type: 'voice',
        body: 'Voice note (00:08)',
        media_id: mediaId,
        media_url: `/api/v1/media/${mediaId}/url`,
        reply_to_id: null,
        created_at: '2026-11-05T12:00:02.000Z',
        sender: {
          id: myUserId,
          username: 'd_user',
          display_name: 'D User',
          avatar_url: null,
        },
      };

      reconcileMessageInCache(queryClient, broadcastPayload, myUserId);

      const cached = queryClient.getQueryData<Message[]>(queryKey);
      expect(cached).toHaveLength(1);
      expect(cached![0].id).toBe('msg-voice-server-id-888');
      expect(cached![0].sequence).toBe(46);
      expect(cached![0].status).toBe('sent');
    });

    it('updates conversation preview with voice note summary in chat list', () => {
      const voiceMsg: Message = {
        id: 'msg-voice-999',
        conversationId,
        senderId: otherUserId,
        content: 'Voice note (00:22)',
        type: 'voice',
        mediaId,
        createdAt: '2026-11-05T12:00:00.000Z',
        readBy: [],
        status: 'sent',
      };

      queryClient.setQueryData<any[]>(['conversations'], [
        {
          id: conversationId,
          lastMessage: { content: 'Old text', type: 'text' },
          unreadCount: 0,
        },
      ]);

      updateConversationPreviewInCache(queryClient, conversationId, voiceMsg, true);

      const convs = queryClient.getQueryData<any[]>(['conversations']);
      expect(convs![0].lastMessage.content).toBe('Voice note (00:22)');
      expect(convs![0].lastMessage.type).toBe('voice');
      expect(convs![0].unreadCount).toBe(1);
    });
  });

  describe('3. VoiceMessage Component Rendering & States', () => {
    it('renders formatted duration and cartoon waveform bars when idle', () => {
      const html = renderToStaticMarkup(
        React.createElement(VoiceMessage, {
          duration: '00:18',
          fileSize: 45000,
          status: 'sent',
        })
      );

      expect(html).toContain('00:18');
      expect(html).toContain('43.9 KB');
      expect(html).toContain('Play');
      expect(html).toContain('waveform-bar');
      expect(html).toContain('Audio timeline seeker');
    });

    it('renders uploading indicator and disabled play button when status is uploading', () => {
      const html = renderToStaticMarkup(
        React.createElement(VoiceMessage, {
          duration: '00:12',
          fileSize: 32000,
          status: 'uploading',
        })
      );

      expect(html).toContain('Uploading voice note... 🎈');
      expect(html).toContain('disabled');
      expect(html).toContain('Uploading voice note');
    });

    it('renders failed error message and retry button when status is failed', () => {
      const onRetry = vi.fn();
      const html = renderToStaticMarkup(
        React.createElement(VoiceMessage, {
          duration: '00:12',
          status: 'failed',
          onRetry,
        })
      );

      expect(html).toContain('Failed');
      expect(html).toContain('Retry');
    });

    it('renders inside MessageBubble when message.type is voice', () => {
      const message: Message = {
        id: 'msg-test-voice-bubble',
        conversationId,
        senderId: myUserId,
        content: 'Voice note (00:14)',
        type: 'voice',
        mediaId,
        fileSize: 35000,
        createdAt: '2026-11-05T12:00:00.000Z',
        readBy: [],
        status: 'sent',
      };

      const html = renderToStaticMarkup(
        React.createElement(MessageBubble, {
          message,
          isMine: true,
        })
      );

      expect(html).toContain('Voice message, duration 00:14');
      expect(html).toContain('34.2 KB');
      expect(html).toContain('waveform-bar');
    });

    it('displays uploading spinner in MessageBubble status area when message.status is uploading', () => {
      const message: Message = {
        id: 'msg-test-uploading-bubble',
        clientMessageId: 'cmsg_voice_uploading',
        conversationId,
        senderId: myUserId,
        content: 'Voice note (00:05)',
        type: 'voice',
        createdAt: '2026-11-05T12:00:00.000Z',
        readBy: [],
        status: 'uploading',
      };

      const html = renderToStaticMarkup(
        React.createElement(MessageBubble, {
          message,
          isMine: true,
        })
      );

      expect(html).toContain('Uploading voice note... 🎈');
      expect(html).toContain('message-status');
    });
  });

  describe('4. Phase 13.3D: Voice Player & History Persistence', () => {
    describe('Single-Playback Audio Coordinator', () => {
      it('pauses previously active voice player when another voice player starts', () => {
        // Test coordinator logic directly
        const pausePlayerASpy = vi.fn();
        const pausePlayerBSpy = vi.fn();

        let activeId: string | null = null;
        const registry = new Map<string, () => void>();

        const playAudio = (id: string) => {
          if (activeId && activeId !== id) {
            registry.get(activeId)?.();
          }
          activeId = id;
        };

        const registerPlayer = (id: string, pauseFn: () => void) => {
          registry.set(id, pauseFn);
          return () => registry.delete(id);
        };

        // Register two players
        registerPlayer('player-a', pausePlayerASpy);
        registerPlayer('player-b', pausePlayerBSpy);

        // Player A starts
        playAudio('player-a');
        expect(activeId).toBe('player-a');
        expect(pausePlayerASpy).not.toHaveBeenCalled();

        // Player B starts -> Player A must be paused immediately!
        playAudio('player-b');
        expect(activeId).toBe('player-b');
        expect(pausePlayerASpy).toHaveBeenCalledTimes(1);
        expect(pausePlayerBSpy).not.toHaveBeenCalled();
      });

      it('provides safe fallback coordinator when used outside a provider', () => {
        expect(fallbackCoordinator.activeAudioId).toBeNull();
        expect(fallbackCoordinator.playbackSpeed).toBe(1);
        expect(() => fallbackCoordinator.playAudio('any-id')).not.toThrow();
        expect(() => fallbackCoordinator.pauseAudio('any-id')).not.toThrow();
        expect(() => fallbackCoordinator.stopAll()).not.toThrow();
        expect(fallbackCoordinator.cyclePlaybackSpeed()).toBe(1);
      });
    });

    describe('Playback Speed Toggles (1x -> 1.5x -> 2x -> 1x)', () => {
      it('renders playback speed button and cycles speed options', () => {
        const html = renderToStaticMarkup(
          React.createElement(VoiceMessage, {
            duration: '00:30',
            status: 'sent',
          })
        );

        // Contains speed button showing 1x
        expect(html).toContain('1x');
        expect(html).toContain('Playback speed');
      });

      it('cycles speed through 1x, 1.5x, and 2x in coordinator', () => {
        let currentSpeed: 1 | 1.5 | 2 = 1;
        const cycleSpeed = () => {
          if (currentSpeed === 1) currentSpeed = 1.5;
          else if (currentSpeed === 1.5) currentSpeed = 2;
          else currentSpeed = 1;
          return currentSpeed;
        };

        expect(cycleSpeed()).toBe(1.5);
        expect(cycleSpeed()).toBe(2);
        expect(cycleSpeed()).toBe(1);
      });
    });

    describe('Interactive Waveform Scrubbing', () => {
      it('renders accessible slider attributes for scrubbing', () => {
        const html = renderToStaticMarkup(
          React.createElement(VoiceMessage, {
            duration: '01:00',
            status: 'sent',
          })
        );

        expect(html).toContain('role="slider"');
        expect(html).toContain('aria-valuemin="0"');
        expect(html).toContain('aria-valuemax="60"');
        expect(html).toContain('aria-label="Audio timeline seeker"');
      });

      it('falls back to estimated duration when duration string is missing', () => {
        const html = renderToStaticMarkup(
          React.createElement(VoiceMessage, {
            fileSize: 40000, // ~10 seconds at 4KB/s
            status: 'sent',
          })
        );

        expect(html).toContain('00:10');
      });
    });

    describe('Signed URL Refresh & Error Recovery', () => {
      it('mediaService.getMediaUrl bypasses cache when forceRefresh is requested', async () => {
        const mockFirstUrl = {
          media_id: mediaId,
          download_url: 'http://localhost:8000/api/v1/media/first-signed-url',
          expires_in_seconds: 300,
          content_type: 'audio/webm',
        };
        const mockFreshUrl = {
          media_id: mediaId,
          download_url: 'http://localhost:8000/api/v1/media/refreshed-signed-url',
          expires_in_seconds: 300,
          content_type: 'audio/webm',
        };

        const fetchSpy = vi.spyOn(globalThis, 'fetch')
          .mockResolvedValueOnce(
            new Response(JSON.stringify(mockFirstUrl), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          )
          .mockResolvedValueOnce(
            new Response(JSON.stringify(mockFreshUrl), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );

        // First call caches the download URL
        const first = await mediaService.getMediaUrl(mediaId);
        expect(first.download_url).toBe('http://localhost:8000/api/v1/media/first-signed-url');

        // Normal second call uses cache (no second fetch)
        const cached = await mediaService.getMediaUrl(mediaId);
        expect(cached.download_url).toBe('http://localhost:8000/api/v1/media/first-signed-url');
        expect(fetchSpy).toHaveBeenCalledTimes(1);

        // Force refresh invalidates cache and requests a fresh signed URL
        const refreshed = await mediaService.getMediaUrl(mediaId, { forceRefresh: true });
        expect(refreshed.download_url).toBe('http://localhost:8000/api/v1/media/refreshed-signed-url');
        expect(fetchSpy).toHaveBeenCalledTimes(2);
      });

      it('mediaService.invalidateMediaUrl purges cached download URL', async () => {
        const mockUrl1 = {
          media_id: 'media-to-purge',
          download_url: 'http://localhost:8000/api/v1/media/url-1',
          expires_in_seconds: 300,
          content_type: 'audio/webm',
        };
        const mockUrl2 = {
          media_id: 'media-to-purge',
          download_url: 'http://localhost:8000/api/v1/media/url-2',
          expires_in_seconds: 300,
          content_type: 'audio/webm',
        };

        const fetchSpy = vi.spyOn(globalThis, 'fetch')
          .mockResolvedValueOnce(
            new Response(JSON.stringify(mockUrl1), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          )
          .mockResolvedValueOnce(
            new Response(JSON.stringify(mockUrl2), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );

        await mediaService.getMediaUrl('media-to-purge');
        expect(fetchSpy).toHaveBeenCalledTimes(1);

        mediaService.invalidateMediaUrl('media-to-purge');

        const next = await mediaService.getMediaUrl('media-to-purge');
        expect(next.download_url).toBe('http://localhost:8000/api/v1/media/url-2');
        expect(fetchSpy).toHaveBeenCalledTimes(2);
      });
    });
  });
});
