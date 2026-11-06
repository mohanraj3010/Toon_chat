# TOONCHAT — REALTIME WEBSOCKET PROTOCOL SPECIFICATION
**Document Version:** 1.1.0  
**Phase:** Phase 12 — Realtime Messaging & Presence  
**Status:** Protocol Review & Specification Deliverable (Step 2.1)  
**Target Stack:** FastAPI WebSockets + PostgreSQL 16 + SQLAlchemy 2.0 Async + Redis/In-Memory Pub/Sub + React TanStack Query / Zustand  
**Database Target:** `DB_TARGET=local` (Docker Compose / Local PostgreSQL 16) + Supabase PostgreSQL Cloud Compatible  

---

## 1. Executive Summary & Architectural Scope

ToonChat requires a deterministic, highly resilient realtime transport layer powering:
1. **Low-latency messaging**: Instant message delivery, typing indicators, delivery receipts, read receipts, and cartoon emoji reactions.
2. **Live social presence**: Online/offline status, vibe updates, and multi-tab synchronization.
3. **Spatial presence**: Interactive avatar movements, speeches, waves, and emotes in Maple Park scenes (`park`, `cafe`, `plaza`).

### 1.1 Guiding Principles & Protocol Invariants
- **Strict Frame Envelope**: Every message sent or received across the WebSocket connection adheres to the unified `{type, id, ts, payload}` envelope.
- **Short-Lived Single-Use Tickets**: Long-lived query-string tokens are **strictly prohibited**. WebSockets authenticate via single-use tickets issued over authenticated HTTP REST (`POST /api/v1/realtime/ticket`) with a 60-second TTL.
- **Database as Ground Truth**: PostgreSQL is the immutable source of truth. Realtime WebSockets act as an ephemeral, low-latency notification and dispatch pipe. Realtime publication failures never invalidate a committed database transaction.
- **Monotonic Per-Conversation Sequencing**: Every conversation maintains a strictly increasing `message_seq_counter` in PostgreSQL. Allocations are serialized via row-level locking (`FOR UPDATE`).
- **Sequence Continuity Realism**: The database guarantees monotonic, unique sequence assignment without duplicates. However, clients must recognize that filtered views (e.g. soft-deleted messages) may produce non-contiguous sequence numbers in the user timeline.
- **Idempotent Delivery**: Messages carry a client-generated `client_message_id`. Re-sending a message returns the existing sequence and timestamp without creating duplicate rows.
- **Strict Authorization on Every Frame**: Transport connection does not confer ambient authority. Every frame targeting a conversation validates active membership and block relationships at execution time.
- **Dual Transport Harmony**: WebSockets handle low-latency push notifications and ephemera; REST handles reliable historical catch-up, cursor pagination, and ticket issuance.
- **ToonChat UX Fidelity**: Preserves all cartoon UI cues—tick status transitions (Clock $\rightarrow$ Single Check $\rightarrow$ Double Check Grey $\rightarrow$ Double Check Orange), bouncing sticker trays, and playful animated typing bubbles.

---

## 2. Authentication & Connection Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Client as ToonChat Frontend (React)
    participant REST as FastAPI REST Gateway
    participant Cache as Ticket Store (Memory / Redis)
    participant WS as FastAPI WebSocket Gateway
    participant DB as PostgreSQL 16 Database

    Note over Client,REST: Step 1: Ticket Issuance via Bearer Auth
    Client->>REST: POST /api/v1/realtime/ticket (Authorization: Bearer <Supabase_JWT>)
    REST->>REST: Validate JWT via verify_supabase_jwt()<br/>Extract user_id, check require_active_user()
    REST->>Cache: Store ticket: ticket_id -> {user_id, purpose: "ws_connect", expires_at: now + 60s}
    REST-->>Client: 200 OK { ticket: "tkt_...", expires_in: 60 }

    Note over Client,WS: Step 2: Atomic WebSocket Handshake
    Client->>WS: GET /api/v1/realtime/ws?ticket=tkt_... (Upgrade: websocket)
    WS->>Cache: Atomic GETDEL ticket_id
    alt Ticket invalid, expired, or already consumed
        Cache-->>WS: None
        WS-->>Client: WebSocket Close 4401 ("INVALID_OR_EXPIRED_TICKET")
    else Ticket valid and consumed
        Cache-->>WS: { user_id: "...", ... }
        WS->>WS: Bind WebSocket connection to user_id
        WS->>WS: Register connection in UserConnectionManager
        WS-->>Client: Connection Accepted (101 Switching Protocols)
        WS-->>Client: {"type":"connection.ready", "id":"...", "ts":"...", "payload":{"user_id":"...","heartbeat_interval_sec":30}}
    end

    Note over Client,WS: Step 3: Bidirectional Heartbeat
    loop Every 30 seconds
        Client->>WS: {"type":"client.ping", "id":"...", "ts":"...", "payload":{}}
        WS-->>Client: {"type":"server.pong", "id":"...", "ts":"...", "payload":{"echo_id":"..."}}
    end
```

### 2.1 Security Rationale: Prohibition of Query-String JWTs
Query-string authentication (`ws://...?token=eyJ...`) leaks sensitive credentials into:
1. Web server and reverse proxy access logs (Nginx, Traefik, AWS ALB, Cloudflare).
2. Browser history, referrer headers, and autocomplete storage.
3. Corporate firewall inspection logs.
4. Shoulder-surfing and screenshot captures.

Because standard browser `WebSocket` APIs cannot attach custom HTTP headers (such as `Authorization: Bearer <token>`), ToonChat uses **Short-Lived, Single-Use WebSocket Tickets**.

### 2.2 Ticket Issuance Endpoint
- **Method:** `POST`
- **Path:** `/api/v1/realtime/ticket`
- **Authentication:** `Authorization: Bearer <Supabase_JWT>` (enforced by `require_active_user`)
- **Rate Limit:** 30 requests/minute per user IP.

#### Request Headers:
```http
POST /api/v1/realtime/ticket HTTP/1.1
Host: api.toonchat.local
Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6...
Content-Type: application/json
```

#### Response Envelope (200 OK):
```json
{
  "ticket": "tkt_8f93a102b4894ceea981f47b2c0199e8",
  "expires_in": 60,
  "user_id": "c1f7f0aa-b54c-47ea-bd56-621aa906e001"
}
```

### 2.3 Ticket Storage, Atomic Consumption & Concurrent Upgrade
1. **Format:** Prefixed high-entropy string: `tkt_` + 32 cryptographically secure hex characters (`secrets.token_hex(16)`).
2. **Metadata Bound to Ticket:**
   ```json
   {
     "user_id": "c1f7f0aa-b54c-47ea-bd56-621aa906e001",
     "purpose": "websocket_connect",
     "issued_at": 1729600000.0,
     "expires_at": 1729600060.0
   }
   ```
3. **Atomic Consumption (Single-Use Guarantee):**
   - **Redis Store:** Executed via atomic command `GETDEL ticket:{tkt}`.
   - **In-Memory Store (`DB_TARGET=local` single-worker):** Thread-safe dictionary guarded by an `asyncio.Lock` that pops the key atomically during lookup:
     ```python
     async with self._lock:
         data = self._tickets.pop(ticket_token, None)
         if not data or time.time() > data["expires_at"]:
             return None
         if data.get("purpose") != "websocket_connect":
             return None
         return data["user_id"]
     ```
4. **Concurrent Upgrade Race Handling:**
   - If two requests present the exact same ticket simultaneously (e.g. rapid double-connect or replay attempt), exactly **one** connection wins the atomic pop.
   - The losing connection receives `None` and is immediately terminated with custom close code `4401 UNAUTHORIZED_TICKET`.
5. **Multi-Worker Ticket Store Limitation:**
   - **Critical Constraint:** An in-memory ticket store is bound to a single OS process memory space. If Uvicorn runs with `--workers 4`, a ticket issued by Worker 1 will not exist in Worker 2's memory, causing handshake failures.
   - **Operational Rule:** In local development without Redis, Uvicorn MUST be launched with `--workers 1`. For multi-worker or cloud container setups, an external key-value store (Redis / Supabase Valkey) is mandatory.
6. **Credential Privacy & Log Sanitization:**
   - Server request loggers, middleware, and exception handlers MUST sanitize the `ticket` query parameter (e.g., logging `ticket=tkt_****[last 4 chars]` or omitting it entirely).
   - Raw ticket values must NEVER be reflected in error response bodies or debug logs.

### 2.4 WebSocket Handshake URL & Failure Codes
- **Endpoint:** `GET /api/v1/realtime/ws?ticket=<ticket_token>`
- **Close Codes:**
  | Close Code | Identifier | Meaning |
  | :--- | :--- | :--- |
  | `1000` | `NORMAL_CLOSURE` | Client cleanly signed out or closed tab. |
  | `1008` | `POLICY_VIOLATION` | Malformed frame, unauthorized action, or slow consumer overflow. |
  | `1009` | `MESSAGE_TOO_BIG` | Frame exceeded 64 KB limit. |
  | `4401` | `UNAUTHORIZED_TICKET` | Ticket missing, expired, malformed, or already consumed. |
  | `4403` | `FORBIDDEN_USER` | Account deactivated, suspended, or scheduled for deletion. |
  | `4429` | `RATE_LIMITED` | Connection flooded with frames beyond velocity thresholds. |

### 2.5 Heartbeat & Dead-Socket Detection
1. **Ping Interval:** Client sends `client.ping` every 30 seconds.
2. **Pong Response:** Server replies with `server.pong` within 5 seconds, echoing the ping frame ID.
3. **Server-Side Idle Timeout:** If no incoming frame (ping or application message) is received from a client for 65 seconds (two ping cycles + grace period), the server terminates the socket (`1008 POLICY_VIOLATION`) to reclaim memory.
4. **Client-Side Timeout:** If client receives no `server.pong` within 10 seconds of emitting a ping, it flags the socket as half-open / dead, terminates the connection locally, and initiates reconnection backoff.

### 2.6 Reconnection Backoff with Full Jitter
Clients implement exponential backoff with full jitter:
$$T_{\text{sleep}} = \text{random}(0.8, 1.2) \times \min(T_{\max}, T_{\text{base}} \times 2^{\text{attempt}})$$
- $T_{\text{base}} = 1.0\text{ s}$
- $T_{\max} = 30.0\text{ s}$
- **Reconnect Sequence:**
  1. Acquire a fresh ticket via `POST /api/v1/realtime/ticket`.
  2. Establish WebSocket connection.
  3. Query REST endpoint `/api/v1/conversations/{id}/messages?after_seq={last_seen_seq}` to catch up missed messages.
  4. Re-subscribe to active channels.

---

## 3. Wire Protocol & Complete Event Specification

All WebSocket frames MUST be serialized JSON text UTF-8 conforming to the base envelope:

```typescript
interface ToonChatEnvelope<T = Record<string, unknown>> {
  /** Event identifier indicating payload schema and domain action */
  type: string;
  /** Unique frame tracking ID (UUIDv4) for tracing, logging, and ACK correlation */
  id: string;
  /** ISO-8601 UTC timestamp of frame origination */
  ts: string;
  /** Event-specific structured payload */
  payload: T;
}
```

### 3.1 Client $\rightarrow$ Server Events

#### 1. `client.ping`
- **Purpose:** Heartbeat keepalive.
- **Payload:** `{}`
- **Validation:** Empty payload object. Rate limit: 1 per 10s.

```json
{
  "type": "client.ping",
  "id": "7b8f9e21-4321-4a1b-90f1-0199e84b2c01",
  "ts": "2026-10-27T12:00:00.000Z",
  "payload": {}
}
```

#### 2. `channel.subscribe`
- **Purpose:** Subscribe socket to a specific conversation room or Maple Park world scene.
- **Payload:**
  - `channel` (string, required): Format `"conversation:{uuid}"` or `"world:{place_id}"`.
- **Validation:** Place ID must be one of `"park"`, `"cafe"`, `"plaza"`. If conversation, socket user must be an active member.

```json
{
  "type": "channel.subscribe",
  "id": "3b129841-8912-4bc1-912a-0012c48b2910",
  "ts": "2026-10-27T12:00:00.100Z",
  "payload": {
    "channel": "conversation:8fa8d7a1-3069-4ce3-a006-259fc6c52a32"
  }
}
```

#### 3. `channel.unsubscribe`
- **Purpose:** Leave a realtime channel.
- **Payload:**
  - `channel` (string, required): Channel string previously subscribed to.

```json
{
  "type": "channel.unsubscribe",
  "id": "4c981201-9912-48ac-a129-8812c98ab210",
  "ts": "2026-10-27T12:00:00.500Z",
  "payload": {
    "channel": "conversation:8fa8d7a1-3069-4ce3-a006-259fc6c52a32"
  }
}
```

#### 4. `chat.send`
- **Purpose:** Submit a new cartoon message.
- **Payload:**
  - `conversation_id` (UUID, required): Target conversation.
  - `client_message_id` (string, required, max 128 chars): Unique client-generated tracking ID.
  - `type` (enum, required): `"text"` | `"image"` | `"sticker"` | `"voice"`.
  - `body` (string, required, max 4000 chars): Message text or sticker identifier.
  - `media_id` (UUID, optional): Pointer to uploaded `media.id`.
  - `media_url` (string, optional, URL): URL if hosted.
  - `reply_to_id` (UUID, optional): ID of message being quoted.
- **Authorization:** Sender must be an active member of `conversation_id`. If direct chat, neither user may have blocked the other.

```json
{
  "type": "chat.send",
  "id": "a9c1e782-b132-47df-881c-813c9a01bf23",
  "ts": "2026-10-27T12:00:01.100Z",
  "payload": {
    "conversation_id": "8fa8d7a1-3069-4ce3-a006-259fc6c52a32",
    "client_message_id": "cmsg_99482_f1a2",
    "type": "text",
    "body": "Hey Biscuit! Look at this skate trick! 🛹✨",
    "media_id": null,
    "media_url": null,
    "reply_to_id": null
  }
}
```

#### 5. `chat.typing`
- **Purpose:** Broadcast ephemeral typing activity.
- **Payload:**
  - `conversation_id` (UUID, required).
  - `is_typing` (boolean, required).
- **Validation:** Throttled to max 1 frame per 3 seconds per conversation.

```json
{
  "type": "chat.typing",
  "id": "e4b2a190-2101-44cd-9f12-0012c48b2910",
  "ts": "2026-10-27T12:00:02.000Z",
  "payload": {
    "conversation_id": "8fa8d7a1-3069-4ce3-a006-259fc6c52a32",
    "is_typing": true
  }
}
```

#### 6. `chat.delivered`
- **Purpose:** Device ACK acknowledging delivery of message to recipient client.
- **Payload:**
  - `conversation_id` (UUID, required).
  - `message_id` (UUID, required).
  - `sequence` (integer, required).
- **Security Check:** Socket user cannot mark their own messages as delivered. User must be a member of the conversation.

```json
{
  "type": "chat.delivered",
  "id": "19a8e742-1234-4bc1-893d-49129841cda1",
  "ts": "2026-10-27T12:00:02.500Z",
  "payload": {
    "conversation_id": "8fa8d7a1-3069-4ce3-a006-259fc6c52a32",
    "message_id": "d1e7f0aa-b54c-47ea-bd56-621aa906e099",
    "sequence": 142
  }
}
```

#### 7. `chat.read`
- **Purpose:** Advance recipient's `last_read_seq`.
- **Payload:**
  - `conversation_id` (UUID, required).
  - `sequence` (integer, required, $\ge 1$).
- **Validation:** `sequence` cannot exceed `conversations.message_seq_counter`. Stale values $\le \text{current } last\_read\_seq$ are ignored.

```json
{
  "type": "chat.read",
  "id": "52c8b109-9812-42da-912a-8812c94bb210",
  "ts": "2026-10-27T12:00:03.000Z",
  "payload": {
    "conversation_id": "8fa8d7a1-3069-4ce3-a006-259fc6c52a32",
    "sequence": 142
  }
}
```

#### 8. `chat.reaction_add` / `chat.reaction_remove`
- **Purpose:** Add or remove emoji reaction.
- **Payload:**
  - `conversation_id` (UUID, required).
  - `message_id` (UUID, required).
  - `emoji` (string, required, 1-32 bytes UTF-8).

```json
{
  "type": "chat.reaction_add",
  "id": "99c81201-1122-43bb-a129-9941c28ab109",
  "ts": "2026-10-27T12:00:04.000Z",
  "payload": {
    "conversation_id": "8fa8d7a1-3069-4ce3-a006-259fc6c52a32",
    "message_id": "d1e7f0aa-b54c-47ea-bd56-621aa906e099",
    "emoji": "🎉"
  }
}
```

#### 9. `presence.set`
- **Purpose:** Set user presence status and custom vibe text.
- **Payload:**
  - `status` (enum, required): `"online"` | `"away"` | `"dnd"` | `"offline"`.
  - `vibe_text` (string, optional, max 50 chars).

```json
{
  "type": "presence.set",
  "id": "fa8192a0-8812-411a-b891-66129841cb02",
  "ts": "2026-10-27T12:00:06.000Z",
  "payload": {
    "status": "online",
    "vibe_text": "Skating at Maple Park 🛹"
  }
}
```

#### 10. `world.move`
- **Purpose:** Update avatar position in Maple Park.
- **Payload:**
  - `place_id` (enum, required): `"park"` | `"cafe"` | `"plaza"`.
  - `pos_x` (float, required), `pos_y` (float, required).
  - `facing` (enum, required): `"left"` | `"right"`.
  - `action` (enum, required): `"idle"` | `"walking"` | `"waving"` | `"sitting"`.
- **Rate Limit:** Maximum 10 coordinate updates per second.

```json
{
  "type": "world.move",
  "id": "22a819b1-5511-47cc-9812-44129841cb99",
  "ts": "2026-10-27T12:00:07.000Z",
  "payload": {
    "place_id": "park",
    "pos_x": 450.5,
    "pos_y": 280.0,
    "facing": "right",
    "action": "walking"
  }
}
```

#### 11. `world.speech`
- **Purpose:** Broadcast temporary speech bubble over avatar in Maple Park scene.
- **Payload:**
  - `place_id` (enum, required): `"park"` | `"cafe"` | `"plaza"`.
  - `text` (string, required, max 140 chars).

```json
{
  "type": "world.speech",
  "id": "99b19283-7711-4a12-881c-00129841ca12",
  "ts": "2026-10-27T12:00:07.500Z",
  "payload": {
    "place_id": "park",
    "text": "Anyone up for a race to the fountain? 🏃💨"
  }
}
```

#### 12. `world.emote`
- **Purpose:** Trigger animated cartoon emoji over avatar.
- **Payload:**
  - `place_id` (enum, required): `"park"` | `"cafe"` | `"plaza"`.
  - `emoji` (string, required, max 32 bytes UTF-8).

```json
{
  "type": "world.emote",
  "id": "55b81920-3312-48ac-b819-77129841cb01",
  "ts": "2026-10-27T12:00:08.000Z",
  "payload": {
    "place_id": "park",
    "emoji": "🌟"
  }
}
```

#### 13. `world.wave`
- **Purpose:** Wave to another avatar in the same Maple Park scene.
- **Payload:**
  - `place_id` (enum, required): `"park"` | `"cafe"` | `"plaza"`.
  - `target_user_id` (UUID, required).

```json
{
  "type": "world.wave",
  "id": "66a81921-2211-49ac-9912-88129841ca99",
  "ts": "2026-10-27T12:00:08.500Z",
  "payload": {
    "place_id": "park",
    "target_user_id": "b2c8a190-3069-4ce3-a006-118fa906e002"
  }
}
```

---

### 3.2 Server $\rightarrow$ Client Events

#### 1. `connection.ready`
Emitted immediately upon successful ticket authentication.
```json
{
  "type": "connection.ready",
  "id": "srv_init_9182",
  "ts": "2026-10-27T12:00:00.050Z",
  "payload": {
    "user_id": "c1f7f0aa-b54c-47ea-bd56-621aa906e001",
    "session_id": "sess_88192a",
    "heartbeat_interval_sec": 30
  }
}
```

#### 2. `server.pong`
Heartbeat response echoing the ping frame ID.
```json
{
  "type": "server.pong",
  "id": "srv_pong_1928",
  "ts": "2026-10-27T12:00:00.100Z",
  "payload": {
    "echo_id": "7b8f9e21-4321-4a1b-90f1-0199e84b2c01"
  }
}
```

#### 3. `chat.ack`
Direct acknowledgment to sender containing assigned sequence and database message ID.
```json
{
  "type": "chat.ack",
  "id": "srv_ack_8819",
  "ts": "2026-10-27T12:00:01.200Z",
  "payload": {
    "client_message_id": "cmsg_99482_f1a2",
    "message_id": "d1e7f0aa-b54c-47ea-bd56-621aa906e099",
    "conversation_id": "8fa8d7a1-3069-4ce3-a006-259fc6c52a32",
    "sequence": 142,
    "created_at": "2026-10-27T12:00:01.180Z",
    "status": "sent"
  }
}
```

#### 4. `chat.message`
Broadcast of newly committed message to all conversation members.
```json
{
  "type": "chat.message",
  "id": "srv_msg_10928",
  "ts": "2026-10-27T12:00:01.210Z",
  "payload": {
    "id": "d1e7f0aa-b54c-47ea-bd56-621aa906e099",
    "conversation_id": "8fa8d7a1-3069-4ce3-a006-259fc6c52a32",
    "sender_id": "c1f7f0aa-b54c-47ea-bd56-621aa906e001",
    "sequence": 142,
    "client_message_id": "cmsg_99482_f1a2",
    "type": "text",
    "body": "Hey Biscuit! Look at this skate trick! 🛹✨",
    "media_id": null,
    "media_url": null,
    "reply_to_id": null,
    "created_at": "2026-10-27T12:00:01.180Z",
    "sender": {
      "id": "c1f7f0aa-b54c-47ea-bd56-621aa906e001",
      "username": "luna_toon",
      "display_name": "Luna",
      "avatar_url": "/avatars/luna.svg"
    }
  }
}
```

#### 5. `chat.typing`
Broadcast typing notification to other members with server expiration timestamp.
```json
{
  "type": "chat.typing",
  "id": "srv_typ_99182",
  "ts": "2026-10-27T12:00:02.050Z",
  "payload": {
    "conversation_id": "8fa8d7a1-3069-4ce3-a006-259fc6c52a32",
    "user_id": "c1f7f0aa-b54c-47ea-bd56-621aa906e001",
    "username": "luna_toon",
    "display_name": "Luna",
    "is_typing": true,
    "expires_at": "2026-10-27T12:00:07.050Z"
  }
}
```

#### 6. `chat.delivered`
Broadcast delivery receipt to sender.
```json
{
  "type": "chat.delivered",
  "id": "srv_deliv_7712",
  "ts": "2026-10-27T12:00:02.550Z",
  "payload": {
    "conversation_id": "8fa8d7a1-3069-4ce3-a006-259fc6c52a32",
    "message_id": "d1e7f0aa-b54c-47ea-bd56-621aa906e099",
    "sequence": 142,
    "user_id": "b2c8a190-3069-4ce3-a006-118fa906e002",
    "delivered_at": "2026-10-27T12:00:02.500Z"
  }
}
```

#### 7. `chat.read`
Broadcast read receipt indicating member's advanced `last_read_seq`.
```json
{
  "type": "chat.read",
  "id": "srv_read_4412",
  "ts": "2026-10-27T12:00:03.050Z",
  "payload": {
    "conversation_id": "8fa8d7a1-3069-4ce3-a006-259fc6c52a32",
    "user_id": "b2c8a190-3069-4ce3-a006-118fa906e002",
    "last_read_seq": 142,
    "read_at": "2026-10-27T12:00:03.000Z"
  }
}
```

#### 8. `chat.reaction_added` / `chat.reaction_removed`
Broadcast emoji reaction mutation.
```json
{
  "type": "chat.reaction_added",
  "id": "srv_rx_1122",
  "ts": "2026-10-27T12:00:04.050Z",
  "payload": {
    "conversation_id": "8fa8d7a1-3069-4ce3-a006-259fc6c52a32",
    "message_id": "d1e7f0aa-b54c-47ea-bd56-621aa906e099",
    "reaction_id": "r_19283746",
    "user_id": "b2c8a190-3069-4ce3-a006-118fa906e002",
    "emoji": "🎉",
    "created_at": "2026-10-27T12:00:04.000Z"
  }
}
```

#### 9. `presence.update`
Broadcast presence state change to friends and shared-chat members.
```json
{
  "type": "presence.update",
  "id": "srv_pres_8829",
  "ts": "2026-10-27T12:00:06.100Z",
  "payload": {
    "user_id": "c1f7f0aa-b54c-47ea-bd56-621aa906e001",
    "status": "online",
    "vibe_text": "Skating at Maple Park 🛹",
    "last_active_at": "2026-10-27T12:00:06.000Z"
  }
}
```

#### 10. `presence.sync`
Initial snapshot of online friends and active conversations emitted upon connection.
```json
{
  "type": "presence.sync",
  "id": "srv_sync_0012",
  "ts": "2026-10-27T12:00:00.080Z",
  "payload": {
    "online_users": [
      {
        "user_id": "b2c8a190-3069-4ce3-a006-118fa906e002",
        "status": "online",
        "vibe_text": "Chilling at the cafe ☕"
      }
    ]
  }
}
```

#### 11. `world.event`
Broadcast of player action within a Maple Park scene.
```json
{
  "type": "world.event",
  "id": "srv_wev_7718",
  "ts": "2026-10-27T12:00:07.100Z",
  "payload": {
    "place_id": "park",
    "event_type": "move",
    "user_id": "c1f7f0aa-b54c-47ea-bd56-621aa906e001",
    "data": {
      "pos_x": 450.5,
      "pos_y": 280.0,
      "facing": "right",
      "action": "walking"
    }
  }
}
```
*Event types:* `"move"` | `"speech"` | `"emote"` | `"wave"`.

#### 12. `notification.new`
Direct toast ping for unread messages in conversations not currently open on client.
```json
{
  "type": "notification.new",
  "id": "srv_notif_9912",
  "ts": "2026-10-27T12:00:01.250Z",
  "payload": {
    "id": "n_19283741",
    "type": "message",
    "title": "New message from Luna",
    "content": "Hey Biscuit! Look at this skate trick! 🛹✨",
    "conversation_id": "8fa8d7a1-3069-4ce3-a006-259fc6c52a32"
  }
}
```

#### 13. `error`
Standardized error event returned to the initiating socket.
```json
{
  "type": "error",
  "id": "srv_err_00192",
  "ts": "2026-10-27T12:00:08.000Z",
  "payload": {
    "code": "FORBIDDEN",
    "message": "You are not an active member of this cartoon conversation.",
    "details": {
      "conversation_id": "8fa8d7a1-3069-4ce3-a006-259fc6c52a32",
      "error_subcode": "NOT_A_MEMBER"
    },
    "echo_id": "a9c1e782-b132-47df-881c-813c9a01bf23"
  }
}
```

---

## 4. Transactional Sequencing, Idempotency & Unread Semantics

### 4.1 Per-Conversation Monotonic Sequence Allocation
ToonChat allocates strictly monotonic, unique sequence numbers per conversation using row-level locking on `conversations.message_seq_counter`:

```sql
-- Transaction begins
SELECT message_seq_counter 
FROM conversations 
WHERE id = :conversation_id 
FOR UPDATE;

-- Increment counter monotonically
UPDATE conversations 
SET message_seq_counter = message_seq_counter + 1,
    last_message_id = :new_message_id,
    last_message_at = NOW(),
    updated_at = NOW()
WHERE id = :conversation_id
RETURNING message_seq_counter;

-- Insert message row with allocated sequence
INSERT INTO messages (
    id, conversation_id, sender_id, sequence, 
    client_message_id, type, body, media_id, 
    media_url, reply_to_id, is_edited, is_deleted, created_at
) VALUES (
    :new_message_id, :conversation_id, :sender_id, :allocated_seq,
    :client_message_id, :type, :body, :media_id,
    :media_url, :reply_to_id, FALSE, FALSE, NOW()
);
-- Transaction commits
```

#### Monotonic Guarantees & Rollback Behavior:
1. **Uniqueness:** Guaranteed by composite constraint `UniqueConstraint("conversation_id", "sequence", name="uq_messages_conversation_seq")`.
2. **Transaction Rollback:** Because the counter increment and message insert reside within the exact same database transaction, if the transaction rolls back prior to commit (e.g. disk failure, lock timeout, constraint violation), the counter increment rolls back too. The next transaction receives the uncommitted sequence number.
3. **No Sequence Leakage:** Unlike PostgreSQL `CREATE SEQUENCE` objects which drop values on rollback, counter-in-table updates rollback completely.
4. **Unified Message Allocator Requirement:**
   > [!IMPORTANT]
   > ALL code paths that insert messages—WebSocket `chat.send`, REST `POST /messages`, media upload completion hooks, and system announcements—MUST call the exact same database service allocator (`allocate_and_insert_message`). Direct table inserts bypassing `FOR UPDATE` are strictly prohibited.

#### Sequence Continuity Realism (Gaps vs Monotonicity):
- **Why Gaps Can Appear to Clients:**
  1. **Soft Deletion:** When a message is soft-deleted (`is_deleted = TRUE, deleted_at = NOW()`), the database retains the sequence number, but client timelines filter `WHERE is_deleted = FALSE`. To the client, sequences may appear as `[140, 141, 143]`.
  2. **Moderation Scrubbing:** Messages hidden or scrubbed by moderation create sequence offsets.
- **Client Protocol Rule:** Clients MUST NOT assume sequence numbers are strictly gap-free (i.e. $S_{k+1} = S_k + 1$). Clients must never halt rendering or enter infinite retry loops if an intermediate sequence is missing; instead, they query REST catch-up to confirm whether missing sequences were deleted.

### 4.2 Idempotent Retries via `client_message_id`
Network interruptions often cause clients to retry sends. ToonChat enforces idempotency via the database unique constraint:
`UniqueConstraint("sender_id", "client_message_id", name="uq_messages_sender_client_id")`

```mermaid
flowchart TD
    A[Client sends chat.send with client_message_id] --> B{Check DB for sender_id + client_message_id}
    B -- Found existing message --> C[Return existing message & sequence as chat.ack]
    B -- Not found --> D[Acquire FOR UPDATE lock on conversations row]
    D --> E[Compute seq = message_seq_counter + 1]
    E --> F[Insert message row]
    F --> G{Insert Conflict on uq_messages_sender_client_id?}
    G -- Race Winner / Success --> H[Update conversation seq & commit TX]
    H --> I[Broadcast chat.message to members & return chat.ack]
    G -- Race Loser --> J[Rollback TX]
    J --> K[Query existing message by client_message_id]
    K --> L[Return existing message & sequence as chat.ack]
```

### 4.3 Rigorous Unread Calculation Semantics
> [!CAUTION]
> **Defect Analysis: Flaw of Naive Sequence Subtraction**  
> The formula $\text{unread} = \text{message\_seq\_counter} - \text{last\_read\_seq}$ is **INCORRECT** for incoming unread counts because:
> 1. It counts messages sent by the user themselves! If Alice sends a message, `message_seq_counter` increments. Alice's unread badge would falsely increment for her own message unless her `last_read_seq` is advanced.
> 2. But if the server automatically advances Alice's `last_read_seq` to the sequence of her newly sent message, any concurrent messages sent by Bob in the same interval would be silently marked as read by Alice before she ever saw them!
> 3. It counts soft-deleted messages (`is_deleted = TRUE`).

#### Correct Incoming Unread Semantics:
An unread message for user $U$ in conversation $C$ is strictly defined as:
$$\text{Message } M \in C \iff M.\text{sequence} > U.\text{last\_read\_seq} \land M.\text{sender\_id} \neq U \land M.\text{is\_deleted} = \text{FALSE}$$

#### The Two-Tiered Technical Solution:
Because table `conversation_members` does not have a separate denormalized counter column in the current schema:
1. **Server-Side Authoritative Query (Index Range Scan):**
   ```sql
   SELECT COUNT(*) 
   FROM messages 
   WHERE conversation_id = :conversation_id 
     AND sequence > :last_read_seq 
     AND (sender_id IS NULL OR sender_id != :current_user_id) 
     AND is_deleted = FALSE;
   ```
   *Execution Efficiency:* Backed by index `ix_messages_pagination (conversation_id, sequence DESC)`. Because active users generally keep up with conversations, $\text{sequence} > \text{last\_read\_seq}$ touches only a tiny index range (typically 0 to 50 index leaf pages), executing in sub-millisecond time.
2. **Client-Side Reactive Counter:**
   - In React TanStack Query / Zustand state:
     - On incoming `chat.message`: if `payload.sender_id !== current_user_id` and conversation window is unfocused, increment local `unreadCount += 1`.
     - On conversation focus / emit `chat.read`: reset local `unreadCount = 0`.
     - On initial load / reconnect: populate from server index range query.

### 4.4 Canonical Direct-Conversation Pair Ordering
Direct conversations (`type = 'direct'`) represent an unordered pair $\{U_1, U_2\}$. To prevent concurrent requests creating duplicate 1-on-1 chats:
1. UUIDs are sorted lexicographically before insert:
   $$u_1 = \min(\text{userA\_id}, \text{userB\_id}), \quad u_2 = \max(\text{userA\_id}, \text{userB\_id})$$
2. Enforced by database constraint:
   `UniqueConstraint("direct_user1_id", "direct_user2_id", name="uq_conversations_direct_pair")`
3. If two users simultaneously hit "Start Chat", one transaction commits; the other catches `IntegrityError` (409 Conflict), rolls back, and returns the existing conversation row cleanly.

---

## 5. REST History, Reconnect & Catch-Up Protocol

WebSockets provide low-latency push; REST provides reliable, cacheable message history.

### 5.1 REST History Cursor Pagination Endpoint
- **Method:** `GET`
- **Path:** `/api/v1/conversations/{conversation_id}/messages`
- **Authentication:** `Authorization: Bearer <Supabase_JWT>`
- **Query Parameters:**
  | Parameter | Type | Default | Constraints | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `limit` | integer | `50` | $1 \le \text{limit} \le 100$ | Number of messages to return. |
  | `before_seq` | bigint | `None` | $> 0$ | Backward cursor: fetch messages older than sequence (`sequence < before_seq`). |
  | `after_seq` | bigint | `None` | $\ge 0$ | Forward cursor: fetch messages newer than sequence (`sequence > after_seq`). |

#### Database Execution (Index-Backed):
```sql
-- Historical pagination (scrolling up in timeline)
SELECT * FROM messages 
WHERE conversation_id = :conv_id AND sequence < :before_seq AND is_deleted = FALSE
ORDER BY sequence DESC 
LIMIT :limit;

-- Delta catch-up on reconnect
SELECT * FROM messages 
WHERE conversation_id = :conv_id AND sequence > :after_seq AND is_deleted = FALSE
ORDER BY sequence ASC 
LIMIT :limit;
```

#### Paginated Response Envelope:
```json
{
  "items": [
    {
      "id": "d1e7f0aa-b54c-47ea-bd56-621aa906e099",
      "conversation_id": "8fa8d7a1-3069-4ce3-a006-259fc6c52a32",
      "sender_id": "c1f7f0aa-b54c-47ea-bd56-621aa906e001",
      "sequence": 142,
      "client_message_id": "cmsg_99482_f1a2",
      "type": "text",
      "body": "Hey Biscuit! Look at this skate trick! 🛹✨",
      "media_id": null,
      "media_url": null,
      "reply_to_id": null,
      "is_edited": false,
      "is_deleted": false,
      "created_at": "2026-10-27T12:00:01.180Z",
      "reactions": []
    }
  ],
  "has_more": false,
  "oldest_seq": 142,
  "newest_seq": 142
}
```

### 5.2 Publication Failure After DB Commit
What happens if the message transaction commits in PostgreSQL, but WebSocket pub/sub broadcasting fails (e.g. network glitch to Redis broker or in-memory queue full)?
1. **Committed State Remains Ground Truth:** The database transaction is NOT rolled back. The message is permanently assigned its sequence.
2. **Sender Acknowledgment:** The sender receives their `chat.ack` with the allocated sequence and message ID.
3. **Recipient Catch-Up:** Other conversation participants who missed the realtime broadcast will retrieve the committed message during their next REST delta catch-up query (`after_seq`).
4. **Observability:** The server logs a structured error with `request_id`, `conversation_id`, and `sequence` for monitoring.

### 5.3 Slow-Consumer Queue Overflow & Disconnect Policy
To protect the server from memory exhaustion caused by stalling clients (e.g. high packet loss or suspended tabs):
1. Every active WebSocket connection is allocated a bounded outbound buffer (`asyncio.Queue(maxsize=100)`).
2. If the buffer is saturated:
   - Ephemeral frames (`chat.typing`, `world.move`) are discarded immediately.
   - If non-ephemeral message frames cannot be queued within 2.0 seconds: the server terminates the socket with close code `1008 POLICY_VIOLATION` (`"SLOW_CONSUMER"`).
3. The disconnected client reconnects when its network normalizes, catching up all missed messages via REST history.

---

## 6. Authorization, Security & Moderation

### 6.1 Membership Authorization on Every Event
The server NEVER relies solely on initial socket authentication. On **every** incoming event referencing a conversation (`chat.send`, `chat.typing`, `chat.delivered`, `chat.read`, `chat.reaction_add`):
```sql
SELECT role, is_muted 
FROM conversation_members 
WHERE conversation_id = :conversation_id 
  AND user_id = :socket_user_id 
  AND left_at IS NULL;
```
If no active membership exists: reject event with `code: "FORBIDDEN"`, `details: {"error_subcode": "NOT_A_MEMBER"}`.

### 6.2 Block Enforcement
Before delivering direct messages or notifications:
```sql
SELECT 1 FROM blocks 
WHERE (blocker_id = :sender_id AND blocked_id = :recipient_id)
   OR (blocker_id = :recipient_id AND blocked_id = :sender_id);
```
1. **Direct Chats:** If blocked, reject `chat.send` with `code: "FORBIDDEN"`, `details: {"error_subcode": "USER_BLOCKED"}`.
2. **Group Chats:** Messages from blocked users remain visible in the group transcript to maintain sequence continuity, but the recipient client UI renders them in a collapsed cartoon pill: `"Message from blocked toon"`.

### 6.3 Receipt Forgery Prevention
To prevent malicious clients from manipulating receipts:
1. **User Identity Injection:** Receipts (`chat.delivered`, `chat.read`) extract user ID strictly from the authenticated WebSocket session (`connection.user_id`). Any user ID provided in the payload is ignored.
2. **Self-Delivery Prohibition:** A user cannot emit `chat.delivered` for messages where `sender_id == connection.user_id`.
3. **Monotonic Non-Decreasing Read Pointer:** `last_read_seq` can NEVER decrease. If `sequence <= current_last_read_seq`, the frame is ignored.
4. **Upper Bound Check:** If `sequence > conversation.message_seq_counter`, the frame is rejected with `VALIDATION_ERROR` (cannot read future messages).

### 6.4 Payload Limits & Frame Boundaries
| Parameter | Maximum Limit | Action on Violation |
| :--- | :--- | :--- |
| WebSocket Frame Size | 64 KB (65,536 bytes) | Socket closed with code `1009 MESSAGE_TOO_BIG`. |
| Message Text Body | 4,000 UTF-8 characters | Event rejected with `PAYLOAD_TOO_LARGE` (41301). |
| `client_message_id` | 128 characters | Event rejected with `VALIDATION_ERROR` (40001). |
| Reaction Emoji | 32 bytes (valid UTF-8 emoji) | Event rejected with `VALIDATION_ERROR` (40001). |
| Maple Park Speech Bubble | 140 characters | Event rejected with `PAYLOAD_TOO_LARGE` (41301). |
| Maple Park Emote | 32 bytes | Event rejected with `VALIDATION_ERROR` (40001). |

### 6.5 Rate Limiting & Velocity Bounds
- `chat.send`: Max 5 messages/second, burst 10. Exceeding triggers `RATE_LIMITED` (42901).
- `chat.typing`: Max 1 event per 3 seconds per conversation.
- `client.ping`: Max 1 ping per 10 seconds.
- `world.move`: Max 10 coordinate updates per second.
- **Concurrent Connections**: Max 5 concurrent WebSocket sessions per user ID. If a 6th connects, the oldest idle connection is closed with `1000 NORMAL_CLOSURE` (`"MAX_SESSIONS_EXCEEDED"`).

### 6.6 Error Code Mapping
```typescript
export enum RealtimeErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",       // 40001: Malformed JSON or schema violation
  UNAUTHORIZED = "UNAUTHORIZED",               // 40101: Invalid/expired ticket
  FORBIDDEN = "FORBIDDEN",                     // 40301: Not a member of conversation
  USER_BLOCKED = "USER_BLOCKED",               // 40302: Blocker relationship active
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",   // 40401: Target conversation/message missing
  CONFLICT = "CONFLICT",                       // 40901: Sequence conflict / unique clash
  PAYLOAD_TOO_LARGE = "PAYLOAD_TOO_LARGE",     // 41301: Exceeded character/byte limit
  RATE_LIMITED = "RATE_LIMITED",               // 42901: Velocity quota exceeded
  INTERNAL_ERROR = "INTERNAL_ERROR",           // 50001: Unhandled exception
}
```

---

## 7. Message Delivery Lifecycle & Presence

### 7.1 The Four Message States
```text
[ Client Compose ]
       │
       ▼ (Optimistic render, Clock icon)
   [ sending ] 
       │
       ▼ (Server commits to DB, allocates sequence, returns chat.ack)
    [ sent ] ──── (Single check mark)
       │
       ▼ (Recipient device receives chat.message and emits chat.delivered)
  [ delivered ] ─ (Double check mark, neutral slate grey #94a3b8)
       │
       ▼ (Recipient opens conversation, emits chat.read with sequence >= N)
    [ read ] ──── (Double check mark, vibrant ToonChat brand orange #ea580c)
```

### 7.2 Receipt Semantics Across Multiple Tabs & Devices
- **Offline Recipient:** Message remains in state `sent` (Single check). When the recipient reconnects and fetches the message via REST catch-up, their client emits `chat.delivered`, transitioning the state to `delivered`.
- **Multiple Tabs/Devices:** When a recipient has 3 tabs open, the server fans out `chat.message` to all 3. Receipt of `chat.delivered` from **any** active tab transitions the message to `delivered`. Subsequent duplicate delivery receipts are ignored.
- **Group Read Semantics:** In group chats ($\le 250$ members), double-checks turn brand orange once **all** active group members have read up to or past the sequence.

### 7.3 Ephemeral Typing Expiration
- Typing states are strictly in-memory and are NEVER persisted to PostgreSQL.
- Server broadcasts `chat.typing` with `expires_at: now + 5000ms`.
- Recipient client sets a 5-second timer. If no refresh event arrives, the typing bubble vanishes automatically.
- When sender deletes text or unfocuses input, client emits `chat.typing` with `is_typing: false`, clearing the indicator immediately.

### 7.4 Multi-Tab Presence & Offline Grace Buffer
1. Connection manager tracks active sockets:
   $$\text{connections}: \text{Map}\langle\text{user\_id}, \text{Set}\langle\text{WebSocket}\rangle\rangle$$
2. Incoming notifications and messages fan out to all sockets in the user's set.
3. When Tab 1 marks a conversation read, the server emits `chat.read` to Tab 2, clearing unread counters simultaneously.
4. **Presence Offline Grace Period:** When a socket disconnects, if $\text{len}(\text{connections}[\text{user\_id}]) == 0$, a 20-second grace timer starts. If no reconnect occurs before expiry, user status transitions to `offline` and broadcasts `presence.update`.

---

## 8. Pub/Sub Abstraction & Scalability Architecture

### 8.1 Abstract Pub/Sub Interface (`IPubSub`)
```python
from abc import ABC, abstractmethod
from typing import Any, Awaitable, Callable, Dict
import uuid

SubscriptionCallback = Callable[[str, Dict[str, Any]], Awaitable[None]]

class IPubSub(ABC):
    @abstractmethod
    async def subscribe(self, channel: str, callback: SubscriptionCallback) -> str:
        """Subscribes a callback to a named channel. Returns subscription ID."""
        pass

    @abstractmethod
    async def unsubscribe(self, channel: str, subscription_id: str) -> None:
        """Unsubscribes a specific subscription ID from a named channel."""
        pass

    @abstractmethod
    async def publish(self, channel: str, event: Dict[str, Any]) -> None:
        """Publishes an event envelope to all subscribers of a channel."""
        pass

    @abstractmethod
    async def broadcast_to_user(self, user_id: uuid.UUID, event: Dict[str, Any]) -> None:
        """Directly sends an event envelope to all connected sockets of a user."""
        pass
```

### 8.2 In-Memory Pub/Sub Implementation (`InMemoryPubSub`)
- Used exclusively for single-worker development (`DB_TARGET=local`).
- Routes frames via in-process `asyncio.Queue` and task dispatch.

### 8.3 Limitations of In-Memory Pub/Sub Across Multiple Workers or Instances
> [!WARNING]
> **CRITICAL ARCHITECTURAL LIMITATION**  
> An in-memory pub/sub implementation relies entirely on shared memory within a single operating system process.

1. **Multi-Worker Isolation:**
   Running `uvicorn --workers 4` spawns 4 isolated OS processes. A socket on Worker 1 will NEVER receive events published by Worker 2.
2. **Horizontal Container Scaling:**
   In containerized deployments (Docker Swarm, Kubernetes, AWS ECS, Render), sockets are split across independent container instances. In-memory dispatch fails across machine boundaries.
3. **Production Migration Path:**
   - Production requires swapping `InMemoryPubSub` with `RedisPubSub` (via `redis.asyncio` with Redis cluster / Supabase Valkey) or PostgreSQL `LISTEN/NOTIFY`.
   - All application routers interact exclusively through `IPubSub`, allowing backend providers to swap via dependency injection in `backend/app/deps.py` without modifying router code.

---

## 9. Comprehensive Test Plan & Verification Playbooks

### 9.1 Automated Test Suite Specifications

#### Unit Tests (`backend/tests/test_realtime_protocol.py`):
1. **Envelope Validation**: Test valid envelopes pass Pydantic validation; malformed frames fail with `VALIDATION_ERROR`.
2. **Single-Use Ticket Lifecycle**:
   - Issue ticket $\rightarrow$ consume ticket $\rightarrow$ success.
   - Re-attempt consumption with same ticket $\rightarrow$ returns `None` / rejected.
   - Consume ticket after 61 seconds $\rightarrow$ returns `None` / expired.
3. **Concurrent Ticket Upgrade Race**:
   - Fire two simultaneous WebSocket upgrades with the identical ticket.
   - Exactly one succeeds; the second receives close code `4401`.
4. **Monotonic Sequence Allocation**:
   - Run 20 concurrent simulated `chat.send` transactions against the same conversation using `asyncio.gather`.
   - Verify sequences strictly increment from 1 to 20 without duplicates.
5. **Idempotency Verification**:
   - Send message with `client_message_id = "cmsg_001"`.
   - Repeat send with same `client_message_id = "cmsg_001"`.
   - Verify second response returns identical `id`, `sequence`, and `created_at` without allocating a new sequence.
6. **Incoming Unread Query Accuracy**:
   - Verify query counts only incoming active messages (`sender_id != current_user_id` and `is_deleted = FALSE`).

#### Integration Tests (`backend/tests/test_realtime_websocket.py`):
1. **Authenticated Handshake**: Connecting with valid ticket receives `connection.ready`.
2. **Heartbeat Loop**: `client.ping` receives `server.pong` with matching `echo_id`.
3. **Membership Rejection**: Attempt to send to conversation without membership $\rightarrow$ receives `FORBIDDEN`.
4. **Block Enforcement**: Blocked user send $\rightarrow$ receives `USER_BLOCKED`.
5. **Slow Consumer Disconnect**: Flood a stalled socket buffer past 100 frames $\rightarrow$ server terminates socket with code `1008`.

---

### 9.2 Manual Two-Account Direct Chat Verification Playbook

#### Prerequisites:
- Backend running at `http://localhost:8000` with `DB_TARGET=local`.
- Browser Window 1: User A (`biscuit`).
- Browser Window 2: User B (`luna`).

| Step | Action | Expected Result | Pass/Fail |
| :---: | :--- | :--- | :---: |
| **1** | Open Network tab $\rightarrow$ WS filter. Sign in as User A and User B. | Both clients request `POST /api/v1/realtime/ticket` (200) and establish WS connection (101). | [ ] |
| **2** | Observe WS frames in devtools. | Server emits `connection.ready` with user's UUID. | [ ] |
| **3** | User A types in conversation with User B without hitting Enter. | User B shows cartoon typing bubble with bouncing dots. Frame `chat.typing` visible in WS log. | [ ] |
| **4** | User A pauses typing for 5 seconds. | User B's typing bubble automatically disappears via 5s client expiration timer. | [ ] |
| **5** | User A sends `"Hello Luna! 🛹"`. | 1. User A sees bubble with Clock icon, then single check (Sent).<br/>2. User B instantly receives message frame.<br/>3. User B emits `chat.delivered`.<br/>4. User A's check mark switches to double check grey (Delivered). | [ ] |
| **6** | User B focuses window and opens conversation. | 1. User B emits `chat.read` with `sequence: 1`.<br/>2. User A's double check turns brand orange `#ea580c` (Read).<br/>3. User B's sidebar unread badge clears. | [ ] |
| **7** | User B reacts with "🎉". | User A immediately sees reaction pill `1 🎉` attached to bubble without page reload. | [ ] |
| **8** | User B disconnects (Devtools Offline toggle), User A sends 3 messages, User B reconnects. | User B reconnects, acquires ticket, queries `/messages?after_seq=1`, and renders all 3 messages in order. | [ ] |

---

### 9.3 Manual Three-Account Group Chat Verification Playbook

#### Prerequisites:
- Group: `"Maple Park Skaters"` containing User A (Owner), User B (Member), User C (Member).
- Three separate browser windows/profiles open simultaneously.

| Step | Action | Expected Result | Pass/Fail |
| :---: | :--- | :--- | :---: |
| **1** | Verify all 3 users show `online` status in the group members list. | Presence indicators show green dot with ToonChat sticker border. | [ ] |
| **2** | User A sends `"Skate session at 4pm! 🛹"`. | 1. User A sees message transition from Clock to Single Check.<br/>2. User B and User C receive `chat.message` frame in $< 50\text{ms}$.<br/>3. Both render bubble simultaneously. | [ ] |
| **3** | User B reads message; User C has chat closed. | User B emits `chat.read`. User A's bubble remains grey double-check because User C has not read. | [ ] |
| **4** | User C opens group chat. | User C emits `chat.read`. User A's double-check switches to orange `#ea580c` indicating all members have read. | [ ] |
| **5** | User B and User C both react with "🔥" simultaneously. | Both reactions aggregate to count `2 🔥` across all 3 screens without race condition or duplicate reaction rows. | [ ] |
| **6** | User A removes User C from group via admin action. User C attempts to send a message. | User C receives `error` frame with code `FORBIDDEN` (`NOT_A_MEMBER`). Message does not publish to User A or B. | [ ] |

---

## 10. Future Benchmark Methodology, Key Decisions & Unresolved Risks

### 10.1 Future Benchmark Methodology
> [!NOTE]
> All latency and throughput targets below represent **system design goals**. They MUST be empirically validated in a future load-testing step before declaring production readiness.

1. **Load Generation Tooling:**
   - Use **k6** or **Locust** with asynchronous WebSocket and HTTP protocols.
2. **Standard Benchmark Profiles:**
   - **Profile 1: Direct Messaging Storm**  
     - 50 concurrent 1-on-1 pairs (100 sockets).
     - Each pair sends 1 message every 2 seconds for 5 minutes.
     - Target: 95th percentile database commit latency $\le 30\text{ms}$; 95th percentile delivery latency $\le 80\text{ms}$.
   - **Profile 2: Group Fan-Out Burst**  
     - 1 group with 250 connected members (`GROUP_MAX_MEMBERS`).
     - 5 active senders generating 10 messages/second burst for 60 seconds.
     - Target: 95th percentile fan-out dispatch time across 250 connections $\le 100\text{ms}$; zero socket queue buffer overflows.
   - **Profile 3: Spatial Movement (Maple Park)**  
     - 50 avatars in scene `"park"` broadcasting `world.move` at 5 updates/second.
     - Target: Zero server event loop starvation; average frame latency $\le 40\text{ms}$.
3. **Resource Metrics Captured:**
   - PostgreSQL container CPU & memory utilization.
   - Database connection pool saturation (`DATABASE_POOL_SIZE = 20`, `MAX_OVERFLOW = 10`).
   - Uvicorn event loop latency and resident memory per 1,000 idle WebSocket connections.

### 10.2 Key Protocol Decisions
1. **Single-Use WebSocket Tickets**: Completely eliminates token leakage in query strings and access logs while providing atomic replay protection.
2. **Database Ground Truth**: Ephemeral WebSocket failures cannot corrupt or desynchronize committed PostgreSQL conversation sequences.
3. **Strict Invariant on Sequence Allocation**: Sequence assignment is strictly serialized via `SELECT ... FOR UPDATE` inside the message insert transaction, guaranteeing uniqueness and no gaps from rollbacks.
4. **Two-Tiered Unread Calculation**: Abandons naive sequence subtraction in favor of an index-backed bounded range query (`sequence > last_read_seq AND sender_id != current_user_id AND is_deleted = FALSE`), preserving exact incoming unread semantics.
5. **Bounded Outbound Queues**: Protects server memory by shedding ephemeral frames and disconnecting stalled consumers.

### 10.3 Unresolved Risks & Future Decisions
1. **Multi-Worker Local Development Configuration**:
   - *Status:* Resolved by protocol rule, pending runtime enforcement.
   - *Detail:* In-memory ticket stores and pub/sub cannot bridge multiple Uvicorn workers. Local development must enforce `--workers 1` or mount a local Redis service.
2. **Denormalized Unread Counter Table Migration (Deferred to Future Phase)**:
   - *Status:* Unresolved architectural trade-off.
   - *Detail:* While index range scanning is optimal for typical conversation activity, if inbox lists grow to thousands of conversations per user with massive backlogs, a dedicated `unread_count` column on `conversation_members` updated via database trigger would provide pure $O(1)$ read performance. This trade-off is deferred until Phase 13+ benchmarking.
3. **Media Upload Realtime Coordination**:
   - *Status:* Preserved for Phase 12 implementation.
   - *Detail:* Large media files (images, audio) are uploaded via presigned REST endpoints before emitting a `chat.send` frame containing the resulting `media_id`. Realtime socket handles the pointer, never raw binary uploads.
