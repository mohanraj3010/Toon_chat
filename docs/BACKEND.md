# TOONCHAT — BACKEND ARCHITECTURE SPECIFICATION
**Document Version:** 1.0.0  
**Phase:** Phase 10 — Backend Architecture  
**Status:** Under Review (Documentation Stage Deliverable)  
**Target Stack:** FastAPI + PostgreSQL + SQLAlchemy 2.0 async + asyncpg + Alembic + Pydantic v2  
**Database Infrastructure:** Supabase PostgreSQL (Production/Staging) + Docker Compose PostgreSQL 16 (Local Development & Migration Verification)

---

## 1. Executive Summary & Architecture Overview

ToonChat is a high-expression cartoon social messaging platform featuring direct/group messaging, layered cartoon avatar customizer, 24-hour cartoon stories with flying reactions, rich cartoon sticker trays, and the live interactive cartoon world of **Maple Park**.

The backend architecture is structured as a clean, decoupled sibling monorepo (`/backend`) directly satisfying the existing frontend domain types (`src/shared/types/index.ts`, `src/features/*/types.ts`) and service contracts (`src/services/api/interfaces.ts`, `src/features/*/api/*Service.ts`).

### Core Architectural Principles
1. **Layered Separation of Concerns:**
   - **Routers (`api/v1/routers/`)**: Pure HTTP and WebSocket transport handling, request deserialization, dependency injection, status code mapping.
   - **Services (`services/`)**: Business logic, domain invariants, validation rules, notification orchestration, event publishing.
   - **Repositories (`repositories/`)**: Abstracted data access, SQLAlchemy 2.0 async queries, database-level operations.
   - **Models (`models/`)**: Declarative SQLAlchemy 2.0 ORM classes with strict PostgreSQL constraints and type hints.
   - **Schemas (`schemas/`)**: Pydantic v2 schemas for strict input validation, output serialization, and OpenAPI schema generation. ORM models are never returned directly, and sensitive fields (e.g. `password_hash`) are strictly excluded.
2. **Concurrency & Monotonic Message Sequencing:**
   - Every conversation maintains a monotonic `message_seq_counter`. Messages receive a strictly ordered sequence number within their conversation (`conversation_id`, `sequence`), ensuring deterministic cursor-based pagination and reliable unread/read-receipt calculations.
   - Idempotency is enforced using `client_message_id` unique per sender to prevent duplicated sends on network retries.
3. **Decoupled Binary Storage:**
   - Database tables store metadata, MIME types, dimensions, and unique storage keys (`media` table). File binaries are stored in object storage (Supabase Storage / S3-compatible bucket) via secure presigned upload/download URLs.
4. **Resilient Realtime Presence:**
   - WebSocket connections handle bidirectional realtime communication for messaging events (typing indicators, delivery, read receipts, reactions) and the 2D spatial presence in Maple Park scenes (`park`, `cafe`, `plaza`).

---

## 2. Monorepo Project Structure

```text
toonchat/
├── backend/
│   ├── alembic/
│   │   ├── env.py                  # Async Alembic migration environment
│   │   ├── script.py.mako          # Migration template
│   │   └── versions/               # Timestamped migration revisions
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── api.py          # Central v1 router aggregator
│   │   │       └── routers/
│   │   │           ├── auth.py
│   │   │           ├── users.py
│   │   │           ├── avatars.py
│   │   │           ├── friends.py
│   │   │           ├── conversations.py
│   │   │           ├── messages.py
│   │   │           ├── groups.py
│   │   │           ├── stories.py
│   │   │           ├── notifications.py
│   │   │           ├── stickers.py
│   │   │           ├── media.py
│   │   │           ├── world.py
│   │   │           └── settings.py
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic-settings BaseSettings
│   │   │   ├── security.py         # Passlib/bcrypt, JWT access & refresh tokens
│   │   │   ├── logging.py          # Structured JSON logging with request_id
│   │   │   └── errors.py           # Custom domain exceptions & global handlers
│   │   ├── db/
│   │   │   ├── base.py             # Declarative Base & metadata import
│   │   │   └── session.py          # async_sessionmaker & engine lifecycle
│   │   ├── deps.py                 # FastAPI dependencies (get_db, get_current_user)
│   │   ├── models/                 # SQLAlchemy 2.0 ORM classes
│   │   │   ├── __init__.py
│   │   │   ├── user.py             # User, Profile, UserSettings, UserSession
│   │   │   ├── avatar.py           # Avatar
│   │   │   ├── social.py           # Friendship, Block
│   │   │   ├── chat.py             # Conversation, ConversationMember, Message, MessageReaction
│   │   │   ├── group.py            # Group, GroupInvite
│   │   │   ├── story.py            # Story, StoryView, StoryReaction
│   │   │   ├── notification.py     # Notification
│   │   │   ├── media.py            # Media
│   │   │   ├── sticker.py          # StickerPack, Sticker
│   │   │   └── world.py            # WorldPresence, WorldActivity
│   │   ├── repositories/           # Async database query repositories
│   │   ├── schemas/                # Pydantic v2 schemas
│   │   ├── services/               # Core business services
│   │   ├── realtime/               # WebSocket connection managers & pub/sub
│   │   └── main.py                 # FastAPI application factory & lifespan
│   ├── tests/
│   │   ├── conftest.py             # Async DB fixtures & TestClient
│   │   ├── test_health.py
│   │   ├── test_me.py
│   │   ├── test_migrations.py
│   │   └── test_auth.py
│   ├── .env.example
│   ├── alembic.ini
│   ├── pyproject.toml
│   └── README.md
├── docker-compose.yml              # Local isolated PostgreSQL 16 + Adminer
├── docs/
│   ├── ARCHITECTURE.md
│   └── BACKEND.md                  # (This document)
├── src/                            # Frontend React application
└── package.json
```

---

## 3. Proposed Data Model & Entity Relationship Diagram (Mermaid ERD)

```mermaid
erDiagram
    users ||--o| profiles : "has profile"
    users ||--o{ avatars : "configures"
    users ||--o| user_settings : "manages settings"
    users ||--o{ user_sessions : "maintains"
    users ||--o{ friendships : "requests or receives"
    users ||--o{ blocks : "blocks or is blocked"
    users ||--o{ conversation_members : "participates in"
    users ||--o{ messages : "sends"
    users ||--o{ message_reactions : "reacts"
    users ||--o{ groups : "creates"
    users ||--o{ group_invites : "receives or invites"
    users ||--o{ stories : "publishes"
    users ||--o{ story_views : "views"
    users ||--o{ story_reactions : "reacts to"
    users ||--o{ notifications : "receives"
    users ||--o{ media : "uploads"
    users ||--o| world_presence : "occupies location"

    conversations ||--o{ conversation_members : "contains"
    conversations ||--o{ messages : "records"
    conversations ||--o| groups : "bridges group chat"

    messages ||--o{ message_reactions : "accumulates"
    messages ||--o| media : "attaches"
    messages ||--o{ messages : "replies to"

    groups ||--o{ group_invites : "issues"

    stories ||--o{ story_views : "accumulates"
    stories ||--o{ story_reactions : "accumulates"
    stories ||--o| media : "attaches"

    sticker_packs ||--o{ stickers : "bundles"

    users {
        uuid id PK
        varchar username UK
        varchar email UK
        varchar password_hash
        varchar phone
        boolean is_active
        boolean is_verified
        timestamp deleted_at
        timestamp created_at
        timestamp updated_at
    }

    profiles {
        uuid id PK
        uuid user_id FK,UK
        varchar display_name
        varchar bio
        varchar vibe_text
        varchar status
        integer character_base
        text avatar_url
        varchar skin_tone
        varchar hair_color
        varchar clothing_color
        varchar favorite_reaction
        varchar mood
        varchar recent_activity
        timestamp created_at
        timestamp updated_at
    }

    avatars {
        uuid id PK
        uuid user_id FK
        integer version
        boolean is_current
        jsonb config
        timestamp created_at
        timestamp updated_at
    }

    friendships {
        uuid id PK
        uuid requester_id FK
        uuid addressee_id FK
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    blocks {
        uuid id PK
        uuid blocker_id FK
        uuid blocked_id FK
        timestamp created_at
    }

    conversations {
        uuid id PK
        varchar type
        varchar title
        text avatar_url
        uuid last_message_id
        timestamp last_message_at
        bigint message_seq_counter
        timestamp deleted_at
        timestamp created_at
        timestamp updated_at
    }

    conversation_members {
        uuid id PK
        uuid conversation_id FK
        uuid user_id FK
        varchar role
        bigint last_read_seq
        timestamp last_read_at
        boolean is_muted
        boolean is_pinned
        timestamp joined_at
        timestamp left_at
    }

    messages {
        uuid id PK
        uuid conversation_id FK
        uuid sender_id FK
        bigint sequence
        varchar client_message_id
        varchar type
        text body
        uuid media_id FK
        text media_url
        uuid reply_to_id FK
        boolean is_edited
        boolean is_deleted
        timestamp deleted_at
        timestamp created_at
        timestamp updated_at
    }

    message_reactions {
        uuid id PK
        uuid message_id FK
        uuid user_id FK
        varchar emoji
        timestamp created_at
    }

    groups {
        uuid id PK
        uuid conversation_id FK,UK
        varchar name
        varchar description
        varchar category
        varchar privacy
        varchar banner_color
        jsonb avatar_config
        uuid pinned_message_id FK
        uuid pinned_by_id FK
        timestamp pinned_at
        uuid created_by FK
        timestamp deleted_at
        timestamp created_at
        timestamp updated_at
    }

    group_invites {
        uuid id PK
        uuid group_id FK
        uuid user_id FK
        uuid inviter_id FK
        varchar type
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    stories {
        uuid id PK
        uuid user_id FK
        varchar type
        jsonb content
        uuid media_id FK
        text media_url
        timestamp created_at
        timestamp expires_at
        timestamp deleted_at
    }

    story_views {
        uuid id PK
        uuid story_id FK
        uuid viewer_id FK
        timestamp viewed_at
    }

    story_reactions {
        uuid id PK
        uuid story_id FK
        uuid user_id FK
        varchar emoji
        timestamp created_at
    }

    notifications {
        uuid id PK
        uuid user_id FK
        uuid actor_id FK
        varchar type
        text content
        varchar expression
        boolean read
        text target_url
        jsonb action_data
        timestamp created_at
    }

    media {
        uuid id PK
        uuid uploader_id FK
        varchar storage_key UK
        varchar mime_type
        bigint size_bytes
        varchar media_type
        varchar status
        jsonb metadata_json
        timestamp created_at
        timestamp updated_at
    }

    sticker_packs {
        uuid id PK
        varchar name
        varchar slug UK
        text thumbnail_url
        text description
        boolean is_official
        timestamp created_at
    }

    stickers {
        uuid id PK
        uuid pack_id FK
        varchar name
        text image_url
        varchar category
        integer sort_order
        timestamp created_at
    }

    world_presence {
        uuid id PK
        uuid user_id FK,UK
        varchar place_id
        float pos_x
        float pos_y
        varchar facing
        varchar action
        varchar status
        varchar status_text
        varchar speech_text
        timestamp speech_expires_at
        varchar emote_emoji
        timestamp emote_expires_at
        timestamp last_heartbeat_at
        timestamp updated_at
    }

    user_settings {
        uuid id PK
        uuid user_id FK,UK
        varchar who_can_message
        varchar who_can_see_status
        boolean find_by_email
        boolean find_by_phone
        boolean show_reading_activity
        jsonb notifications_json
        jsonb appearance_json
        jsonb chat_json
        boolean two_factor_enabled
        timestamp updated_at
    }

    user_sessions {
        uuid id PK
        uuid user_id FK
        varchar device
        varchar browser
        varchar ip_address
        varchar location
        varchar refresh_token_hash UK
        boolean is_revoked
        timestamp last_active_at
        timestamp expires_at
    }
```

---

## 4. Comprehensive Schema Decisions, Constraints, Indexes & Deletion Rules

### 4.1 `users`
- **Purpose:** Primary identity and credential store.
- **Columns:**
  - `id`: `UUID`, Primary Key, `default=gen_random_uuid()`
  - `username`: `VARCHAR(30)`, Not Null, Unique (case-insensitive indexing via `LOWER(username)`)
  - `email`: `VARCHAR(255)`, Nullable, Unique
  - `password_hash`: `VARCHAR(255)`, Nullable (allows federated/magic link sign-ins)
  - `phone`: `VARCHAR(32)`, Nullable
  - `is_active`: `BOOLEAN`, Default `TRUE`, Not Null
  - `is_verified`: `BOOLEAN`, Default `FALSE`, Not Null
  - `deleted_at`: `TIMESTAMPTZ`, Nullable (soft deletion)
  - `created_at`: `TIMESTAMPTZ`, Default `NOW()`, Not Null
  - `updated_at`: `TIMESTAMPTZ`, Default `NOW()`, Not Null
- **Indexes:**
  - `ix_users_username_lower`: `UNIQUE INDEX ON users (LOWER(username))`
  - `ix_users_email`: `INDEX ON users (email) WHERE email IS NOT NULL`
  - `ix_users_phone`: `INDEX ON users (phone) WHERE phone IS NOT NULL`
- **Deletion Policy:** Soft-delete only (`deleted_at`). Hard deletion requires an explicit GDPR/anonymization routine.

### 4.2 `profiles`
- **Purpose:** Public and social profile data satisfying frontend `UserProfile` and `DiscoverUser`.
- **Columns:**
  - `id`: `UUID`, Primary Key
  - `user_id`: `UUID`, Not Null, Unique, Foreign Key (`users.id`, `ON DELETE CASCADE`)
  - `display_name`: `VARCHAR(50)`, Not Null
  - `bio`: `VARCHAR(160)`, Default `''`, Not Null
  - `vibe_text`: `VARCHAR(50)`, Default `''`, Not Null (status bubble)
  - `status`: `VARCHAR(20)`, Default `'offline'`, Not Null (`online`, `offline`, `away`, `dnd`)
  - `character_base`: `SMALLINT`, Default `1`, Not Null (integers 1 to 8)
  - `avatar_url`: `TEXT`, Nullable
  - `skin_tone`: `VARCHAR(20)`, Nullable
  - `hair_color`: `VARCHAR(20)`, Nullable
  - `clothing_color`: `VARCHAR(20)`, Nullable
  - `favorite_reaction`: `VARCHAR(10)`, Nullable
  - `mood`: `VARCHAR(30)`, Nullable
  - `recent_activity`: `VARCHAR(100)`, Nullable
  - `created_at`, `updated_at`: `TIMESTAMPTZ`, Default `NOW()`, Not Null
- **Indexes:**
  - `ix_profiles_user_id`: `UNIQUE INDEX (user_id)`
  - `ix_profiles_status`: `INDEX (status)`
  - `ix_profiles_character_base`: `INDEX (character_base)`
- **Deletion Policy:** Cascades with `users`.

### 4.3 `avatars`
- **Purpose:** Layered SVG cartoon avatar configurations matching `AvatarConfig` in `src/features/avatar/types.ts`.
- **Columns:**
  - `id`: `UUID`, Primary Key
  - `user_id`: `UUID`, Not Null, Foreign Key (`users.id`, `ON DELETE CASCADE`)
  - `version`: `INTEGER`, Default `1`, Not Null (supports schema migrations for avatar part sets)
  - `is_current`: `BOOLEAN`, Default `TRUE`, Not Null
  - `config`: `JSONB`, Not Null
    - *JSON Schema Schema Validation:* Validates keys matching `AvatarConfig` (headShape, skinTone, eyes, eyeColor, eyebrows, eyebrowColor, nose, mouth, blush, hairStyle, hairColor, facialHair, outfit, glasses, hat, earrings, headphones, expression).
  - `created_at`, `updated_at`: `TIMESTAMPTZ`, Default `NOW()`, Not Null
- **Indexes:**
  - `ix_avatars_user_current`: `INDEX (user_id, is_current)`
  - `ix_avatars_config_gin`: `GIN INDEX (config)`
- **Deletion Policy:** Cascades with `users`.

### 4.4 `friendships`
- **Purpose:** Bilateral social relationships (`pending`, `accepted`, `declined`, `canceled`).
- **Columns:**
  - `id`: `UUID`, Primary Key
  - `requester_id`: `UUID`, Not Null, Foreign Key (`users.id`, `ON DELETE CASCADE`)
  - `addressee_id`: `UUID`, Not Null, Foreign Key (`users.id`, `ON DELETE CASCADE`)
  - `status`: `VARCHAR(20)`, Default `'pending'`, Not Null
  - `created_at`, `updated_at`: `TIMESTAMPTZ`, Default `NOW()`, Not Null
- **Constraints & Indexes:**
  - Check constraint: `requester_id <> addressee_id`
  - Unordered pair uniqueness: Unique partial index `CREATE UNIQUE INDEX ix_friendships_unique_pair ON friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id))` ensures two users cannot have multiple overlapping friendship records.
  - `ix_friendships_requester`: `INDEX (requester_id, status)`
  - `ix_friendships_addressee`: `INDEX (addressee_id, status)`
- **Deletion Policy:** Cascades with `users`.

### 4.5 `blocks`
- **Purpose:** User block list for safety and privacy.
- **Columns:**
  - `id`: `UUID`, Primary Key
  - `blocker_id`: `UUID`, Not Null, Foreign Key (`users.id`, `ON DELETE CASCADE`)
  - `blocked_id`: `UUID`, Not Null, Foreign Key (`users.id`, `ON DELETE CASCADE`)
  - `created_at`: `TIMESTAMPTZ`, Default `NOW()`, Not Null
- **Constraints & Indexes:**
  - Check constraint: `blocker_id <> blocked_id`
  - Unique constraint: `UNIQUE (blocker_id, blocked_id)`
  - `ix_blocks_blocker`: `INDEX (blocker_id)`
  - `ix_blocks_blocked`: `INDEX (blocked_id)`
- **Deletion Policy:** Cascades with `users`.

### 4.6 `conversations`
- **Purpose:** Chat threads (1-on-1 direct messages or multi-member group chats).
- **Columns:**
  - `id`: `UUID`, Primary Key
  - `type`: `VARCHAR(20)`, Not Null, Default `'direct'` (`direct`, `group`)
  - `title`: `VARCHAR(100)`, Nullable
  - `avatar_url`: `TEXT`, Nullable
  - `last_message_id`: `UUID`, Nullable (soft reference)
  - `last_message_at`: `TIMESTAMPTZ`, Nullable
  - `message_seq_counter`: `BIGINT`, Default `0`, Not Null (atomically incremented on message insert)
  - `deleted_at`: `TIMESTAMPTZ`, Nullable
  - `created_at`, `updated_at`: `TIMESTAMPTZ`, Default `NOW()`, Not Null
- **Indexes:**
  - `ix_conversations_last_message_at`: `INDEX (last_message_at DESC)`
- **Deletion Policy:** Soft deletion via `deleted_at`.

### 4.7 `conversation_members`
- **Purpose:** Membership state, unread tracking, pinning, and muting.
- **Columns:**
  - `id`: `UUID`, Primary Key
  - `conversation_id`: `UUID`, Not Null, Foreign Key (`conversations.id`, `ON DELETE CASCADE`)
  - `user_id`: `UUID`, Not Null, Foreign Key (`users.id`, `ON DELETE CASCADE`)
  - `role`: `VARCHAR(20)`, Default `'member'`, Not Null (`owner`, `admin`, `member`)
  - `last_read_seq`: `BIGINT`, Default `0`, Not Null
  - `last_read_at`: `TIMESTAMPTZ`, Nullable
  - `is_muted`: `BOOLEAN`, Default `FALSE`, Not Null
  - `is_pinned`: `BOOLEAN`, Default `FALSE`, Not Null
  - `joined_at`: `TIMESTAMPTZ`, Default `NOW()`, Not Null
  - `left_at`: `TIMESTAMPTZ`, Nullable
- **Constraints & Indexes:**
  - Unique constraint: `UNIQUE (conversation_id, user_id)`
  - `ix_cm_user_inbox`: `INDEX (user_id, is_pinned DESC, last_read_seq)`
  - `ix_cm_conversation`: `INDEX (conversation_id)`
- **Deletion Policy:** Cascades with `conversations` or `users`.

### 4.8 `messages`
- **Purpose:** Primary chat message store.
- **Columns:**
  - `id`: `UUID`, Primary Key
  - `conversation_id`: `UUID`, Not Null, Foreign Key (`conversations.id`, `ON DELETE CASCADE`)
  - `sender_id`: `UUID`, Nullable, Foreign Key (`users.id`, `ON DELETE SET NULL`)
  - `sequence`: `BIGINT`, Not Null (assigned monotonically per conversation)
  - `client_message_id`: `VARCHAR(128)`, Not Null (client-generated idempotency key)
  - `type`: `VARCHAR(20)`, Default `'text'`, Not Null (`text`, `image`, `sticker`, `voice`, `system`)
  - `body`: `TEXT`, Not Null
  - `media_id`: `UUID`, Nullable, Foreign Key (`media.id`, `ON DELETE SET NULL`)
  - `media_url`: `TEXT`, Nullable
  - `reply_to_id`: `UUID`, Nullable, Foreign Key (`messages.id`, `ON DELETE SET NULL`)
  - `is_edited`: `BOOLEAN`, Default `FALSE`, Not Null
  - `is_deleted`: `BOOLEAN`, Default `FALSE`, Not Null
  - `deleted_at`: `TIMESTAMPTZ`, Nullable
  - `created_at`, `updated_at`: `TIMESTAMPTZ`, Default `NOW()`, Not Null
- **Constraints & Indexes:**
  - Unique conversation sequence: `UNIQUE (conversation_id, sequence)`
  - Idempotency constraint: `UNIQUE (sender_id, client_message_id)`
  - Cursor pagination index: `INDEX ix_messages_pagination ON messages (conversation_id, sequence DESC)`
  - `ix_messages_reply_to`: `INDEX (reply_to_id) WHERE reply_to_id IS NOT NULL`
- **Deletion Policy:** Soft deletion (`is_deleted=True, deleted_at=NOW()`). The row remains to preserve sequence numbers and reply continuity, while `body` is scrubbed in API responses.

### 4.9 `message_reactions`
- **Purpose:** Emoji reactions on messages.
- **Columns:**
  - `id`: `UUID`, Primary Key
  - `message_id`: `UUID`, Not Null, Foreign Key (`messages.id`, `ON DELETE CASCADE`)
  - `user_id`: `UUID`, Not Null, Foreign Key (`users.id`, `ON DELETE CASCADE`)
  - `emoji`: `VARCHAR(32)`, Not Null
  - `created_at`: `TIMESTAMPTZ`, Default `NOW()`, Not Null
- **Constraints & Indexes:**
  - Unique reaction: `UNIQUE (message_id, user_id, emoji)`
  - `ix_mr_message`: `INDEX (message_id)`
  - `ix_mr_user`: `INDEX (user_id)`
- **Deletion Policy:** Cascades with `messages` or `users`.

### 4.10 `groups`
- **Purpose:** Cartoon community groups (`Maple Park Squad`, `Toon Artists Studio`, etc.) matching `GroupItem` in `src/features/groups/types.ts`.
- **Columns:**
  - `id`: `UUID`, Primary Key
  - `conversation_id`: `UUID`, Not Null, Unique, Foreign Key (`conversations.id`, `ON DELETE CASCADE`)
  - `name`: `VARCHAR(30)`, Not Null
  - `description`: `VARCHAR(140)`, Default `''`, Not Null
  - `category`: `VARCHAR(20)`, Default `'hangout'`, Not Null (`gaming`, `art`, `skate`, `music`, `hangout`, `tech`)
  - `privacy`: `VARCHAR(20)`, Default `'public'`, Not Null (`public`, `private`)
  - `banner_color`: `VARCHAR(30)`, Default `'#ffedd5'`, Not Null
  - `avatar_config`: `JSONB`, Not Null (`{ emblem, backgroundColor, pattern }`)
  - `pinned_message_id`: `UUID`, Nullable, Foreign Key (`messages.id`, `ON DELETE SET NULL`)
  - `pinned_by_id`: `UUID`, Nullable, Foreign Key (`users.id`, `ON DELETE SET NULL`)
  - `pinned_at`: `TIMESTAMPTZ`, Nullable
  - `created_by`: `UUID`, Not Null, Foreign Key (`users.id`, `ON DELETE RESTRICT`)
  - `deleted_at`: `TIMESTAMPTZ`, Nullable
  - `created_at`, `updated_at`: `TIMESTAMPTZ`, Default `NOW()`, Not Null
- **Indexes:**
  - `ix_groups_category`: `INDEX (category)`
  - `ix_groups_privacy`: `INDEX (privacy)`
- **Deletion Policy:** Soft deletion via `deleted_at`.

### 4.11 `group_invites`
- **Purpose:** Pending invitations and join requests for groups.
- **Columns:**
  - `id`: `UUID`, Primary Key
  - `group_id`: `UUID`, Not Null, Foreign Key (`groups.id`, `ON DELETE CASCADE`)
  - `user_id`: `UUID`, Not Null, Foreign Key (`users.id`, `ON DELETE CASCADE`)
  - `inviter_id`: `UUID`, Nullable, Foreign Key (`users.id`, `ON DELETE SET NULL`)
  - `type`: `VARCHAR(20)`, Default `'join_request'`, Not Null (`invite`, `join_request`)
  - `status`: `VARCHAR(20)`, Default `'pending'`, Not Null (`pending`, `accepted`, `declined`, `canceled`)
  - `created_at`, `updated_at`: `TIMESTAMPTZ`, Default `NOW()`, Not Null
- **Constraints & Indexes:**
  - Unique pending request: `UNIQUE (group_id, user_id, type, status)`
  - `ix_group_invites_lookup`: `INDEX (group_id, status)`
- **Deletion Policy:** Cascades with `groups` or `users`.

### 4.12 `stories`
- **Purpose:** 24-hour ephemeral stories matching `StoryItem` in `src/features/stories/types.ts`.
- **Columns:**
  - `id`: `UUID`, Primary Key
  - `user_id`: `UUID`, Not Null, Foreign Key (`users.id`, `ON DELETE CASCADE`)
  - `type`: `VARCHAR(20)`, Default `'expression'`, Not Null (`expression`, `sticker`, `text`)
  - `content`: `JSONB`, Not Null (`{ caption, expression, backgroundColor, backgroundPattern, stickers, textColor, fontFamily }`)
  - `media_id`: `UUID`, Nullable, Foreign Key (`media.id`, `ON DELETE SET NULL`)
  - `media_url`: `TEXT`, Nullable
  - `created_at`: `TIMESTAMPTZ`, Default `NOW()`, Not Null
  - `expires_at`: `TIMESTAMPTZ`, Not Null
  - `deleted_at`: `TIMESTAMPTZ`, Nullable
- **Indexes:**
  - Active stories query index: `INDEX ix_stories_active ON stories (user_id, expires_at) WHERE deleted_at IS NULL`
  - `ix_stories_expires_at`: `INDEX (expires_at)`
- **Deletion Policy:** Soft delete, and background job / TTL purges or archives expired records.

### 4.13 `story_views` & `story_reactions`
- **`story_views`:**
  - `id`: `UUID`, Primary Key
  - `story_id`: `UUID`, Not Null, Foreign Key (`stories.id`, `ON DELETE CASCADE`)
  - `viewer_id`: `UUID`, Not Null, Foreign Key (`users.id`, `ON DELETE CASCADE`)
  - `viewed_at`: `TIMESTAMPTZ`, Default `NOW()`, Not Null
  - Unique constraint: `UNIQUE (story_id, viewer_id)`
- **`story_reactions`:**
  - `id`: `UUID`, Primary Key
  - `story_id`: `UUID`, Not Null, Foreign Key (`stories.id`, `ON DELETE CASCADE`)
  - `user_id`: `UUID`, Not Null, Foreign Key (`users.id`, `ON DELETE CASCADE`)
  - `emoji`: `VARCHAR(32)`, Not Null
  - `created_at`: `TIMESTAMPTZ`, Default `NOW()`, Not Null
  - Unique constraint: `UNIQUE (story_id, user_id, emoji)`

### 4.14 `notifications`
- **Purpose:** Inbox notifications matching `NotificationItem` in `src/features/notifications/types.ts`.
- **Columns:**
  - `id`: `UUID`, Primary Key
  - `user_id`: `UUID`, Not Null, Foreign Key (`users.id`, `ON DELETE CASCADE`)
  - `actor_id`: `UUID`, Nullable, Foreign Key (`users.id`, `ON DELETE SET NULL`)
  - `type`: `VARCHAR(32)`, Not Null (`friend_request`, `message`, `reaction`, `story_interaction`, `group_activity`, `world_activity`)
  - `content`: `TEXT`, Not Null
  - `expression`: `VARCHAR(20)`, Default `'happy'`, Not Null
  - `read`: `BOOLEAN`, Default `FALSE`, Not Null
  - `target_url`: `TEXT`, Nullable
  - `action_data`: `JSONB`, Nullable
  - `created_at`: `TIMESTAMPTZ`, Default `NOW()`, Not Null
- **Indexes:**
  - `ix_notifications_user_unread`: `INDEX (user_id, read, created_at DESC)`
- **Deletion Policy:** Cascades with recipient `users`.

### 4.15 `media`
- **Purpose:** S3/Supabase Storage file metadata (images, voice notes, video clips). **Zero file bytes are stored in the database.**
- **Columns:**
  - `id`: `UUID`, Primary Key
  - `uploader_id`: `UUID`, Not Null, Foreign Key (`users.id`, `ON DELETE RESTRICT`)
  - `storage_key`: `VARCHAR(512)`, Not Null, Unique
  - `mime_type`: `VARCHAR(128)`, Not Null
  - `size_bytes`: `BIGINT`, Not Null
  - `media_type`: `VARCHAR(20)`, Not Null (`image`, `video`, `voice`)
  - `status`: `VARCHAR(20)`, Default `'pending_upload'`, Not Null (`pending_upload`, `ready`, `failed`, `deleted`)
  - `metadata_json`: `JSONB`, Nullable (`{ width, height, duration_ms, waveform }`)
  - `created_at`, `updated_at`: `TIMESTAMPTZ`, Default `NOW()`, Not Null
- **Indexes:**
  - `ix_media_uploader`: `INDEX (uploader_id)`
  - `ix_media_status`: `INDEX (status)`

### 4.16 `stickers` & `sticker_packs`
- **`sticker_packs`:**
  - `id`: `UUID`, Primary Key
  - `name`: `VARCHAR(50)`, Not Null
  - `slug`: `VARCHAR(50)`, Unique, Not Null
  - `thumbnail_url`: `TEXT`, Nullable
  - `description`: `TEXT`, Nullable
  - `is_official`: `BOOLEAN`, Default `TRUE`, Not Null
  - `created_at`: `TIMESTAMPTZ`, Default `NOW()`, Not Null
- **`stickers`:**
  - `id`: `UUID`, Primary Key
  - `pack_id`: `UUID`, Not Null, Foreign Key (`sticker_packs.id`, `ON DELETE CASCADE`)
  - `name`: `VARCHAR(50)`, Not Null
  - `image_url`: `TEXT`, Not Null
  - `category`: `VARCHAR(30)`, Not Null
  - `sort_order`: `INTEGER`, Default `0`, Not Null
  - `created_at`: `TIMESTAMPTZ`, Default `NOW()`, Not Null
  - `ix_stickers_pack`: `INDEX (pack_id, sort_order)`

### 4.17 `world_presence`
- **Purpose:** Live player presence and coordinates in Maple Park, Cozy Cafe, and Town Plaza.
- **Columns:**
  - `id`: `UUID`, Primary Key
  - `user_id`: `UUID`, Not Null, Unique, Foreign Key (`users.id`, `ON DELETE CASCADE`)
  - `place_id`: `VARCHAR(20)`, Default `'park'`, Not Null (`park`, `cafe`, `plaza`)
  - `pos_x`: `DOUBLE PRECISION`, Default `0.0`, Not Null
  - `pos_y`: `DOUBLE PRECISION`, Default `0.0`, Not Null
  - `facing`: `VARCHAR(10)`, Default `'right'`, Not Null (`left`, `right`)
  - `action`: `VARCHAR(20)`, Default `'idle'`, Not Null (`idle`, `walking`, `waving`, `sitting`)
  - `status`: `VARCHAR(20)`, Default `'active'`, Not Null (`active`, `idle`)
  - `status_text`: `VARCHAR(100)`, Default `''`, Not Null
  - `speech_text`: `VARCHAR(140)`, Nullable
  - `speech_expires_at`: `TIMESTAMPTZ`, Nullable
  - `emote_emoji`: `VARCHAR(32)`, Nullable
  - `emote_expires_at`: `TIMESTAMPTZ`, Nullable
  - `last_heartbeat_at`: `TIMESTAMPTZ`, Default `NOW()`, Not Null
  - `updated_at`: `TIMESTAMPTZ`, Default `NOW()`, Not Null
- **Indexes:**
  - `ix_wp_place_heartbeat`: `INDEX (place_id, last_heartbeat_at DESC)`
- **Presence Stale Policy:** Records with `last_heartbeat_at < NOW() - INTERVAL '60 SECONDS'` are treated as offline and swept by a periodic maintenance query.

### 4.18 `user_settings` & `user_sessions`
- **`user_settings`:**
  - `id`: `UUID`, Primary Key
  - `user_id`: `UUID`, Not Null, Unique, Foreign Key (`users.id`, `ON DELETE CASCADE`)
  - `who_can_message`: `VARCHAR(25)`, Default `'everyone'`, Not Null
  - `who_can_see_status`: `VARCHAR(25)`, Default `'everyone'`, Not Null
  - `find_by_email`: `BOOLEAN`, Default `TRUE`, Not Null
  - `find_by_phone`: `BOOLEAN`, Default `TRUE`, Not Null
  - `show_reading_activity`: `BOOLEAN`, Default `TRUE`, Not Null
  - `notifications_json`: `JSONB`, Not Null
  - `appearance_json`: `JSONB`, Not Null
  - `chat_json`: `JSONB`, Not Null
  - `two_factor_enabled`: `BOOLEAN`, Default `FALSE`, Not Null
  - `updated_at`: `TIMESTAMPTZ`, Default `NOW()`, Not Null
- **`user_sessions`:**
  - `id`: `UUID`, Primary Key
  - `user_id`: `UUID`, Not Null, Foreign Key (`users.id`, `ON DELETE CASCADE`)
  - `device`: `VARCHAR(100)`, Not Null
  - `browser`: `VARCHAR(100)`, Not Null
  - `ip_address`: `VARCHAR(45)`, Nullable
  - `location`: `VARCHAR(100)`, Default `'Unknown'`, Not Null
  - `refresh_token_hash`: `VARCHAR(255)`, Not Null, Unique
  - `is_revoked`: `BOOLEAN`, Default `FALSE`, Not Null
  - `last_active_at`: `TIMESTAMPTZ`, Default `NOW()`, Not Null
  - `expires_at`: `TIMESTAMPTZ`, Not Null

---

## 5. Versioned `/api/v1` Endpoint Inventory

All endpoints operate under the versioned prefix `/api/v1` (with system endpoints at root `/health` and `/ready`).

### 5.1 System & Observability
| Method | Endpoint | Summary | Auth | Request Schema | Response Schema | Status |
|---|---|---|---|---|---|---|
| `GET` | `/health` | Liveness probe (process is up) | None | None | `{ status: "ok" }` | 200 |
| `GET` | `/ready` | Readiness probe (verifies async DB connection) | None | None | `{ status: "ready", db: "connected" }` | 200, 503 |

### 5.2 Authentication & Sessions (`/api/v1/auth`)
| Method | Endpoint | Summary | Auth | Request Body | Response Body |
|---|---|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new user account | None | `RegisterRequest` | `TokenResponse` |
| `POST` | `/api/v1/auth/login` | Email/password login | None | `LoginRequest` | `TokenResponse` |
| `POST` | `/api/v1/auth/refresh` | Refresh access token using refresh cookie | None | `RefreshTokenRequest` | `TokenResponse` |
| `POST` | `/api/v1/auth/logout` | Revoke current session | Bearer | None | `MessageResponse` |
| `POST` | `/api/v1/auth/password/change` | Change password | Bearer | `PasswordChangeRequest` | `MessageResponse` |
| `GET` | `/api/v1/auth/sessions` | List active sessions for user | Bearer | None | `List[ActiveSessionItem]` |
| `DELETE`| `/api/v1/auth/sessions/other` | Terminate all other sessions | Bearer | None | `MessageResponse` |

### 5.3 Current User & Settings (`/api/v1/me`)
| Method | Endpoint | Summary | Auth | Request Body | Response Body |
|---|---|---|---|---|---|
| `GET` | `/api/v1/me` | Fetch authenticated user profile & avatar | Bearer | None | `CurrentUserResponse` |
| `PATCH`| `/api/v1/me/profile` | Update bio, display name, vibeText | Bearer | `UpdateProfileRequest` | `UserProfileResponse` |
| `GET` | `/api/v1/me/avatar` | Get active cartoon avatar config | Bearer | None | `AvatarConfigResponse` |
| `PUT` | `/api/v1/me/avatar` | Save new cartoon avatar config | Bearer | `AvatarConfigSchema` | `AvatarConfigResponse` |
| `GET` | `/api/v1/me/settings` | Get full user settings bundle | Bearer | None | `UserSettingsResponse` |
| `PATCH`| `/api/v1/me/settings` | Partial update of user settings | Bearer | `UpdateSettingsRequest` | `UserSettingsResponse` |
| `PATCH`| `/api/v1/me/settings/{section}`| Update single settings section | Bearer | `AnySectionUpdate` | `UserSettingsResponse` |

### 5.4 Users & Profiles (`/api/v1/users`)
| Method | Endpoint | Summary | Auth | Query / Request | Response Body |
|---|---|---|---|---|---|
| `GET` | `/api/v1/users/{id_or_username}` | Get public profile by ID or username | Bearer | None | `UserProfileResponse` |
| `GET` | `/api/v1/users/discover` | Discover users by search/interests | Bearer | `q: str, interests: list` | `List[DiscoverUserResponse]` |

### 5.5 Friends & Blocks (`/api/v1/friends`, `/api/v1/blocks`)
| Method | Endpoint | Summary | Auth | Request Body | Response Body |
|---|---|---|---|---|---|
| `GET` | `/api/v1/friends` | List accepted friends | Bearer | None | `List[DiscoverUserResponse]` |
| `GET` | `/api/v1/friends/online` | List friends currently online | Bearer | None | `List[DiscoverUserResponse]` |
| `GET` | `/api/v1/friends/requests` | List incoming friend requests | Bearer | None | `List[FriendRequestResponse]` |
| `GET` | `/api/v1/friends/sent` | List outgoing friend requests | Bearer | None | `List[FriendRequestResponse]` |
| `POST` | `/api/v1/friends/requests/{userId}` | Send friend request | Bearer | None | `MessageResponse` |
| `POST` | `/api/v1/friends/requests/{userId}/accept` | Accept friend request | Bearer | None | `MessageResponse` |
| `POST` | `/api/v1/friends/requests/{userId}/decline`| Decline friend request | Bearer | None | `MessageResponse` |
| `DELETE`| `/api/v1/friends/requests/{userId}` | Cancel sent friend request | Bearer | None | `MessageResponse` |
| `DELETE`| `/api/v1/friends/{userId}` | Remove friend | Bearer | None | `MessageResponse` |
| `GET` | `/api/v1/blocks` | List blocked users | Bearer | None | `List[BlockedUserResponse]` |
| `POST` | `/api/v1/blocks/{userId}` | Block user | Bearer | None | `MessageResponse` |
| `DELETE`| `/api/v1/blocks/{userId}` | Unblock user | Bearer | None | `MessageResponse` |

### 5.6 Conversations & Messaging (`/api/v1/conversations`)
| Method | Endpoint | Summary | Auth | Query / Request | Response Body |
|---|---|---|---|---|---|
| `GET` | `/api/v1/conversations` | List user's conversations | Bearer | None | `List[UIChatResponse]` |
| `POST` | `/api/v1/conversations` | Create or get 1-on-1 direct conversation | Bearer | `CreateDirectChatRequest` | `UIChatResponse` |
| `GET` | `/api/v1/conversations/{id}` | Get conversation metadata | Bearer | None | `UIChatResponse` |
| `GET` | `/api/v1/conversations/{id}/messages` | Cursor-based message history | Bearer | `cursor: str, limit: int = 50` | `CursorPage[MessageResponse]` |
| `POST` | `/api/v1/conversations/{id}/messages` | Send message (idempotent) | Bearer | `SendMessageRequest` | `MessageResponse` |
| `POST` | `/api/v1/conversations/{id}/read` | Mark messages read up to sequence | Bearer | `MarkReadRequest` | `MessageResponse` |
| `PATCH`| `/api/v1/conversations/{id}/pin` | Toggle pin conversation | Bearer | None | `MessageResponse` |
| `PATCH`| `/api/v1/conversations/{id}/mute`| Toggle mute conversation | Bearer | None | `MessageResponse` |
| `POST` | `/api/v1/messages/{id}/reactions` | Add or toggle emoji reaction | Bearer | `ReactionRequest` | `MessageResponse` |
| `DELETE`| `/api/v1/messages/{id}` | Delete message (soft delete) | Bearer | None | `MessageResponse` |

### 5.7 Groups (`/api/v1/groups`)
| Method | Endpoint | Summary | Auth | Request Body | Response Body |
|---|---|---|---|---|---|
| `GET` | `/api/v1/groups` | List discoverable groups | Bearer | `category: str = None` | `List[GroupItemResponse]` |
| `POST` | `/api/v1/groups` | Create group & conversation | Bearer | `CreateGroupRequest` | `GroupItemResponse` |
| `GET` | `/api/v1/groups/{id}` | Get group details & members | Bearer | None | `GroupItemResponse` |
| `PATCH`| `/api/v1/groups/{id}` | Update group details | Bearer | `UpdateGroupRequest` | `GroupItemResponse` |
| `DELETE`| `/api/v1/groups/{id}` | Delete group (owner only) | Bearer | None | `MessageResponse` |
| `POST` | `/api/v1/groups/{id}/join` | Join public group | Bearer | None | `MessageResponse` |
| `POST` | `/api/v1/groups/{id}/leave` | Leave group | Bearer | `new_owner_id: UUID = None` | `MessageResponse` |
| `POST` | `/api/v1/groups/{id}/requests`| Request to join private group | Bearer | None | `MessageResponse` |
| `POST` | `/api/v1/groups/{id}/requests/{userId}/approve` | Approve join request | Bearer | None | `MessageResponse` |
| `POST` | `/api/v1/groups/{id}/requests/{userId}/decline` | Decline join request | Bearer | None | `MessageResponse` |
| `DELETE`| `/api/v1/groups/{id}/members/{userId}` | Remove member from group | Bearer | None | `MessageResponse` |
| `PATCH`| `/api/v1/groups/{id}/members/{userId}/role` | Promote/demote role | Bearer | `RoleUpdateRequest` | `MessageResponse` |
| `POST` | `/api/v1/groups/{id}/pin` | Pin announcement message | Bearer | `PinMessageRequest` | `MessageResponse` |
| `DELETE`| `/api/v1/groups/{id}/pin` | Unpin announcement | Bearer | None | `MessageResponse` |

### 5.8 Stories (`/api/v1/stories`)
| Method | Endpoint | Summary | Auth | Request Body | Response Body |
|---|---|---|---|---|---|
| `GET` | `/api/v1/stories/feed` | Grouped 24h stories feed | Bearer | None | `List[UserStoryGroupResponse]` |
| `POST` | `/api/v1/stories` | Create expression/sticker story | Bearer | `StoryCreateRequest` | `StoryItemResponse` |
| `POST` | `/api/v1/stories/{id}/view` | Record story view | Bearer | None | `MessageResponse` |
| `POST` | `/api/v1/stories/{id}/react` | React to story | Bearer | `ReactionRequest` | `MessageResponse` |
| `DELETE`| `/api/v1/stories/{id}` | Delete story early | Bearer | None | `MessageResponse` |

### 5.9 Notifications (`/api/v1/notifications`)
| Method | Endpoint | Summary | Auth | Query / Request | Response Body |
|---|---|---|---|---|---|
| `GET` | `/api/v1/notifications` | List user notifications | Bearer | `unread_only: bool = False` | `List[NotificationResponse]` |
| `POST` | `/api/v1/notifications/{id}/read`| Mark single notification as read | Bearer | None | `MessageResponse` |
| `POST` | `/api/v1/notifications/read-all` | Mark all notifications read | Bearer | None | `MessageResponse` |

### 5.10 Media & Storage (`/api/v1/media`)
| Method | Endpoint | Summary | Auth | Request Body | Response Body |
|---|---|---|---|---|---|
| `POST` | `/api/v1/media/upload-url` | Generate presigned upload URL & storage key | Bearer | `MediaUploadUrlRequest` | `MediaUploadUrlResponse` |
| `POST` | `/api/v1/media/{id}/confirm` | Confirm upload completion & verify size | Bearer | None | `MediaResponse` |
| `GET` | `/api/v1/media/{id}` | Get media details & signed CDN URL | Bearer | None | `MediaResponse` |

### 5.11 Stickers (`/api/v1/stickers`)
| Method | Endpoint | Summary | Auth | Request Body | Response Body |
|---|---|---|---|---|---|
| `GET` | `/api/v1/stickers/packs` | List available sticker packs | Bearer | None | `List[StickerPackResponse]` |
| `GET` | `/api/v1/stickers/packs/{slug}`| Get sticker pack stickers | Bearer | None | `StickerPackDetailResponse` |

### 5.12 World & Maple Park (`/api/v1/world`)
| Method | Endpoint | Summary | Auth | Request Body | Response Body |
|---|---|---|---|---|---|
| `GET` | `/api/v1/world/places` | List world locations (park, cafe, plaza) | Bearer | None | `List[WorldPlaceConfigResponse]` |
| `GET` | `/api/v1/world/places/{id}/presence` | List active characters in scene | Bearer | None | `List[WorldCharacterResponse]` |
| `GET` | `/api/v1/world/activity` | Recent live activity feed | Bearer | None | `List[WorldActivityResponse]` |
| `POST` | `/api/v1/world/places/{id}/move` | Dispatch player movement | Bearer | `Vector2DRequest` | `WorldCharacterResponse` |
| `POST` | `/api/v1/world/places/{id}/emote` | Send bubble emote | Bearer | `EmoteRequest` | `MessageResponse` |
| `POST` | `/api/v1/world/places/{id}/speech`| Send cartoon speech bubble | Bearer | `SpeechRequest` | `MessageResponse` |
| `POST` | `/api/v1/world/places/{id}/wave` | Wave to nearby cartoon player | Bearer | `WaveRequest` | `MessageResponse` |

### 5.13 Realtime WebSocket Gateway (`/api/v1/realtime/ws`)
- **Protocol:** `ws://` / `wss://` with query token `?token=<JWT>` or initial auth handshake frame.
- **Channels / Topics:**
  - `user:{user_id}`: Private channel for unread counters, notification pings, incoming calls.
  - `conversation:{conversation_id}`: Realtime chat room for typing events, new messages, delivered receipts, and reactions.
  - `world:{place_id}`: Spatial scene broadcast for player moves, speeches, emotes, and waves.

---

## 6. API Error Envelope & Pagination Protocol

### 6.1 Standard Error Envelope
All error responses (4xx, 5xx) strictly follow the standardized envelope:
```json
{
  "code": "RESOURCE_NOT_FOUND",
  "message": "The requested conversation was not found or you lack permission.",
  "details": {
    "conversation_id": "8fa8d7a1-3069-4ce3-a006-259fc6c52a32"
  },
  "request_id": "req-9b34-8c8a77d6"
}
```

#### Standard Error Code Hierarchy:
- `VALIDATION_ERROR` (422) — Pydantic validation failures
- `UNAUTHORIZED` (401) — Missing, invalid, or expired credentials
- `FORBIDDEN` (403) — Authenticated user lacks permission
- `RESOURCE_NOT_FOUND` (404) — Requested resource does not exist
- `CONFLICT` (409) — Constraint violation (e.g. duplicate username, idempotency clash)
- `RATE_LIMITED` (429) — Too many requests
- `INTERNAL_ERROR` (500) — Unhandled server exception with tracked `request_id`

### 6.2 Cursor-Based Pagination Protocol
For message timelines and feeds, offset pagination (`OFFSET n`) degrades as tables grow. ToonChat uses monotonic cursor pagination based on sequence:
```json
{
  "items": [
    {
      "id": "c1f7f0aa-b54c-47ea-bd56-621aa906e001",
      "conversation_id": "chat-1",
      "sender_id": "1",
      "sequence": 142,
      "content": "See you at the skate ramps! 🛹",
      "type": "text",
      "created_at": "2026-10-22T17:40:00Z",
      "status": "delivered",
      "read_by": ["00000000-0000-0000-0000-000000000000"],
      "reactions": [{ "emoji": "🔥", "user_id": "2" }]
    }
  ],
  "next_cursor": "141",
  "has_more": true
}
```
Querying: `GET /api/v1/conversations/{id}/messages?cursor=142&limit=50` translates to:
```sql
SELECT * FROM messages 
WHERE conversation_id = :id AND sequence < :cursor 
ORDER BY sequence DESC 
LIMIT :limit;
```

---

## 7. Configuration, Security & Credentials Management

### 7.1 Environment Configuration (`pydantic-settings`)
Configuration is managed through `backend/app/core/config.py` using `Settings` extending `BaseSettings`:
```python
class Settings(BaseSettings):
    PROJECT_NAME: str = "ToonChat API"
    ENVIRONMENT: str = "development" # "development", "staging", "production"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: PostgresDsn = "postgresql+asyncpg://postgres:postgres@localhost:5432/toonchat"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    
    # Security
    SECRET_KEY: str = "INSECURE_DEV_SECRET_REPLACE_IN_PRODUCTION"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ALGORITHM: str = "HS256"
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # Media & Storage
    SUPABASE_URL: str | None = None
    SUPABASE_KEY: str | None = None # Public or service key, server-side only
    STORAGE_BUCKET_NAME: str = "toonchat-media"
    
    class Config:
        env_file = ".env"
        extra = "ignore"
```

### 7.2 Security Constraints
1. **No Credentials in Frontend:** The frontend Vite client receives only public URLs and user access tokens. Service-role keys, database passwords, and signing secrets are restricted to the backend environment.
2. **Password Security:** Password hashing via `bcrypt` with work factor 12. Password hashes are never selected into response DTOs.
3. **OpenAPI Docs Gating:** Swagger UI (`/docs`) and ReDoc (`/redoc`) are enabled strictly when `ENVIRONMENT == "development"`. In staging/production, doc endpoints return 404.
4. **Structured Request-ID Logging:** Every inbound request is assigned a `X-Request-ID` UUID header, tracked in an asynchronous `ContextVar`, and output in all structured JSON log lines.

---

## 8. Database Infrastructure: Supabase & Local Docker Compose

### 8.1 Supabase PostgreSQL Strategy
- **Driver:** `postgresql+asyncpg://`
- **Connection Modes:**
  - **Transaction Pooler (Port 6543):** Used in serverless/containerized deployments with high client concurrency.
  - **Direct Session (Port 5432):** Used by Alembic during migrations to support DDL operations, advisory locks, and transactional schema modifications.
- **SSL Requirements:** `ssl=require` is enforced when connecting to Supabase endpoints.

### 8.2 Read-Only Inspection of Existing Supabase Tables
- **Current Status:** Read-only inspection was executed. No Supabase credentials or active database connection strings are present in the local workspace or environment variables (`SUPABASE_URL`, `SUPABASE_KEY`, `DATABASE_URL` are unset; `.env.example` contains only frontend client URLs).
- **Zero-Risk Principle:** No credentials were hardcoded, invented, or logged.
- **Migration Safety Protocol:** Prior to running Alembic migrations against any live Supabase instance in future phases, the operator will supply credentials in a private `.env`, and the migration engine will run an inspection query against `information_schema.tables` to verify that no existing application tables will be dropped or modified destructively.

### 8.3 Local PostgreSQL Environment (`docker-compose.yml`)
For isolated development, migration testing, and automated integration tests, a root-level `docker-compose.yml` provides a local PostgreSQL 16 container:
```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    container_name: toonchat-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgrespassword
      POSTGRES_DB: toonchat
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d toonchat"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

---

## 9. Design Decisions & Open Questions for Product Alignment

### 9.1 Recorded Schema Decisions
1. **Unordered Pair Constraint for Friendships:**
   - *Decision:* Implemented via `CREATE UNIQUE INDEX ix_friendships_unique_pair ON friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id))` alongside a check constraint `requester_id <> addressee_id`.
   - *Rationale:* Completely prevents duplicate or reverse records (e.g. A->B and B->A both existing) without requiring two reciprocal database rows.
2. **Monotonic Message Sequencing per Conversation:**
   - *Decision:* Added `message_seq_counter` on `conversations` and `sequence` on `messages`.
   - *Rationale:* Eliminates timestamp collision problems during rapid messaging bursts and enables clean `O(1)` unread count calculation: `unreadCount = conversation.message_seq_counter - member.last_read_seq`.
3. **Avatar Versioning & Procedural Rendering:**
   - *Decision:* Kept `character_base` (1-8) in `profiles` for lightweight list rendering, while full SVG part configurations are stored in `avatars.config` (JSONB) with a `version` field.
   - *Rationale:* Directly mirrors frontend `AvatarConfig` and `themeBase` without requiring complex relational normalization for 15+ avatar clothing/hair/accessory SVG layers.
4. **Binary Storage Abstraction:**
   - *Decision:* Storage of media file bytes is strictly forbidden in PostgreSQL. `media` table maintains metadata and storage keys; uploads use presigned S3/Supabase Storage URLs.
   - *Rationale:* Protects database performance, keeps backup sizes compact, and leverages CDN caching for images and voice notes.

### 9.2 Open Questions for Product Clarification
1. **Authentication Provider Architecture:**
   - *Question:* Should authentication be handled directly by FastAPI (custom JWT with bcrypt) or integrated with Supabase Auth (verifying Supabase JWTs with JWKS)?
   - *Recommendation:* Support standalone FastAPI JWT for development and automated testing, with a pluggable dependency to verify Supabase Auth bearer tokens in cloud deployment.
2. **24-Hour Story Retention Policy:**
   - *Question:* When a story expires (`expires_at <= NOW()`), should the row be hard-deleted, soft-deleted, or archived for user "Memories"?
   - *Recommendation:* Default to soft deletion (`deleted_at`), with an optional settings toggle for user archive in a later phase.
3. **Direct Conversation Deduplication:**
   - *Question:* Can two users have more than one direct conversation?
   - *Recommendation:* Enforce at most one active direct conversation between any pair of users via a partial unique index or service validation.
4. **Group Membership Limits:**
   - *Question:* Is there a maximum member cap for cartoon community groups (e.g. 500 members)?
   - *Recommendation:* Enforce an initial cap of 250 members per group for performant real-time broadcast.

---

## 10. Next Steps After Documentation Review

Once this specification (`docs/BACKEND.md`) is reviewed and approved:
1. Initialize the `/backend` folder layout and root `docker-compose.yml`.
2. Implement the SQLAlchemy 2.0 async models and relationships.
3. Configure Alembic and generate the initial migration script.
4. Verify migration upgrade and downgrade cycles against the isolated local PostgreSQL container.
5. Implement the health endpoints (`/health`, `/ready`) and reference stub `GET /api/v1/me`.
6. Add centralized error handling and request-ID structured logging.
7. Write and run pytest test suites for health and reference endpoints.
8. Validate that the frontend build and tests remain 100% green.
