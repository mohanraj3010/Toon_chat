import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RealtimeService } from '../realtimeService';
import { apiClient } from '@/services/api/httpClient';

// Mock browser WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  readyState: number = WebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    // Simulate async connection open
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.onopen?.();
    }, 10);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close(code = 1000, reason = 'NORMAL') {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.({ code, reason });
  }

  simulateServerMessage(msg: unknown) {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }
}

describe('RealtimeService Transport & Connection Lifecycle', () => {
  let service: RealtimeService;

  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    // @ts-expect-error Mock global WebSocket
    global.WebSocket = MockWebSocket;

    vi.spyOn(apiClient, 'post').mockResolvedValue({
      ticket: 'tkt_mock_1234567890abcdef12345678',
      expires_in: 60,
      user_id: 'c1f7f0aa-b54c-47ea-bd56-621aa906e001',
    });

    service = new RealtimeService({
      heartbeatIntervalSec: 5,
      pongTimeoutMs: 2000,
      baseBackoffMs: 100,
      maxBackoffMs: 1000,
      maxReconnectAttempts: 3,
    });
  });

  afterEach(() => {
    service.destroy();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('exchanges short-lived ticket via REST before initiating WebSocket handshake', async () => {
    const connectPromise = service.connect();
    expect(service.getStatus()).toBe('connecting');

    await vi.advanceTimersByTimeAsync(15);
    await connectPromise;

    expect(apiClient.post).toHaveBeenCalledWith('/realtime/ticket');
    expect(MockWebSocket.instances.length).toBe(1);
    expect(MockWebSocket.instances[0].url).toContain('ticket=tkt_mock_1234567890abcdef12345678');
  });

  it('transitions to connected upon receiving connection.ready frame', async () => {
    await service.connect();
    await vi.advanceTimersByTimeAsync(15);

    const ws = MockWebSocket.instances[0];

    // Simulate server emitting connection.ready
    ws.simulateServerMessage({
      type: 'connection.ready',
      id: 'srv_ready',
      ts: new Date().toISOString(),
      payload: {
        user_id: 'c1f7f0aa-b54c-47ea-bd56-621aa906e001',
        session_id: 'sess_999',
        heartbeat_interval_sec: 5,
      },
    });

    expect(service.getStatus()).toBe('connected');
    expect(service.getCurrentUserId()).toBe('c1f7f0aa-b54c-47ea-bd56-621aa906e001');
    expect(service.getSessionId()).toBe('sess_999');
  });

  it('maintains heartbeat loop emitting client.ping every interval', async () => {
    await service.connect();
    await vi.advanceTimersByTimeAsync(15);
    const ws = MockWebSocket.instances[0];

    ws.simulateServerMessage({
      type: 'connection.ready',
      id: 'srv_ready',
      ts: new Date().toISOString(),
      payload: {
        user_id: 'c1f7f0aa-b54c-47ea-bd56-621aa906e001',
        session_id: 'sess_999',
        heartbeat_interval_sec: 5,
      },
    });

    // Advance 5 seconds (heartbeat interval)
    await vi.advanceTimersByTimeAsync(5000);

    const pingMsg = ws.sentMessages.find((m) => m.includes('"type":"client.ping"'));
    expect(pingMsg).toBeDefined();

    // Respond with server.pong before timeout
    ws.simulateServerMessage({
      type: 'server.pong',
      id: 'pong_1',
      ts: new Date().toISOString(),
      payload: { echo_id: 'ping-id' },
    });

    expect(service.getStatus()).toBe('connected');
  });

  it('flags dead socket and reconnects when pong times out', async () => {
    await service.connect();
    await vi.advanceTimersByTimeAsync(15);
    const ws = MockWebSocket.instances[0];

    ws.simulateServerMessage({
      type: 'connection.ready',
      id: 'srv_ready',
      ts: new Date().toISOString(),
      payload: {
        user_id: 'c1f7f0aa-b54c-47ea-bd56-621aa906e001',
        session_id: 'sess_999',
        heartbeat_interval_sec: 5,
      },
    });

    // Advance 5 seconds -> ping is emitted
    await vi.advanceTimersByTimeAsync(5000);

    // Withhold server.pong for 2000ms (configured pongTimeoutMs)
    await vi.advanceTimersByTimeAsync(2050);

    // Socket should close with POLICY_VIOLATION 1008 and trigger reconnect
    expect(ws.readyState).toBe(WebSocket.CLOSED);
    expect(service.getStatus()).toBe('reconnecting');
  });

  it('buffers outbound chat messages in bounded queue when offline and flushes on connect', async () => {
    // Service is offline
    service.sendChatMessage({
      conversation_id: '8fa8d7a1-3069-4ce3-a006-259fc6c52a32',
      client_message_id: 'cmsg_buffered_1',
      type: 'text',
      body: 'Buffered offline message',
      media_id: null,
      media_url: null,
      reply_to_id: null,
    });

    // Now connect
    await service.connect();
    await vi.advanceTimersByTimeAsync(15);
    const ws = MockWebSocket.instances[0];

    ws.simulateServerMessage({
      type: 'connection.ready',
      id: 'srv_ready',
      ts: new Date().toISOString(),
      payload: {
        user_id: 'c1f7f0aa-b54c-47ea-bd56-621aa906e001',
        session_id: 'sess_999',
        heartbeat_interval_sec: 5,
      },
    });

    // Verify buffered message was dispatched immediately upon connection.ready
    const sent = ws.sentMessages.find((m) => m.includes('Buffered offline message'));
    expect(sent).toBeDefined();
  });

  it('does not reconnect indefinitely after explicit disconnect', async () => {
    await service.connect();
    await vi.advanceTimersByTimeAsync(15);

    service.disconnect('USER_LOGOUT', true);
    expect(service.getStatus()).toBe('offline');

    // Advance timers significantly
    await vi.advanceTimersByTimeAsync(60000);

    // No new socket should have been created
    expect(MockWebSocket.instances.length).toBe(1);
    expect(service.getStatus()).toBe('offline');
  });
});
