# 🎨 ToonChat

> **"Don't just text. Express yourself."**  
> A high-performance, cartoon-first social messaging platform featuring realtime WebSocket communications, interactive SVG avatars, in-browser voice messaging with waveform seeking, 40+ original sticker assets, and an interactive 2.5D isometric cartoon world (**Maple Park**).

---

[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict_6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Phaser](https://img.shields.io/badge/Phaser-3.88-E74C3C)](https://phaser.io/)
[![Vitest](https://img.shields.io/badge/Vitest-5.0_Passed-729B1B?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E_Verified-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🌟 Executive Overview

**ToonChat** is a web-native social communication app crafted to eliminate generic, sterile corporate messaging. Designed with an intentional cartoon aesthetic—chunky 3px borders, tactile drop shadows (`3px 3px 0 #18181B`), warm cream backdrops (`#FFFDF7`), vibrant accents, and playful spring animations—ToonChat pairs expressive design with enterprise-grade engineering.

Under the hood lies an asynchronous distributed architecture: a strictly typed **FastAPI** backend running over asyncpg-backed **PostgreSQL 16**, paired with a **React 19** frontend utilizing optimistic state updates, monotonic sequence ordering, and secure 3-step media pipelines.

---

## ✨ Core Features

### 1. 🎭 Interactive SVG Avatar System
- **Layered Vector Engine**: Highly modular SVG avatar system composed of configurable skin tones, face shapes, hairstyles, facial hair, expressive eyes, mouth moods, outfits, and headwear.
- **Real-Time Synchronized Identity**: Avatar changes propagate instantly across the entire application—persisting in chat bubbles, social friend lists, active story rings, the navigation rail, and the Phaser 2.5D world.
- **Export & Portability**: Avatars render cleanly as SVGs at any scale without raster pixelation or artifacting.

### 2. ⚡ Low-Latency Real-Time Messaging
- **Atomic Monotonic Sequencing**: Messages are numbered sequentially per conversation using PostgreSQL row-level locks (`SELECT FOR UPDATE`), preventing gaps, sequence desyncs, and duplicate bubbles under concurrent writes.
- **Optimistic Reconciliation**: Outgoing messages appear immediately with a pending clock badge, seamlessly reconciling to `sent` or `delivered` checkmarks upon server acknowledgment via client-generated UUID matching.
- **Typing Indicators & Live Presence**: Ephemeral typing heartbeats with debounced timeouts and real-time user online/offline status.

### 3. 🎙️ Studio-Grade Voice Notes
- **In-Browser Audio Recording**: Direct Web Audio API pipeline capturing Opus/WebM audio with real-time waveform visualization during recording.
- **Interactive Audio Player**: Interactive amplitude bars with tap-to-seek playback, dynamic playback speed toggles (1x, 1.5x, 2x), and duration timestamps.
- **Defensive Quota Enforcement**: Voice clips are enforced to $\le$ 10MB with strict magic-byte file signature validation.

### 4. 🌳 Maple Park (2.5D Isometric World)
- **Embedded Phaser 3 Engine**: A full 2.5D isometric playground seamlessly embedded within the responsive web shell.
- **Smooth Sprite Movement**: 4-directional keyboard navigation (WASD / Arrow keys) with collision physics around park trees, water fountains, and picnic tables.
- **Spatial Bubble Chat**: Chat messages spoken in the park float dynamically above player avatars in cartoon speech bubbles with automatic proximity fading.

### 5. 🎈 Original Stickers & Animated Reactions
- **40+ Original Cartoon Stickers**: Organized into 4 themed packs: *Toon Expressions*, *Party Animals*, *Food Moods*, and *Gamer Vibe*.
- **One-Tap Micro-Reactions**: Popover reaction tray on any chat bubble with spring-loaded animated reactions (❤️, 😂, 😮, 😢, 🔥, 🎉).

### 6. 📱 24-Hour Stories Reel
- **Ephemeral Highlights**: Share cartoon media and text stories with friends that automatically expire after 24 hours.
- **Active Story Avatar Rings**: Gradient cartoon borders indicate unviewed stories across the feed.
- **Interactive Story Viewer**: Fullscreen viewer with timed progress segments, touch/swipe navigation, and direct inline reaction replies.

### 7. 🛡️ Enterprise Security & Media Hardening
- **Anti-Spoofing Media Handshake**: 3-step signed URL upload pattern (Initiate $\rightarrow$ Storage Upload $\rightarrow$ Confirm). Server reads raw magic bytes directly from storage to eliminate executable polyglots, dangerous scripts, or forged MIME types.
- **Zero Client Secrets**: Strict architecture where `import.meta.env` contains only public gateway endpoints. All session tokens are handled via Supabase JWTs with strict origin checks.
- **Defensive Headers & Isolation**: Out-of-the-box CSP, HSTS, X-Frame-Options (`DENY`), X-Content-Type-Options (`nosniff`), and rate-limited endpoints.

---

## 🛠️ Architecture & Tech Stack

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 19 + Vite)                      │
│  - Zustand (UI & Session State)      - TanStack Query v5 (Data Cache)  │
│  - Motion (Spring Transitions)       - Phaser 3 (2.5D Isometric Engine)│
│  - Fredoka & Nunito Typography       - Lucide React & Custom SVG Icons │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTPS / WSS
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI + Async Python)                  │
│  - Gunicorn + Uvicorn Workers        - Pydantic v2 Serialization       │
│  - WebSocket Connection Gateway      - Request-ID Distributed Tracing  │
│  - Strict Magic Byte Validator       - Row-Level Lock Sequencing       │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
┌─────────────────────────────────────┐   ┌──────────────────────────────┐
│       PostgreSQL 16 Database        │   │        Object Storage        │
│  - SQLAlchemy 2.0 Async (asyncpg)   │   │  - S3 / Cloudflare R2 / MinIO│
│  - Alembic Database Migrations      │   │  - Pre-signed HMAC URLs      │
│  - Monotonic Sequences & Unordered  │   │  - Quota & Size Enforcement  │
│    Pair Social Graph Constraints    │   │  - Media Quarantine Checks   │
└─────────────────────────────────────┘   └──────────────────────────────┘
```

### Technology Breakdown

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19** | Concurrent UI rendering with strict component modularity |
| **Build Tool** | **Vite 8** | Lightning-fast ESM builds and Hot Module Replacement (HMR) |
| **Language** | **TypeScript 6.0 (Strict)** | End-to-end type safety, zero `any`, strict null checks |
| **Server State** | **TanStack Query v5** | Declarative query caching, revalidation, and optimistic rollback |
| **Client State** | **Zustand 5** | Lightweight reactive state for auth, presence, audio playback, and modals |
| **Motion** | **Motion (Framer)** | Cartoon squashes, stretches, spring entrances, and drawer transitions |
| **2.5D Engine** | **Phaser 3.88** | Canvas rendering for Maple Park isometric world |
| **Backend Framework** | **FastAPI 0.115+** | High-performance async REST & WebSocket server |
| **ORM & Driver** | **SQLAlchemy 2.0 + asyncpg** | Non-blocking database queries with connection pooling |
| **Database** | **PostgreSQL 16** | Relational integrity, row locking, and transactional migrations |
| **Migrations** | **Alembic 1.14+** | Async database schema lifecycle management |
| **Identity / Auth** | **Supabase Auth / PyJWT** | Cryptographically signed JWT verification with fallback provider |
| **Testing** | **Vitest, Playwright, Pytest** | Multi-tier automated testing (unit, component, security, and E2E) |
| **Styling & Assets** | **CSS Modules + CSS Variables**| Zero-runtime design system, tokenized chunky cartoon theme |

---

## 📁 Repository Structure

```
Toonchat/
├── backend/                       # FastAPI Asynchronous Backend
│   ├── alembic/                   # Database schema migrations
│   ├── app/
│   │   ├── api/v1/routers/        # REST endpoints (auth, chats, friends, media, users)
│   │   ├── core/                  # Config, structured logging, errors, security
│   │   ├── db/                    # Async SQLAlchemy session and base models
│   │   ├── models/                # Database entities (User, Message, Chat, Media)
│   │   ├── schemas/               # Pydantic v2 schemas for request/response validation
│   │   └── services/              # Core business services & storage drivers
│   ├── tests/                     # Pytest unit, security audit, and integration suites
│   ├── Dockerfile                 # Non-root multi-stage production container
│   ├── gunicorn_conf.py           # Production Gunicorn worker configuration
│   └── requirements.txt           # Production Python dependencies
├── src/                           # React 19 Frontend
│   ├── app/                       # App router, shell layout, and env validation
│   ├── assets/                    # Cartoon SVG character components & sticker packs
│   ├── design-system/             # Design tokens (`tokens.css`) & chunky primitives
│   ├── features/                  # Modular domain features:
│   │   ├── auth/                  # Authentication forms & session guard
│   │   ├── avatar/                # Interactive SVG Avatar Creator
│   │   ├── chats/                 # Chat feeds, bubbles, voice recording, reactions
│   │   ├── friends/               # Social graph, requests, discover pals
│   │   ├── groups/                # Cartoon squad & group chat management
│   │   ├── notifications/         # Realtime alerts drawer
│   │   ├── profile/               # User bio, moods, vibe badges
│   │   ├── settings/              # User preferences & keyboard shortcuts
│   │   ├── stories/               # 24-hour cartoon stories reel
│   │   └── world/                 # Maple Park 2.5D Phaser 3 game world
│   ├── services/                  # HTTP client, WebSocket manager, domain services
│   └── shared/                    # A11y hooks, toast notifications, modals, error boundaries
├── e2e/                           # Playwright multi-viewport end-to-end tests
├── docs/                          # In-depth architectural & operational documentation
│   ├── ARCHITECTURE.md            # System design, data flow, and sequencing models
│   ├── REALTIME.md                # WebSocket frame protocol and reconciliation rules
│   ├── DEPLOYMENT.md              # Production infrastructure, env vars, and runbooks
│   └── SECURITY_REPORT.md         # Vulnerability audits and remediation proof
├── docker-compose.prod.yml        # Production full-stack container orchestration
├── nginx.conf                     # Production SPA reverse proxy with security headers
└── vite.config.ts                 # Optimized Vite configuration with isolated test runner
```

---

## 🚀 Quick Start & Local Development

### Prerequisites
- **Node.js**: `v20.x` or later
- **Python**: `3.11+`
- **Docker & Docker Compose** (for PostgreSQL)

---

### 1. Database Setup
Launch a local PostgreSQL 16 instance using Docker:
```bash
docker run --name toonchat-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=toonchat_dev -p 5432:5432 -d postgres:16-alpine
```

---

### 2. Backend Setup
1. Navigate to the backend directory and set up a virtual environment:
   ```bash
   cd backend
   python -m venv .venv

   # Activate virtual environment:
   # On macOS/Linux:
   source .venv/bin/activate
   # On Windows:
   .venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   *(Defaults connect directly to `localhost:5432` with local storage mode enabled)*

4. Run database migrations:
   ```bash
   alembic upgrade head
   ```

5. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *API documentation will be available at [http://localhost:8000/docs](http://localhost:8000/docs)*

---

### 3. Frontend Setup
1. In a new terminal from the repository root, install dependencies:
   ```bash
   npm install
   ```

2. Configure frontend environment:
   ```bash
   cp .env.example .env
   ```
   *(Default values point to `VITE_API_URL=http://localhost:8000/api/v1` and `VITE_WS_URL=ws://localhost:8000/api/v1/realtime/ws`)*

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *Open [http://localhost:5173](http://localhost:5173) in your browser.*

---

### 4. Full-Stack Docker Deployment
To run the complete production-grade application stack (Nginx frontend + Gunicorn backend + PostgreSQL 16) with a single command:
```bash
docker compose -f docker-compose.prod.yml up --build
```
*Access the production application at [http://localhost:80](http://localhost:80).*

---

## 🧪 Testing & Verification

ToonChat maintains high testing standards across frontend, backend, security, and end-to-end browser execution:

```bash
# 1. Run all Frontend Unit & Component Tests (Vitest)
npm test -- --run

# 2. Run Playwright End-to-End Tests (Desktop & Mobile Viewports)
npm run test:e2e

# 3. Run Backend Security & Unit Tests (Pytest)
cd backend
python -m pytest tests/test_media_security_audit.py tests/test_media_audio.py tests/test_media_storage_unit.py tests/test_security_audit_remediation.py

# 4. Strict Typecheck & Linter
npx tsc -b
npm run lint
```

### Test Suite Summary
- **Frontend Unit / Component Tests**: 15 test suites, 171 tests passed (100% pass rate).
- **Backend Security & Unit Tests**: 32 test cases passed in 0.43s.
- **Playwright E2E Tests**: Verified across Desktop Chrome (1920x1080) and Mobile Chrome (Pixel 5 viewport).
- **TypeScript & Linting**: 0 type errors, 0 linter errors.

---

## 🌐 API & Realtime Gateway Reference

| Protocol | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/v1/auth/register` | Register a new toon account with username & email | No |
| `POST` | `/api/v1/auth/login` | Authenticate and obtain JWT session token | No |
| `GET` | `/api/v1/users/me` | Fetch current user profile, avatar config, and settings | Yes |
| `PUT` | `/api/v1/users/me/avatar` | Update layered avatar customization SVG payload | Yes |
| `GET` | `/api/v1/conversations` | List user active chats with latest message preview & unread badge | Yes |
| `GET` | `/api/v1/conversations/{id}/messages` | Cursor-based message history with monotonic sequences | Yes |
| `POST` | `/api/v1/conversations/{id}/messages` | Send message (text, voice, sticker, image) | Yes |
| `POST` | `/api/v1/media/upload/initiate` | Initiate 3-step signed media upload handshake | Yes |
| `POST` | `/api/v1/media/{id}/confirm` | Confirm upload with server-side magic-byte inspection | Yes |
| `POST` | `/api/v1/realtime/ticket` | Request 60-second single-use WebSocket connection ticket | Yes |
| `WSS` | `/api/v1/realtime/ws` | Full-duplex WebSocket connection for live messages & presence | Ticket |
| `GET` | `/health` | Liveness probe returning `{ status: "ok" }` | No |
| `GET` | `/ready` | Readiness probe verifying PostgreSQL connection pool health | No |

*Detailed WebSocket event payloads and message schemas are documented in [docs/REALTIME.md](docs/REALTIME.md).*

---

## 📚 Technical Documentation

For complete technical specifications, review our documentation suite:
- 📖 [**Architecture Guide (docs/ARCHITECTURE.md)**](docs/ARCHITECTURE.md): Deep-dive into sequence locking, optimistic reconciliation, and database schemas.
- ⚡ [**Realtime Protocol (docs/REALTIME.md)**](docs/REALTIME.md): Complete WebSocket frame specifications, typing events, and reconnection lifecycles.
- 🚀 [**Production Deployment Guide (docs/DEPLOYMENT.md)**](docs/DEPLOYMENT.md): Production hosting guide, environment variable matrix, S3/R2 storage setup, and zero-downtime deploy procedures.
- 🛡️ [**Security Audit Report (docs/SECURITY_REPORT.md)**](docs/SECURITY_REPORT.md): Remediation proof for SEC-01 through SEC-13, file validation rules, and threat modeling.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
