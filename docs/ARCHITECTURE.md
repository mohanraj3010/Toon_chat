# ToonChat System Architecture

> **"Don't just text. Express yourself."**  
> ToonChat is a high-performance, cartoon-first social messaging platform featuring realtime WebSocket communications, interactive SVG avatars, animated sticker packs, in-browser voice messaging with waveform seeking, and a 2.5D isometric cartoon world (Maple Park).

---

## 1. High-Level System Architecture

```text
                                  ┌────────────────────────┐
                                  │   Browser / Mobile PWA │
                                  └───────────┬────────────┘
                                              │
                      ┌───────────────────────┴──────────────────────┐
                      │ HTTPS                                        │ WSS
                      ▼                                              ▼
       ┌──────────────────────────────┐              ┌──────────────────────────────┐
       │ FastAPI REST Gateway (/api)  │              │ FastAPI WebSocket Gateway    │
       ├──────────────────────────────┤              ├──────────────────────────────┤
       │ - Supabase JWT Bearer Auth   │              │ - Single-Use Ticket (60s)    │
       │ - RequestId & CSP Headers    │              │ - Origin & Membership Guard  │
       │ - Strict CORS Allowlist      │              │ - Ping/Pong Heartbeats (30s) │
       │ - Rate Limiting & Validation │              │ - Monotonic Sequence Order   │
       └──────────────┬───────────────┘              └──────────────┬───────────────┘
                      │                                             │
                      ├───────────────────────┬─────────────────────┤
                      ▼                       ▼                     ▼
       ┌─────────────────────────────┐ ┌─────────────┐ ┌───────────────────────────┐
       │ PostgreSQL 16 (Relational)  │ │ Supabase    │ │ Object Storage            │
       ├─────────────────────────────┤ │ Auth (IdP)  │ ├───────────────────────────┤
       │ - Row-Level Lock Sequences  │ └─────────────┘ │ - S3 / Cloudflare R2 / MinIO│
       │ - Users, Profiles, Avatars  │                 │ - HMAC Presigned Upload/Down│
       │ - Chats, Messages, Reactions│                 │ - Magic Byte Content Checks │
       │ - Friendships, Groups, Squad│                 │ - Strict MIME Normalization │
       └─────────────────────────────┘                 └───────────────────────────┘
```

---

## 2. Frontend Architecture (`src/`)

The frontend is built with **React 19**, **TypeScript (Strict)**, and **Vite**, using feature-based architecture:

```
src/
├── app/                  # Application Shell, Router, Providers, Env schema, QueryClient
│   ├── router.tsx        # Lazy-loaded code-split routes with ProtectedRoute guards
│   ├── env.ts           # Zod-validated environment config (NO secrets)
│   └── shell/           # Responsive AppShell (Desktop Rail, Tablet Rail, Mobile Bottom Nav)
├── assets/               # Static cartoon assets, original layered SVGs, sticker packs
│   ├── characters/       # Layered vector characters (Face, Hair, Outfits, Accessories)
│   ├── stickers/         # 40+ original SVG stickers across 4 thematic packs
│   └── illustrations/    # Empty-state cartoon drawings
├── design-system/        # Design system tokens, chunky CSS variables, primitives
│   ├── primitives/       # Button, Input, Modal, Badge, ChatBubble, EmptyState
│   └── tokens/           # tokens.css (Warm cream palette, Fredoka headings, Nunito body)
├── features/             # Domain-specific modules with UI, hooks, and services
│   ├── auth/             # Login, Register, Session Restoration, Public/Protected routes
│   ├── avatar/           # Interactive Layered Avatar Creator & AvatarRenderer
│   ├── chats/            # ChatFeed, Conversation, MessageBubble, VoiceRecorder, Player
│   ├── friends/          # Friend requests, user discovery, friendship cards
│   ├── groups/           # Squad discovery, group creation, member management
│   ├── notifications/    # Realtime notification bell, drawer, read state
│   ├── profile/          # User hero, bio, mood status, vibe badges
│   ├── settings/         # Keyboard shortcuts, account, appearance, privacy
│   ├── stories/          # 24-hour cartoon stories reel, modal creator, auto-advance
│   └── world/            # Maple Park 2.5D Isometric World (Phaser 3 Engine)
├── services/             # Pure HTTP & WebSocket transport services (no direct UI fetch)
│   ├── api/              # httpClient, chatService, mediaService, realFriendsService
│   └── realtime/         # RealtimeService, Heartbeats, Optimistic Reconciliation
└── shared/               # Cross-cutting UI components, custom hooks, utilities
    ├── hooks/            # useModalA11y (focus-trap, scroll-lock, Esc), useMediaQuery
    └── ui/               # Toast notifications, Portal, ErrorBoundary
```

---

## 3. Backend Architecture (`backend/`)

The backend is built with **FastAPI**, **SQLAlchemy 2.0 Async**, and **PostgreSQL 16**:

```
backend/
├── app/
│   ├── api/v1/           # Versioned REST routers
│   │   ├── routers/      # auth, users, friends, conversations, media, stories, realtime
│   │   └── api.py        # Aggregated v1 API router
│   ├── core/             # Configuration, logging, errors, constants, security
│   │   ├── config.py     # Pydantic Settings (DB_TARGET, S3, CORS, rate limits)
│   │   ├── logging.py    # Structured JSON logging with request_id tracing
│   │   ├── security.py   # JWT decoding, signature verification, token generation
│   │   └── errors.py     # Unified AppException handlers (no raw DB leakage)
│   ├── db/               # Database engine, sessionmaker, base model
│   │   ├── session.py    # async_engine with NullPool (tests) / asyncpg pooling
│   │   └── base.py       # DeclarativeBase with UUID primary keys & timestamps
│   ├── models/           # SQLAlchemy 2.0 models (User, Profile, Chat, Message, Media)
│   ├── schemas/          # Pydantic v2 validation and response schemas
│   └── services/         # Core business logic
│       ├── auth_service.py       # User provisioning & session bootstrap
│       ├── media_service.py      # Upload handshake & signed URL resolution
│       ├── media_validator.py    # Magic byte verification & filename sanitization
│       ├── storage/              # Storage engines (Local, S3, Memory)
│       └── realtime_service.py   # WebSocket connection & event dispatch manager
├── alembic/              # Database schema migrations
└── tests/                # Pytest unit & integration test suites
```

---

## 4. Key Architectural Patterns

### 4.1 Monotonic Sequence Ordering & Idempotency
- Every conversation in PostgreSQL maintains a strictly incrementing sequence counter.
- Message insertions acquire row-level locks on the parent conversation record (`FOR UPDATE`), ensuring non-overlapping sequence numbers even under concurrent write pressure.
- Messages carry a client-generated UUID (`client_message_id`). Re-sending or retrying an existing client ID returns the existing record idempotently without duplicate insertions.

### 4.2 Optimistic Realtime Message Reconciliation
- When a user sends a message, it is instantly rendered in the local UI in a `pending` state with a cartoon clock icon.
- A client-generated `client_message_id` correlates the local optimistic message with the incoming WebSocket `message.created` event or REST response.
- On receipt of the server acknowledgement, the message status smoothly transitions to `sent` (single checkmark) or `delivered` (double checkmark) without layout jumping or duplicate bubbles.

### 4.3 3-Step Media Upload & Anti-Spoofing Handshake
1. **Initiate:** `POST /api/v1/media/upload/initiate` validates requested MIME type against an allowed whitelist, verifies file size quotas (Voice $\le$ 10MB, Images $\le$ 25MB, Files $\le$ 25MB), checks active user quota, and returns a pre-signed target URL.
2. **Upload:** Client uploads raw bytes directly to storage via HTTP `PUT`.
3. **Confirm:** `POST /api/v1/media/{id}/confirm` reads the file's initial magic bytes directly from storage. If an executable (`.exe`, ELF), HTML script, or mismatched container is detected, the upload is quarantined, deleted, and rejected with HTTP 400.

### 4.4 Defensive Accessibility & Responsive Design
- Modals enforce keyboard focus trapping, `Escape` key close, and background scroll locking via [`useModalA11y.ts`](file:///c:/Users/mohan/OneDrive/Desktop/Toonchat/src/shared/hooks/useModalA11y.ts).
- Mobile screens ($\le 640\text{px}$) transform centered modals into native-feeling slide-up bottom sheets.
- Navigation automatically pivots between a desktop side rail, a compact tablet rail ($768\text{px} - 1023\text{px}$), and a mobile bottom navigation bar with $\ge 44\text{px}$ touch targets.
- Mobile bottom navigation unmounts automatically during active chat threads (`/chat/:id`) and Maple Park World (`/world`) to prevent screen crowding.
