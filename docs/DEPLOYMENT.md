# ToonChat — Production Deployment Guide

This document provides complete, battle-tested deployment specifications for **ToonChat** (`toonchat`). It covers frontend SPA hosting, containerized FastAPI backend deployment, managed PostgreSQL migrations, S3-compatible object storage, production security hardening, and rollback strategies.

---

## 1. System Topology & Architecture

```
                       ┌────────────────────────┐
                       │  End Users (Web/Mobile)│
                       └───────────┬────────────┘
                                   │ HTTPS / WSS
                                   ▼
        ┌─────────────────────────────────────────────────────┐
        │ CDN & Reverse Proxy (Cloudflare / Vercel / Netlify) │
        └──────────────┬──────────────────────────────┬───────┘
                       │                              │
        Static Assets & SPA Routing           REST API & WebSockets
                       │                              │
                       ▼                              ▼
        ┌────────────────────────┐     ┌───────────────────────────────────┐
        │ Frontend Host          │     │ Backend Container (Railway/Render)│
        │ - Vercel / Netlify     │     │ - Gunicorn 23.0 + Uvicorn Workers │
        │ - Nginx (Docker)       │     │ - Non-root Linux Container        │
        │ - SPA Fallback         │     │ - Structured JSON Logs + Trace ID │
        └────────────────────────┘     └──────────────┬────────────────────┘
                                                      │
                       ┌──────────────────────────────┼─────────────────────────┐
                       │                              │                         │
                       ▼                              ▼                         ▼
        ┌────────────────────────────┐  ┌───────────────────────────┐  ┌─────────────────────────┐
        │ Managed PostgreSQL         │  │ Object Storage            │  │ Supabase Auth (IdP)     │
        │ - Supabase / Neon / Render │  │ - Cloudflare R2 / AWS S3  │  │ - JWT Signature Verify  │
        │ - SSL Required (Port 5432) │  │ - Private bucket by def.  │  │ - JWKS / HS256 Token    │
        │ - Connection Pooler        │  │ - Presigned Upload/Down.  │  │ - Zero Secret Leakage   │
        └────────────────────────────┘  └───────────────────────────┘  └─────────────────────────┘
```

---

## 2. Environment Variables Reference

> **Security Rule:** Never commit real secrets or production `.env` files to git. All secret keys must be injected via your hosting platform's secure Environment Secrets dashboard.

### Backend Environment Variables

| Variable Name | Purpose | Where Set | Secret? | Default / Example Value |
| :--- | :--- | :--- | :---: | :--- |
| `ENVIRONMENT` | Runtime environment toggle (`production` / `development`) | Cloud Container | No | `production` |
| `PROJECT_NAME` | Service title for OpenAPI and logs | Cloud Container | No | `ToonChat API` |
| `API_V1_STR` | Root path prefix for versioned endpoints | Cloud Container | No | `/api/v1` |
| `DB_TARGET` | Target DB mode: `supabase` or `local` | Cloud Container | No | `supabase` |
| `SUPABASE_DATABASE_URL` | Primary PostgreSQL connection string with asyncpg driver and SSL | Secret Manager | **YES** | `postgresql+asyncpg://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:5432/postgres?ssl=require` |
| `LOCAL_DATABASE_URL` | Fallback connection string for local container simulation | Docker Compose | No | `postgresql+asyncpg://postgres:postgrespassword@db:5432/toonchat` |
| `DATABASE_POOL_SIZE` | Connection pool size for asyncpg | Cloud Container | No | `20` |
| `DATABASE_MAX_OVERFLOW`| Maximum overflow connections allowed | Cloud Container | No | `10` |
| `CORS_ORIGINS` | Strict comma-separated list of allowed frontend origins | Cloud Container | No | `https://toonchat.app,https://www.toonchat.app` |
| `ALLOWED_HOSTS` | Strict hostname whitelist enforced by `TrustedHostMiddleware` | Cloud Container | No | `api.toonchat.app,toonchat.railway.app` |
| `SUPABASE_URL` | Supabase project URL for authentication | Cloud Container | No | `https://[PROJECT-REF].supabase.co` |
| `SUPABASE_JWT_SECRET` | Secret key used to verify Supabase JWT signatures (HS256) | Secret Manager | **YES** | `[32+ character high-entropy secret string]` |
| `SUPABASE_JWT_ALGORITHM`| JWT signing algorithm | Cloud Container | No | `HS256` (or `ES256` if using JWKS) |
| `STORAGE_BACKEND` | Active storage provider: `s3`, `local`, or `memory` | Cloud Container | No | `s3` (or `local` in single-node VM) |
| `S3_ENDPOINT_URL` | S3 API endpoint (AWS, Cloudflare R2, MinIO, or Supabase Storage) | Cloud Container | No | `https://[ACCOUNT_ID].r2.cloudflarestorage.com` |
| `S3_PUBLIC_ENDPOINT_URL`| Custom public CDN domain for downloads (optional) | Cloud Container | No | `https://cdn.toonchat.app` |
| `S3_BUCKET_NAME` | Name of the storage bucket (private by default) | Cloud Container | No | `toonchat-media-prod` |
| `S3_ACCESS_KEY` | Storage Access Key ID | Secret Manager | **YES** | `[ACCESS_KEY_ID]` |
| `S3_SECRET_KEY` | Storage Secret Access Key | Secret Manager | **YES** | `[SECRET_ACCESS_KEY]` |
| `S3_REGION` | Storage region | Cloud Container | No | `auto` (for R2) or `us-east-1` |
| `LOG_FORMAT` | Format of application logs (`json` for cloud log aggregators) | Cloud Container | No | `json` |
| `LOG_LEVEL` | Minimum log severity level | Cloud Container | No | `INFO` |
| `WEB_CONCURRENCY` | Number of Gunicorn worker processes | Cloud Container | No | `2` |
| `RUN_MIGRATIONS` | If `true`, runs `alembic upgrade head` on container boot | Cloud Container | No | `true` |

### Frontend Environment Variables

> **CRITICAL:** Frontend bundles are client-side public assets. `VITE_` variables are compiled directly into minified JavaScript and visible to all users. **NEVER** place secret keys, service role tokens, or database passwords in frontend environment variables.

| Variable Name | Purpose | Where Set | Secret? | Production Example Value |
| :--- | :--- | :--- | :---: | :--- |
| `VITE_API_URL` | Base URL for REST API calls | Vercel / Netlify | No | `https://api.toonchat.app/api/v1` |
| `VITE_WS_URL` | Base URL for real-time WebSocket connection | Vercel / Netlify | No | `wss://api.toonchat.app` |

---

## 3. Database & Migration Strategy

### Managed PostgreSQL Providers
- **Recommended Cloud:** **Supabase** (Free/Pro) or **Neon** (Serverless).
- **SSL Required:** All production connection strings must append `?ssl=require`.
- **Connection Pooling:** Use Supavisor session pooler (Port 5432) or transaction pooler (Port 6543) to avoid exhausting PostgreSQL connection limits during traffic spikes.

### Controlled Migration Deployment
Database migrations are versioned via Alembic located in [`backend/alembic/`](file:///c:/Users/mohan/OneDrive/Desktop/Toonchat/backend/alembic).

1. **Automated Migration on Container Start:**
   Set `RUN_MIGRATIONS=true` in your container environment variables. The entrypoint script [`backend/scripts/entrypoint.sh`](file:///c:/Users/mohan/OneDrive/Desktop/Toonchat/backend/scripts/entrypoint.sh) will automatically run:
   ```bash
   alembic upgrade head
   ```
2. **Manual Migration Execution (CI/CD Pipeline or CLI):**
   ```bash
   cd backend
   # In your CI environment with SUPABASE_DATABASE_URL configured
   alembic upgrade head
   ```
3. **Database Backup Strategy:**
   - Enable Daily Automated Backups with point-in-time recovery (PITR) in Supabase or Neon.
   - For manual pre-deployment snapshots:
     ```bash
     pg_dump -h [HOST] -U postgres -d postgres -F c -b -v -f toonchat_pre_deploy.dump
     ```

---

## 4. Object Storage Setup (Media, Voice, Stickers)

### Production S3 / Cloudflare R2 Bucket Configuration
1. **Private by Default:**
   The bucket MUST have public access blocked. Files are accessed strictly via pre-signed HMAC URLs generated by [`app/services/media_service.py`](file:///c:/Users/mohan/OneDrive/Desktop/Toonchat/backend/app/services/media_service.py) with a 1-hour expiration TTL.
2. **CORS Rules:**
   Configure CORS on your S3/R2 bucket to permit direct browser uploads:
   ```json
   [
     {
       "AllowedOrigins": ["https://toonchat.app", "https://www.toonchat.app"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["Content-Type", "Content-Length", "x-amz-*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
3. **Lifecycle Cleanup:**
   Configure a bucket lifecycle rule to expire incomplete multipart uploads after 1 day and delete orphan pending files after 7 days.

---

## 5. Backend Container Deployment (Railway / Render / Fly.io)

The backend is packaged into a hardened, non-root, multi-stage Linux container using [`backend/Dockerfile`](file:///c:/Users/mohan/OneDrive/Desktop/Toonchat/backend/Dockerfile).

### Process Management with Gunicorn & Uvicorn
- **Server:** Gunicorn 23.0 utilizing `uvicorn.workers.UvicornWorker` via [`backend/gunicorn_conf.py`](file:///c:/Users/mohan/OneDrive/Desktop/Toonchat/backend/gunicorn_conf.py).
- **Graceful Shutdown:** 30 seconds (`GRACEFUL_TIMEOUT=30`) ensuring in-flight messages and active WebSocket connections close cleanly without abrupt connection resets.
- **Keepalive:** Set to 65 seconds (`KEEPALIVE=65`) to prevent 502 Bad Gateway drops behind reverse proxies (Cloudflare, AWS ALB, Nginx).

### WebSocket Hosting & Free-Tier Caveats
> [!WARNING]
> **Free-Tier Spin-Down Warning:** Free-tier instances on Render and Fly.io spin down after 15 minutes of inactivity. When an instance sleeps, **ALL active WebSocket connections are terminated instantly**. Clients will trigger reconnect loops, and incoming real-time notifications/messages will not be received until the service wakes up (which takes 30–60 seconds).
>
> **Production Recommendation:**
> - Use a persistent container plan (e.g., Railway Starter/Pro at \$5/month, or Render Web Service at \$7/month).
> - On Fly.io, set `min_machines_running = 1` in `fly.toml` to prevent cold sleeps.

---

## 6. Frontend Deployment (Vercel / Netlify / Cloudflare Pages)

The frontend is an optimized Single Page Application (SPA).

### Configuration Files Provided
1. **Vercel:** [`vercel.json`](file:///c:/Users/mohan/OneDrive/Desktop/Toonchat/vercel.json) — includes client-side SPA route rewrites, immutable caching for `/assets/*`, and security headers.
2. **Netlify:** [`netlify.toml`](file:///c:/Users/mohan/OneDrive/Desktop/Toonchat/netlify.toml) & [`public/_redirects`](file:///c:/Users/mohan/OneDrive/Desktop/Toonchat/public/_redirects) — handles `/* -> /index.html 200` routing and cache policies.
3. **Container / Self-Hosted:** [`Dockerfile`](file:///c:/Users/mohan/OneDrive/Desktop/Toonchat/Dockerfile) & [`nginx.conf`](file:///c:/Users/mohan/OneDrive/Desktop/Toonchat/nginx.conf) — serves production assets with gzip compression, security headers, and reverse proxy routing.

### Step-by-Step Vercel Deployment
1. Connect your Git repository in Vercel.
2. Framework Preset: **Vite**.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Add Environment Variables:
   - `VITE_API_URL` = `https://[YOUR_BACKEND_URL]/api/v1`
   - `VITE_WS_URL` = `wss://[YOUR_BACKEND_URL]`
6. Click **Deploy**.

---

## 7. Security Hardening Checklist

- [x] **CORS Allowlist:** Strictly configured with `CORS_ORIGINS`. Never use `*` with credentials enabled.
- [x] **Strict-Transport-Security (HSTS):** Enforced on all HTTPS requests (`max-age=31536000; includeSubDomains`).
- [x] **Content-Security-Policy (CSP):** `default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';`.
- [x] **Permissions-Policy:** `camera=(), microphone=(self), geolocation=()` — explicitly permits self-origin voice recordings while blocking unauthorized hardware access.
- [x] **Host Filtering:** Enabled via `TrustedHostMiddleware` when `ALLOWED_HOSTS` is specified.
- [x] **Structured Logging:** JSON format enabled in production (`LOG_FORMAT=json`), capturing `request_id` context while sanitizing raw database exception details.
- [x] **Health Check Endpoints:**
  - `GET /health` -> Liveness check (HTTP 200 `{"status": "ok"}`).
  - `GET /ready` -> Readiness check verifying database connectivity via `SELECT 1` (HTTP 200 or HTTP 503).

---

## 8. One-Command Local Production Simulation

You can verify the entire production stack locally before cloud deployment using Docker Compose:

```bash
docker compose -f docker-compose.prod.yml up --build
```

This launches:
1. **`toonchat-prod-db`**: PostgreSQL 16 Alpine container with health monitoring.
2. **`toonchat-prod-backend`**: Multi-stage Python 3.11 container with Gunicorn + Uvicorn workers, running Alembic migrations automatically on startup and logging in JSON.
3. **`toonchat-prod-frontend`**: Nginx 1.27 Alpine container serving the production Vite build with gzip, security headers, and reverse proxying `/api/` and `/ws` to the backend.

### Verification URLs
- **Web App:** `http://localhost/`
- **Backend Liveness:** `http://localhost:8000/health`
- **Backend Readiness:** `http://localhost:8000/ready`

To stop and remove containers:
```bash
docker compose -f docker-compose.prod.yml down -v
```

---

## 9. Rollback Plan

### Instant Rollback (Frontend)
- **Vercel / Netlify:** In the project dashboard, select the previous successful deployment and click **Promote to Production** (instantaneous, zero downtime).

### Container Rollback (Backend)
- **Railway / Render:** Navigate to Deployments, locate the last working commit/image, and click **Rollback**.

### Database Schema Rollback (Alembic)
1. Always write database migrations following the **expand-contract pattern** (e.g., adding nullable columns first, dropping obsolete columns only after old code is replaced).
2. To downgrade a migration:
   ```bash
   cd backend
   alembic downgrade -1
   ```

---

## 10. Cost Breakdown & Budget Options

| Component | Free / Hobby Tier (\$0 – \$5/mo) | Production Grade (\$15 – \$25/mo) |
| :--- | :--- | :--- |
| **Frontend** | Vercel / Netlify / Cloudflare Pages (\$0) | Cloudflare Pages (\$0) or Vercel Pro (\$20/mo) |
| **Backend API** | Railway Starter (\$5/mo) or Render Web (\$7/mo) | Railway Pro or Fly.io 2x 1GB instances (\$10–\$15/mo) |
| **Database** | Supabase Free Tier (500MB DB) (\$0) | Supabase Pro (\$25/mo) or Neon Scale (\$19/mo) |
| **Object Storage**| Cloudflare R2 (10GB free, \$0 egress) (\$0) | Cloudflare R2 (\$0.015/GB-mo, free egress) |
| **Total Cost** | **\$5 – \$7 / month** | **\$25 – \$45 / month** |

---

## 11. Post-Deployment Verification Checklist

Once cloud deployment is live:

1. [ ] Check `GET https://[API_DOMAIN]/health` returns `{"status":"ok"}`.
2. [ ] Check `GET https://[API_DOMAIN]/ready` returns `{"status":"ready","db":"connected"}`.
3. [ ] Visit `https://[APP_DOMAIN]/login` and verify custom Fredoka/Nunito fonts and mascot graphics render cleanly.
4. [ ] Register a new test user and verify session token is issued and stored in browser storage.
5. [ ] Open an active conversation and send a real-time message; confirm instant delivery and checkmark state.
6. [ ] Record a 2-second voice note, send, and confirm audio waveform scrubs and plays back properly.
7. [ ] Inspect browser DevTools Network tab: verify static assets are served with `Cache-Control: public, max-age=31536000, immutable`.
8. [ ] Verify HTTP response headers include `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Permissions-Policy`.

