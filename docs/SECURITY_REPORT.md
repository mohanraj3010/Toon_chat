# TOONCHAT — PHASE 14 SECURITY & PERMISSION AUDIT REPORT

**Date:** 2026-11-05  
**Scope:** Full-Stack Deep Security & Permission Audit (Frontend, Backend, Auth, Database, REST APIs, WebSockets, Uploads, Storage, Configuration, Dependencies)  
**Status:** Completed & Mitigated  

---

## 1. Executive Summary

A comprehensive, defense-in-depth security and permission audit of the ToonChat application was conducted across all system boundaries. The audit evaluated access control (IDOR), authentication integrity, authorization escalation, WebSocket connection and event handling, SQL/database safety, file storage containment, HTTP security headers, and client-side input/output hygiene.

The audit demonstrated strong architectural baselines across the stack:
- **Monotonic Sequence & Idempotency:** Deterministic row-level locking on conversations with monotonic sequence allocation preventing replay attacks and race conditions.
- **Strict Relationship Controls:** Active membership validation on all conversation and messaging endpoints, with mutual blocking checks enforced before message dispatch.
- **Media Security Pipeline:** Pre-signed URLs with short time-to-live (15 minutes), magic byte MIME validation, and HMAC-verified download endpoints.
- **Modern Query Hygiene:** SQLAlchemy 2.0 parameterized queries with zero raw string SQL interpolation.

Targeted vulnerabilities were identified across both backend services and frontend components (SEC-01 through SEC-13). All approved findings have been remediated with surgical, non-breaking fixes and verified with dedicated automated regression test suites.

---

## 2. Findings by Severity

```
+-----------------------------------------------------------------------------------+
| Finding  | Severity | Title                                            | Status    |
+----------+----------+--------------------------------------------------+-----------+
| SEC-01   | HIGH     | WebSocket Handshake Missing Origin Verification  | FIXED     |
| SEC-02   | HIGH     | File Serving Missing Content-Disposition/nosniff | FIXED     |
| SEC-08   | HIGH     | Public Profile Data Exposure & IDOR              | FIXED     |
| SEC-03   | MEDIUM   | Missing Global HTTP Security Headers             | FIXED     |
| SEC-04   | MEDIUM   | Unsanitized Protocol in Dynamic Anchor Download  | FIXED     |
| SEC-05   | MEDIUM   | Path Traversal Prefix in LocalStorageService     | FIXED     |
| SEC-09   | MEDIUM   | Database Exception Details in HTTP 500 Responses | FIXED     |
| SEC-10   | MEDIUM   | Missing Content-Security-Policy (CSP) Header     | FIXED     |
| SEC-06   | LOW      | Username/Email Enumeration via Registration      | MITIGATED |
| SEC-07   | LOW      | Missing createToken in LocalSupabaseAuthClient   | FIXED     |
| SEC-11   | LOW      | Missing Length Limits on Profile Status & Mood   | FIXED     |
| SEC-12   | LOW      | Permissions-Policy Blocking Microphone Access    | FIXED     |
| SEC-13   | LOW      | Missing Rate Limiting on User Search Endpoints   | FIXED     |
+-----------------------------------------------------------------------------------+
```

---

### CRITICAL

*No vulnerabilities classified as CRITICAL (remote code execution, unauthenticated database exfiltration, or complete authentication bypass) were identified.*

---

### HIGH

#### [SEC-01] Missing Origin Verification on WebSocket Handshake (Cross-Site WebSocket Hijacking Risk)
- **Component:** Backend Realtime Gateway  
- **File:** `backend/app/api/v1/routers/realtime.py`  
- **Vulnerability:** FastAPI `CORSMiddleware` does not intercept or validate WebSocket handshake HTTP headers. The `/api/v1/realtime/ws` endpoint validated tickets but did not inspect `websocket.headers.get("origin")`.  
- **Exploit Scenario:** If an authenticated user's short-lived WebSocket ticket was intercepted or leaked, a malicious third-party site (`https://evil.com`) could establish a WebSocket connection and receive/send real-time frames on behalf of the user.  
- **Remediation:** Enforced pre-handshake Origin validation against configured `settings.CORS_ORIGINS`. Unauthorized origins are rejected prior to `websocket.accept()` with close code `4403` (`RealtimeCloseCode.FORBIDDEN_USER`).  
- **Status:** **FIXED**

#### [SEC-02] Missing `Content-Disposition` and `nosniff` on Local Storage File Handler
- **Component:** Media Storage Serving Endpoint  
- **File:** `backend/app/api/v1/routers/media.py`  
- **Vulnerability:** When clients requested media without passing the optional `filename` query parameter, `Content-Disposition` was completely omitted, and `X-Content-Type-Options: nosniff` was not set.  
- **Exploit Scenario:** A user clicking a direct media link without the filename parameter could have documents or plain text sniffed and executed or rendered inline within the application origin.  
- **Remediation:** Enforced `X-Content-Type-Options: nosniff` and mandatory `Content-Disposition: attachment; filename="<sanitized_name>"` for all document/archive formats (`.pdf`, `.txt`, `.zip`, `.doc`, `.docx`), using the storage key basename as a safe fallback if the query parameter is absent.  
- **Status:** **FIXED**

#### [SEC-08] Public Profile Data Exposure & IDOR in User Profile Endpoint
- **Component:** User Management API & Schemas  
- **Files:** `backend/app/api/v1/routers/users.py`, `backend/app/schemas/user.py`, `backend/app/services/auth_service.py`  
- **Vulnerability:** `GET /api/v1/users/{username_or_id}` returned `CurrentUserResponse` without requiring authentication, exposing sensitive private user data including `email`, `settings`, `is_active`, `is_superuser`, and internal audit timestamps to any caller.  
- **Exploit Scenario:** Unauthenticated scrapers or rogue users could query all registered usernames and extract email addresses, notification settings, and privacy configurations across the entire user base.  
- **Remediation:**
  1. Created `PublicProfileResponse(BaseSchema)` strictly restricted to safe public cartoon profile attributes: `id`, `username`, `display_name`, `avatar_url`, `status`, `vibe_text`, `bio`, `character_base`, `joined_at`, and `avatar`. Excluded `email`, `settings`, and internal administrative flags.
  2. Implemented `AuthService.build_public_user_response(user: User)` for uniform data transformation.
  3. Added `Depends(require_active_user)` to `GET /api/v1/users/{username_or_id}` and set `response_model=PublicProfileResponse`.  
- **Status:** **FIXED**

---

### MEDIUM

#### [SEC-03] Missing Global HTTP Security Headers
- **Component:** FastAPI Application Middleware  
- **File:** `backend/app/main.py`  
- **Vulnerability:** HTTP responses lacked modern security headers protecting against clickjacking, MIME sniffing, and referer leaks.  
- **Exploit Scenario:** The application could be framed in malicious third-party iframes (clickjacking), and sensitive query parameters could leak via unconstrained referer headers.  
- **Remediation:** Implemented `SecurityHeadersMiddleware` setting:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (when served over HTTPS).  
- **Status:** **FIXED**

#### [SEC-04] Unsanitized Protocol in Dynamic Anchor File Download (DOM XSS Defense-in-Depth)
- **Component:** Frontend Message Bubble Component  
- **File:** `src/features/chats/components/MessageBubble.tsx`  
- **Vulnerability:** In `handleDownloadFile`, an anchor element was created and assigned `link.href = downloadUrl` without verifying the URL protocol.  
- **Exploit Scenario:** If a malicious or corrupted message contained a crafted payload with `mediaUrl: "javascript:alert(1)"`, triggering file download would execute arbitrary JavaScript in the user's browser session.  
- **Remediation:** Added strict protocol validation restricting download URLs to `http://`, `https://`, `/`, or `blob:`. Any other scheme is rejected.  
- **Status:** **FIXED**

#### [SEC-05] Path Traversal Prefix Vulnerability in `LocalStorageService`
- **Component:** Backend Local Storage Provider  
- **File:** `backend/app/services/storage/local.py`  
- **Vulnerability:** `_resolve_path` used `str(target_path).startswith(str(self.base_dir))` to verify directory confinement.  
- **Exploit Scenario:** Paths resolving to sibling directories sharing the base directory's name prefix (e.g. `/app/storage_other` matching `/app/storage`) would satisfy `startswith` and bypass confinement.  
- **Remediation:** Replaced string prefix check with strict path containment: `target_path == self.base_dir or self.base_dir in target_path.parents`.  
- **Status:** **FIXED**

#### [SEC-09] Database Exception Details Leaked in HTTP 500 Responses
- **Component:** Users Router & Auth Dependencies  
- **Files:** `backend/app/api/v1/routers/users.py`, `backend/app/deps.py`  
- **Vulnerability:** Handlers caught unexpected database exceptions and embedded raw `str(exc)` in client-facing HTTP 500 `HTTPException(detail=...)` messages.  
- **Exploit Scenario:** Attackers intentionally inducing database failure conditions could inspect stack traces, SQL query fragments, database drivers, and schema details in the JSON response.  
- **Remediation:** Replaced raw `str(exc)` details with generic, safe client messages:
  - `"An unexpected database error occurred while querying users."`
  - `"An unexpected database error occurred while loading user."`  
  Internal error logging is maintained on the server for diagnostics.  
- **Status:** **FIXED**

#### [SEC-10] Missing Content-Security-Policy (CSP) Header
- **Component:** FastAPI Application Middleware  
- **File:** `backend/app/main.py`  
- **Vulnerability:** Responses lacked a `Content-Security-Policy` header, missing a critical defense-in-depth boundary against Cross-Site Scripting (XSS) and unauthorized framing/content injection.  
- **Exploit Scenario:** If an injection vulnerability occurred elsewhere, the browser would not restrict unauthorized resource loading, object execution, or frame injection.  
- **Remediation:** Configured restrictive CSP in `SecurityHeadersMiddleware`:
  `default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';`  
- **Status:** **FIXED**

---

### LOW

#### [SEC-06] Username and Email Enumeration via Registration Endpoint
- **Component:** Backend Authentication Service  
- **File:** `backend/app/services/auth_service.py`  
- **Vulnerability:** `/auth/register` returns distinguishable error messages for existing usernames vs existing emails (`409 Conflict`).  
- **Exploit Scenario:** An attacker can query the registration endpoint to check whether a specific email address or username is registered.  
- **Mitigation:** Rate limited by IP (`rate_limit_auth`, max 30 requests/min). Retained friendly cartoon UX messages; documented for owner decision.  
- **Status:** **MITIGATED**

#### [SEC-07] Missing `createToken` Method in `LocalSupabaseAuthClient`
- **Component:** Frontend Local Auth Emulator  
- **File:** `src/features/auth/api/supabaseClient.ts`  
- **Vulnerability:** The `createToken` method was omitted, causing TypeScript compilation failure (`tsc -b`) in development and offline environments.  
- **Remediation:** Restored deterministic HS256-like emulator token generator in `LocalSupabaseAuthClient`.  
- **Status:** **FIXED**

#### [SEC-11] Missing String Length Constraints on Profile Status and Mood Fields
- **Component:** User Profile Schema  
- **File:** `backend/app/schemas/user.py`  
- **Vulnerability:** `UpdateProfileRequest` accepted unbounded strings for `status` and `mood`.  
- **Exploit Scenario:** An authenticated user could submit megabyte-scale strings in status/mood fields, causing unnecessary storage bloat and UI overflow issues in chat member lists.  
- **Remediation:** Enforced strict Pydantic field length bounds:
  - `status: Optional[str] = Field(None, max_length=20)`
  - `mood: Optional[str] = Field(None, max_length=30)`  
- **Status:** **FIXED**

#### [SEC-12] Permissions-Policy Microphone Directive Blocking Voice Notes
- **Component:** Security Headers Middleware  
- **File:** `backend/app/main.py`  
- **Vulnerability:** The initial security header configured `Permissions-Policy: camera=(), microphone=(), geolocation=()`, which completely disabled microphone access in the browser.  
- **Exploit Scenario:** The Phase 13.3 voice recording feature was blocked by the browser feature policy, preventing legitimate voice note capture.  
- **Remediation:** Adjusted directive to `camera=(), microphone=(self), geolocation=()`, allowing legitimate first-party voice recording while keeping third-party iframe access disabled.  
- **Status:** **FIXED**

#### [SEC-13] Missing Rate Limiting on User Search Endpoints
- **Component:** Users Router  
- **File:** `backend/app/api/v1/routers/users.py`  
- **Vulnerability:** `GET /api/v1/users` and `GET /api/v1/users/search` lacked rate limiting, allowing rapid automated scraping of the toon user directory.  
- **Exploit Scenario:** Malicious scripts could execute high-frequency queries to enumerate all registered toon nicknames and presence statuses.  
- **Remediation:** Attached `dependencies=[Depends(rate_limit_auth)]` to both `list_or_search_users` and `search_users_dedicated` endpoints.  
- **Status:** **FIXED**

---

## 3. Inventory & Verification Matrix

| Resource / Endpoint | Action | Authorized Roles | Enforced Controls | Audit Result |
|---|---|---|---|---|
| `POST /api/v1/auth/register` | User Provisioning | Public | IP Rate-limit (30/min), Unique username/email check | PASS |
| `GET /api/v1/auth/me` | Current Profile | Authenticated User | `require_active_user`, Bearer JWT verification | PASS |
| `POST /api/v1/auth/logout` | Session End | Authenticated / Public | `get_current_user_optional`, cache purge guidance | PASS |
| `POST /api/v1/auth/password/change`| Password Change | Authenticated User | `require_active_user`, rate limited | PASS |
| `DELETE /api/v1/auth/account` | Account Soft-Delete | Self Only | `require_active_user`, operates strictly on `current_user.id` | PASS |
| `GET /api/v1/users/{username_or_id}` | Public Profile View | Authenticated User | `require_active_user`, `PublicProfileResponse` sanitization | PASS (SEC-08) |
| `GET /api/v1/users` & `/users/search` | Search Users | Authenticated User | `rate_limit_auth`, safe error messages, sanitized DTO | PASS (SEC-09, SEC-13) |
| `PATCH /api/v1/users/profile` | Update Profile | Self Only | `require_active_user`, max_length checks (status: 20, mood: 30) | PASS (SEC-11) |
| `GET /api/v1/conversations/{id}/messages` | Message History | Active Members Only | `_is_active_member`, soft-delete exclusion, 404 for non-members | PASS |
| `POST /api/v1/media/upload/initiate` | Media Upload Target | Authenticated User | User quota (max 5 pending), MIME allowlist, size limits, 15m TTL | PASS |
| `POST /api/v1/media/{id}/confirm` | Confirm Upload | Uploader Only | Ownership check, magic byte verification, size bounds, ready state transition | PASS |
| `GET /api/v1/media/{id}/url` | Download Signed URL | Uploader or Conversation Member | Active membership check if attached; uploader check if unattached; 404 on denied | PASS |
| `DELETE /api/v1/media/{id}` | Media Deletion | Uploader Only | `media.uploader_id == user_id`, storage object purge | PASS |
| `PUT /api/v1/media/storage/upload/{key}` | Local Binary Upload | HMAC Bearer | Constant-time HMAC token validation with expiry | PASS |
| `GET /api/v1/media/storage/file/{key}` | Local Binary Download | HMAC Bearer | Constant-time HMAC token, forced attachment for docs, `nosniff` | PASS (SEC-02) |
| `POST /api/v1/realtime/ticket` | WS Ticket Issue | Authenticated User | `require_active_user`, rate limited, 60s single-use token | PASS |
| `WS /api/v1/realtime/ws` | Realtime Gateway | Allowed Origin + Ticket | Origin check (`settings.CORS_ORIGINS`), atomic ticket consumption, user active check | PASS (SEC-01) |
| Event `chat.send` | Message Send | Active Member | Monotonic row lock, mutual block check, media ownership & cross-conversation check | PASS |
| Event `chat.read` | Read Receipt | Active Member | Monotonic sequence check, future sequence rejection, membership check | PASS |
| Event `chat.typing` | Typing Indicator | Active Member | Throttled (1/1.5s), block check, membership check, sender excluded | PASS |
| Event `chat.delivered` | Delivery Receipt | Active Member | Membership check | PASS |

---

## 4. Summary of Applied Fixes

### Backend Code Changes:
1. **`backend/app/schemas/user.py`**:
   - Added `PublicProfileResponse(BaseSchema)` exposing only `id`, `username`, `display_name`, `avatar_url`, `status`, `vibe_text`, `bio`, `character_base`, `joined_at`, and `avatar`. Excluded all sensitive attributes (`email`, `settings`, `is_superuser`, `is_active`).
   - Added `max_length=20` on `UpdateProfileRequest.status` and `max_length=30` on `UpdateProfileRequest.mood`.
2. **`backend/app/services/auth_service.py`**:
   - Implemented `AuthService.build_public_user_response(user: User) -> PublicProfileResponse`.
3. **`backend/app/api/v1/routers/users.py`**:
   - Updated `GET /api/v1/users/{username_or_id}`: enforced `Depends(require_active_user)`, switched response model to `PublicProfileResponse`, and returned sanitized model via `AuthService.build_public_user_response`.
   - Updated `list_or_search_users`: replaced raw `str(exc)` with generic sanitized error `"An unexpected database error occurred while querying users."`.
   - Added `dependencies=[Depends(rate_limit_auth)]` to `GET /users` and `GET /users/search`.
4. **`backend/app/deps.py`**:
   - Replaced raw `str(exc)` in `get_current_user_optional` with `"An unexpected database error occurred while loading user."`.
5. **`backend/app/main.py`**:
   - In `SecurityHeadersMiddleware`:
     - Added `Content-Security-Policy: default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';`.
     - Updated `Permissions-Policy` to `camera=(), microphone=(self), geolocation=()`.
     - Preserved `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Strict-Transport-Security`.
6. **`backend/app/api/v1/routers/realtime.py`**:
   - Pre-handshake Origin validation against `settings.CORS_ORIGINS`, rejecting invalid origins with close code `4403`.
7. **`backend/app/api/v1/routers/media.py`**:
   - Set `X-Content-Type-Options: nosniff` and forced `Content-Disposition: attachment` for document formats.
8. **`backend/app/services/storage/local.py`**:
   - Hardened `_resolve_path` with strict `in target_path.parents` containment check.

### Frontend Code Changes:
1. **`src/features/chats/components/MessageBubble.tsx`**:
   - Added strict protocol validation (`http:`, `https:`, `/`, `blob:`) before triggering dynamic file downloads.
2. **`src/features/auth/api/supabaseClient.ts`**:
   - Implemented `createToken` deterministic emulator token generator.

---

## 5. Verification & Test Evidence

### Backend Regression Tests (`backend/tests/test_security_audit_remediation.py`)
- `test_public_profile_response_excludes_sensitive_fields`: **PASSED** (Verifies email and settings are omitted from schema serialization).
- `test_get_user_profile_route_requires_auth_and_uses_public_schema`: **PASSED** (Verifies route requires `require_active_user` and outputs `PublicProfileResponse`).
- `test_update_profile_request_length_validation`: **PASSED** (Verifies strings >20 chars for status or >30 chars for mood fail validation).
- `test_security_headers_and_permissions_policy`: **PASSED** (Verifies CSP and `microphone=(self)` directives in middleware).
- `test_database_error_detail_sanitized`: **PASSED** (Verifies no raw `str(exc)` is exposed in HTTP 500 error responses).
- `test_user_search_endpoints_have_rate_limiter`: **PASSED** (Verifies `rate_limit_auth` dependency is attached to user search endpoints).

### Full Test Suite Results:
- **Backend Unit & Security Tests**: **30 passed, 7 deselected** in 0.40s.
- **Frontend Test Suite (`npm test -- --run`)**: **13 test files passed, 153 tests passed (100%)**.
- **TypeScript Compilation (`npx tsc -b`)**: **0 errors** (Clean build).
- **Linter (`npm run lint`)**: **0 errors** across 207 files.
- **Production Client Build (`npm run build`)**: **Succeeded in 4.57s**.

---

## 6. Remaining Tasks & Owner Decisions Needed

1. **Email / Username Registration Error Ambiguity vs User Experience (SEC-06)**:
   - *Current State:* `/auth/register` returns distinguishable error messages (`"Username already taken"` vs `"Email already registered"`). This provides superior cartoon onboarding UX but allows enumeration of existing emails.
   - *Mitigation Active:* Protected by strict sliding-window IP rate limiting (`rate_limit_auth`, 30/min).
   - *Owner Decision:* Decide whether to retain friendly cartoon UX messages ("Oops! That toon name is taken!") or switch to a generic registration response ("If this email is not registered, an account was created...") in production.

2. **Reverse Proxy Configuration (Deployment)**:
   - In production deployment (NGINX, Caddy, or Cloudflare), ensure the reverse proxy forwards `X-Forwarded-Proto: https` so `Strict-Transport-Security` is active.
   - Ensure `trusted_hosts` and forward headers are configured on Uvicorn so `request.client.host` cannot be spoofed to circumvent rate limiters.

3. **Session Revocation / Invalidation Storage**:
   - Access tokens are short-lived JWTs, and client-side purge occurs on logout. If instantaneous global server-side invalidation is required across all devices prior to token expiration, a Redis-backed token revocation blocklist should be introduced.
