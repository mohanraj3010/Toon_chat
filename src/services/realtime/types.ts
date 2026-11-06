import type {
  ChatAckPayload,
  ChatDeliveredBroadcastPayload,
  ChatMessagePayload,
  ChatReadBroadcastPayload,
  ChatTypingBroadcastPayload,
  ConnectionReadyPayload,
  ErrorPayload,
  PongPayload,
} from './dto';

export type RealtimeConnectionStatus = 'offline' | 'connecting' | 'connected' | 'reconnecting';

export interface RealtimeServiceEvents {
  'status': (status: RealtimeConnectionStatus) => void;
  'connection.ready': (payload: ConnectionReadyPayload) => void;
  'server.pong': (payload: PongPayload) => void;
  'chat.ack': (payload: ChatAckPayload) => void;
  'chat.message': (payload: ChatMessagePayload) => void;
  'chat.read': (payload: ChatReadBroadcastPayload) => void;
  'chat.delivered': (payload: ChatDeliveredBroadcastPayload) => void;
  'chat.typing': (payload: ChatTypingBroadcastPayload) => void;
  'error': (payload: ErrorPayload) => void;
}

export type RealtimeEventName = keyof RealtimeServiceEvents;
export type RealtimeEventHandler<K extends RealtimeEventName> = RealtimeServiceEvents[K];

export interface RealtimeServiceConfig {
  apiUrl?: string;
  wsUrl?: string;
  heartbeatIntervalSec?: number;
  pongTimeoutMs?: number;
  maxReconnectAttempts?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
}
