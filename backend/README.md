# ToonChat Backend

Asynchronous REST and Realtime backend for **ToonChat**, built with **FastAPI**, **PostgreSQL**, **SQLAlchemy 2.0 (async)**, **asyncpg**, **Alembic**, and **Pydantic v2**.

## Architecture & Features

- **Layered Monorepo Architecture**: Clean separation across routers, services, repositories, schemas, models, and realtime gateways.
- **Strict Typing & Pydantic v2**: High performance input validation, output serialization, and camelCase mapping matching the frontend TypeScript domain interfaces.
- **Asynchronous SQLAlchemy 2.0 & asyncpg**: Connection pooling and async queries.
- **Monotonic Message Sequencing**: Atomic sequence tracking per conversation for deterministic cursor pagination and unread counts.
- **Unordered Pair Social Graph**: Guaranteed single bidirectional record for friendships and direct chats.
- **Alembic Database Migrations**: Version-controlled async schema upgrades and downgrades.
- **Standardized Error Envelope**: Every error returns `{ code, message, details, request_id }`.
- **Structured Request-ID Logging**: End-to-end request tracing via `X-Request-ID` and async contextvars.
- **Supabase Auth Ready**: Intended production identity verification via Supabase JWTs with a reference stub fallback for local environments.

## Local Development Setup

### Prerequisites
- Python 3.11+
- PostgreSQL 16+ (via Docker Compose or local PostgreSQL service)

### 1. Database Setup
Start local PostgreSQL using Docker Compose from the repository root:
```bash
docker compose up -d
```
Or use a local PostgreSQL instance and ensure the database `toonchat_dev` exists.

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Dependencies
Create a virtual environment and install dependencies:
```bash
python -m venv .venv
source .venv/bin/activate  # Or on Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Database Migrations
Apply the initial schema migration:
```bash
alembic upgrade head
```

To rollback:
```bash
alembic downgrade base
```

### 5. Running the Application
Start the development server with live reload:
```bash
uvicorn app.main:app --reload --port 8000
```

- Health probe: `GET http://localhost:8000/health`
- Readiness probe: `GET http://localhost:8000/ready`
- Reference user stub: `GET http://localhost:8000/api/v1/me`
- Interactive Swagger docs (dev mode only): `http://localhost:8000/docs`

### 6. Running Tests
Run pytest test suites:
```bash
pytest
```
