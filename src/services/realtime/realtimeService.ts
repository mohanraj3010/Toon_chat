import { apiClient } from '@/services/api/httpClient';
import {
  parseInboundFrame,
  RealtimeTicketResponseSchema,
  type ChatDeliveredWirePayload,
  type ChatReadWirePayload,
  type ChatSendWirePayload,
  type ChatTypingWirePayload,
  type ConnectionReadyPayload,
  type OutboundEnvelope,
  type PongPayload,
} from './dto';
import type {
  RealtimeConnectionStatus,
  RealtimeEventName,
  RealtimeServiceConfig,
  RealtimeServiceEvents,
} from './types';

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class RealtimeService {
  private socket: WebSocket | null = null;
  private status: RealtimeConnectionStatus = 'offline';
  private currentUserId: string | null = null;
  private sessionId: string | null = null;

  private heartbeatIntervalSec = 30;
  private pongTimeoutMs = 10000;
  private pingIntervalTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 15;
  private baseBackoffMs = 1000;
  private maxBackoffMs = 30000;

  private isExplicitlyClosed = false;
  private isConnecting = false;

  private listeners = new Map<RealtimeEventName, Set<Function>>();
  private pendingOutboundQueue: Array<string> = [];
  private maxQueueSize = 50;

  private config: RealtimeServiceConfig;
  private boundOnlineHandler: (() => void) | null = null;
  private boundVisibilityHandler: (() => void) | null = null;
  private boundSessionExpiredHandler: (() => void) | null = null;

  constructor(config: RealtimeServiceConfig = {}) {
    this.config = config;
    if (config.heartbeatIntervalSec) this.heartbeatIntervalSec = config.heartbeatIntervalSec;
    if (config.pongTimeoutMs) this.pongTimeoutMs = config.pongTimeoutMs;
    if (config.maxReconnectAttempts) this.maxReconnectAttempts = config.maxReconnectAttempts;
    if (config.baseBackoffMs) this.baseBackoffMs = config.baseBackoffMs;
    if (config.maxBackoffMs) this.maxBackoffMs = config.maxBackoffMs;

    this.setupWindowListeners();
  }

  // ==========================================
  // Event Subscription
  // ==========================================

  public on<K extends RealtimeEventName>(event: K, handler: RealtimeServiceEvents[K]): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(handler);

    return () => {
      set.delete(handler);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  private emit<K extends RealtimeEventName>(event: K, ...args: Parameters<RealtimeServiceEvents[K]>): void {
    const set = this.listeners.get(event);
    if (!set) return;

    for (const handler of set) {
      try {
        (handler as (...a: unknown[]) => void)(...args);
      } catch (err) {
        console.error(`Error in realtime event handler for '${event}':`, err);
      }
    }
  }

  private setStatus(newStatus: RealtimeConnectionStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.emit('status', newStatus);
    }
  }

  public getStatus(): RealtimeConnectionStatus {
    return this.status;
  }

  public getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  public getSessionId(): string | null {
    return this.sessionId;
  }

  // ==========================================
  // Connection Lifecycle
  // ==========================================

  public async connect(): Promise<void> {
    if (this.isConnecting) return;
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isExplicitlyClosed = false;
    this.isConnecting = true;
    this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    try {
      // Step 1: Request short-lived single-use ticket via Bearer Auth REST endpoint
      const ticketRes = await this.acquireTicket();
      if (!ticketRes) {
        this.isConnecting = false;
        this.scheduleReconnect();
        return;
      }

      // Step 2: Build WebSocket URL with single-use ticket
      const wsUrl = this.buildWebSocketUrl(ticketRes.ticket);

      // Step 3: Instantiate native browser WebSocket
      this.cleanupSocket();
      const socket = new WebSocket(wsUrl);
      this.socket = socket;

      socket.onopen = () => {
        if (this.socket !== socket) return;
        this.isConnecting = false;
        // Do not mark 'connected' yet; wait for connection.ready frame from server
      };

      socket.onmessage = (event: MessageEvent) => {
        if (this.socket !== socket) return;
        this.handleInboundMessage(event.data);
      };

      socket.onerror = (event: Event) => {
        if (this.socket !== socket) return;
        console.warn('ToonChat Realtime WebSocket error:', event);
      };

      socket.onclose = (event: CloseEvent) => {
        if (this.socket !== socket) return;
        this.handleSocketClose(event);
      };
    } catch (err) {
      this.isConnecting = false;
      console.warn('Realtime connection establishment failed:', err);
      this.scheduleReconnect();
    }
  }

  public disconnect(reason = 'CLIENT_DISCONNECT', permanent = false): void {
    this.isExplicitlyClosed = permanent;
    this.clearTimers();

    if (this.socket) {
      try {
        if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
          this.socket.close(1000, reason);
        }
      } catch {
        // Ignore close errors
      }
      this.cleanupSocket();
    }

    this.currentUserId = null;
    this.sessionId = null;
    this.isConnecting = false;
    this.setStatus('offline');
  }

  // ==========================================
  // Ticket Acquisition & Handshake URL
  // ==========================================

  private async acquireTicket(): Promise<{ ticket: string; expires_in: number; user_id: string } | null> {
    try {
      const data = await apiClient.post<unknown>('/realtime/ticket');
      const parsed = RealtimeTicketResponseSchema.safeParse(data);
      if (parsed.success) {
        return parsed.data;
      }
      console.error('Ticket response validation error:', parsed.error);
      return null;
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 401 || status === 403) {
        console.warn('Authentication rejected during ticket acquisition. Aborting reconnect.');
        this.disconnect('UNAUTHORIZED', true);
        return null;
      }
      console.warn('Failed to obtain realtime ticket:', err);
      return null;
    }
  }

  private buildWebSocketUrl(ticket: string): string {
    if (this.config.wsUrl) {
      const base = this.config.wsUrl.replace(/\/+$/, '');
      return `${base}/api/v1/realtime/ws?ticket=${encodeURIComponent(ticket)}`;
    }

    // Derive from apiClient API_BASE or window location
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    let wsBase: string;

    if (apiBase.startsWith('http://')) {
      wsBase = apiBase.replace('http://', 'ws://');
    } else if (apiBase.startsWith('https://')) {
      wsBase = apiBase.replace('https://', 'wss://');
    } else if (apiBase.startsWith('/')) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsBase = `${protocol}//${window.location.host}${apiBase}`;
    } else {
      wsBase = `ws://localhost:8000/api/v1`;
    }

    const cleanBase = wsBase.replace(/\/+$/, '');
    return `${cleanBase}/realtime/ws?ticket=${encodeURIComponent(ticket)}`;
  }

  // ==========================================
  // Message & Frame Ingestion
  // ==========================================

  private handleInboundMessage(rawText: unknown): void {
    if (typeof rawText !== 'string') return;

    const frame = parseInboundFrame(rawText);
    if (!frame) {
      console.warn('Received unparseable or schema-violating WebSocket frame.');
      return;
    }

    switch (frame.type) {
      case 'connection.ready':
        this.handleConnectionReady(frame.payload);
        this.emit('connection.ready', frame.payload);
        break;

      case 'server.pong':
        this.handleServerPong(frame.payload);
        this.emit('server.pong', frame.payload);
        break;

      case 'chat.ack':
        this.emit('chat.ack', frame.payload);
        break;

      case 'chat.message':
        this.emit('chat.message', frame.payload);
        break;

      case 'chat.read':
        this.emit('chat.read', frame.payload);
        break;

      case 'chat.delivered':
        this.emit('chat.delivered', frame.payload);
        break;

      case 'chat.typing':
        this.emit('chat.typing', frame.payload);
        break;

      case 'error':
        this.emit('error', frame.payload);
        break;

      default:
        // Unknown frame type
        break;
    }
  }

  private handleConnectionReady(payload: ConnectionReadyPayload): void {
    this.currentUserId = payload.user_id;
    this.sessionId = payload.session_id;
    this.reconnectAttempts = 0;
    this.isConnecting = false;

    if (payload.heartbeat_interval_sec && payload.heartbeat_interval_sec > 0) {
      this.heartbeatIntervalSec = payload.heartbeat_interval_sec;
    }

    this.setStatus('connected');
    this.startHeartbeat();
    this.flushPendingOutboundQueue();
  }

  private handleServerPong(_payload: PongPayload): void {
    if (this.pongTimeoutTimer) {
      clearTimeout(this.pongTimeoutTimer);
      this.pongTimeoutTimer = null;
    }
  }

  private handleSocketClose(event: CloseEvent): void {
    this.cleanupSocket();
    this.clearHeartbeat();
    this.isConnecting = false;

    // Terminal codes where reconnection is prohibited
    if (
      this.isExplicitlyClosed ||
      event.code === 1000 || // Normal closure
      event.code === 4403    // Forbidden user
    ) {
      this.setStatus('offline');
      return;
    }

    // Schedule exponential backoff reconnect
    this.setStatus('reconnecting');
    this.scheduleReconnect();
  }

  // ==========================================
  // Heartbeat & Dead-Socket Detection
  // ==========================================

  private startHeartbeat(): void {
    this.clearHeartbeat();

    this.pingIntervalTimer = setInterval(() => {
      if (this.status !== 'connected' || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
        return;
      }

      const pingId = generateUuid();
      const pingFrame: OutboundEnvelope<Record<string, never>> = {
        type: 'client.ping',
        id: pingId,
        ts: new Date().toISOString(),
        payload: {},
      };

      try {
        this.socket.send(JSON.stringify(pingFrame));
      } catch {
        this.onPongTimeout();
        return;
      }

      // 10-second deadline for pong response
      this.pongTimeoutTimer = setTimeout(() => {
        this.onPongTimeout();
      }, this.pongTimeoutMs);
    }, this.heartbeatIntervalSec * 1000);
  }

  private onPongTimeout(): void {
    console.warn('Realtime heartbeat pong timed out! Flagging half-open socket and reconnecting.');
    this.clearHeartbeat();
    if (this.socket) {
      try {
        this.socket.close(1008, 'PONG_TIMEOUT');
      } catch {
        // Ignore
      }
    }
    this.handleSocketClose(new CloseEvent('close', { code: 1008, reason: 'PONG_TIMEOUT' }));
  }

  private clearHeartbeat(): void {
    if (this.pingIntervalTimer) {
      clearInterval(this.pingIntervalTimer);
      this.pingIntervalTimer = null;
    }
    if (this.pongTimeoutTimer) {
      clearTimeout(this.pongTimeoutTimer);
      this.pongTimeoutTimer = null;
    }
  }

  // ==========================================
  // Reconnection with Full Jitter
  // ==========================================

  private scheduleReconnect(): void {
    if (this.isExplicitlyClosed) return;
    if (this.reconnectTimer) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn(`Exceeded maximum reconnect attempts (${this.maxReconnectAttempts}). Transitioning to offline.`);
      this.setStatus('offline');
      return;
    }

    const attempt = this.reconnectAttempts;
    this.reconnectAttempts += 1;

    // Full jitter exponential backoff: (0.8 + random * 0.4) * min(maxBackoff, baseBackoff * 2^attempt)
    const exponential = Math.min(this.maxBackoffMs, this.baseBackoffMs * Math.pow(2, attempt));
    const jitter = 0.8 + Math.random() * 0.4;
    const delay = Math.round(jitter * exponential);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isExplicitlyClosed) {
        this.connect();
      }
    }, delay);
  }

  // ==========================================
  // Outbound Senders & Bounded Queue
  // ==========================================

  public sendChatMessage(payload: ChatSendWirePayload): boolean {
    const frame: OutboundEnvelope<ChatSendWirePayload> = {
      type: 'chat.send',
      id: generateUuid(),
      ts: new Date().toISOString(),
      payload,
    };
    return this.sendRawEnvelope(frame);
  }

  public sendReadReceipt(payload: ChatReadWirePayload): boolean {
    const frame: OutboundEnvelope<ChatReadWirePayload> = {
      type: 'chat.read',
      id: generateUuid(),
      ts: new Date().toISOString(),
      payload,
    };
    return this.sendRawEnvelope(frame);
  }

  public sendTyping(payload: ChatTypingWirePayload): boolean {
    const frame: OutboundEnvelope<ChatTypingWirePayload> = {
      type: 'chat.typing',
      id: generateUuid(),
      ts: new Date().toISOString(),
      payload,
    };
    return this.sendRawEnvelope(frame);
  }

  public sendDeliveryReceipt(payload: ChatDeliveredWirePayload): boolean {
    const frame: OutboundEnvelope<ChatDeliveredWirePayload> = {
      type: 'chat.delivered',
      id: generateUuid(),
      ts: new Date().toISOString(),
      payload,
    };
    return this.sendRawEnvelope(frame);
  }

  private sendRawEnvelope<T>(envelope: OutboundEnvelope<T>): boolean {
    const serialized = JSON.stringify(envelope);

    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.status === 'connected') {
      try {
        this.socket.send(serialized);
        return true;
      } catch (err) {
        console.warn('Failed to send frame over open socket:', err);
      }
    }

    // Queue bounded non-ephemeral messages (chat.send) when offline/reconnecting
    if (envelope.type === 'chat.send') {
      if (this.pendingOutboundQueue.length >= this.maxQueueSize) {
        // Discard oldest to avoid memory leaks
        this.pendingOutboundQueue.shift();
      }
      this.pendingOutboundQueue.push(serialized);
    }

    return false;
  }

  private flushPendingOutboundQueue(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    while (this.pendingOutboundQueue.length > 0) {
      const nextFrame = this.pendingOutboundQueue.shift();
      if (nextFrame) {
        try {
          this.socket.send(nextFrame);
        } catch (err) {
          console.warn('Failed to flush queued frame:', err);
          this.pendingOutboundQueue.unshift(nextFrame);
          break;
        }
      }
    }
  }

  // ==========================================
  // Window & Lifecycle Listeners
  // ==========================================

  private setupWindowListeners(): void {
    if (typeof window === 'undefined') return;

    this.boundOnlineHandler = () => {
      if (this.status === 'offline' && !this.isExplicitlyClosed) {
        this.reconnectAttempts = 0;
        this.connect();
      }
    };
    window.addEventListener('online', this.boundOnlineHandler);

    this.boundVisibilityHandler = () => {
      if (document.visibilityState === 'visible' && this.status === 'offline' && !this.isExplicitlyClosed) {
        this.reconnectAttempts = 0;
        this.connect();
      }
    };
    document.addEventListener('visibilitychange', this.boundVisibilityHandler);

    this.boundSessionExpiredHandler = () => {
      this.disconnect('SESSION_EXPIRED', true);
    };
    window.addEventListener('toonchat:session-expired', this.boundSessionExpiredHandler);
  }

  public destroy(): void {
    this.disconnect('SERVICE_DESTROYED', true);

    if (typeof window !== 'undefined') {
      if (this.boundOnlineHandler) {
        window.removeEventListener('online', this.boundOnlineHandler);
        this.boundOnlineHandler = null;
      }
      if (this.boundVisibilityHandler) {
        document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
        this.boundVisibilityHandler = null;
      }
      if (this.boundSessionExpiredHandler) {
        window.removeEventListener('toonchat:session-expired', this.boundSessionExpiredHandler);
        this.boundSessionExpiredHandler = null;
      }
    }

    this.listeners.clear();
    this.pendingOutboundQueue = [];
  }

  private cleanupSocket(): void {
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
      this.socket = null;
    }
  }

  private clearTimers(): void {
    this.clearHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// Global Singleton Instance
export const realtimeService = new RealtimeService();
