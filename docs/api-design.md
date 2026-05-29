# Resource Manager — API Design Document

> **Version:** 1.0.0
> **Last Updated:** 2026-05-29
> **Stack:** Node.js / Express · MariaDB · JWT Authentication
> **Base URL:** `/api`

---

## Table of Contents

1. [Conventions & Standards](#1-conventions--standards)
   - [Base URL & Versioning](#11-base-url--versioning)
   - [Authentication Flow](#12-authentication-flow)
   - [Standard Request Headers](#13-standard-request-headers)
   - [Standard Error Response Format](#14-standard-error-response-format)
   - [Standard Pagination Format](#15-standard-pagination-format)
   - [Rate Limiting](#16-rate-limiting)
   - [CORS Configuration](#17-cors-configuration)
   - [File Upload Handling](#18-file-upload-handling)
   - [Soft Deletes](#19-soft-deletes)
   - [Timestamp Format](#110-timestamp-format)
2. [Authentication Endpoints](#2-authentication-endpoints)
3. [Users Endpoints](#3-users-endpoints)
4. [Borrower Entities Endpoints](#4-borrower-entities-endpoints)
5. [Inventory Items Endpoints](#5-inventory-items-endpoints)
6. [Packages Endpoints](#6-packages-endpoints)
7. [Reservations Endpoints](#7-reservations-endpoints)
8. [App Configuration Endpoints](#8-app-configuration-endpoints)
9. [Dashboard Endpoints](#9-dashboard-endpoints)
10. [Audit Log Endpoints](#10-audit-log-endpoints)

---

## 1. Conventions & Standards

### 1.1 Base URL & Versioning

| Item | Value |
|------|-------|
| Base URL | `/api` |
| Content-Type | `application/json` (unless uploading files) |
| Character Encoding | UTF-8 |

All endpoints are prefixed with `/api`. No explicit version prefix is used in v1; future breaking changes will introduce `/api/v2`.

---

### 1.2 Authentication Flow

The API uses a **JWT access token + refresh token** strategy.

```
┌─────────┐         ┌──────────┐         ┌──────────┐
│  Client  │──login──▶  Server  │──issue──▶ Access   │  (short-lived, 15 min)
│          │         │          │         │ Token    │
│          │         │          │──issue──▶ Refresh  │  (long-lived, 12 days)
│          │         │          │         │ Token    │
└─────────┘         └──────────┘         └──────────┘
```

#### Token Details

| Token | Location | Lifetime | Storage Recommendation |
|-------|----------|----------|----------------------|
| Access Token | `Authorization: Bearer <token>` header | 15 minutes | Memory only (never localStorage) |
| Refresh Token | HTTP-only secure cookie **or** request body | 12 days | HTTP-only cookie (preferred) or secure storage |

#### Access Token Payload (JWT Claims)

```json
{
  "sub": "uuid-of-user",
  "username": "user",
  "role": "admin",
  "display_name": "John Doe",
  "iat": 1717000000,
  "exp": 1717000900
}
```

#### Refresh Token

- Stored in the `refresh_tokens` database table.
- Each token is a cryptographically random opaque string (not a JWT).
- On refresh, the old refresh token is revoked and a **new pair** (access + refresh) is issued (token rotation).
- On logout, the refresh token is revoked in the database.
- A user may have multiple active refresh tokens (multi-device support).

#### Auth Flow Sequence

```
1. Client POST /api/auth/login  { username, password }
2. Server validates credentials
3. Server returns { access_token, refresh_token, user }
4. Client stores tokens appropriately
5. Client includes access token in all subsequent requests
6. When access token expires (401), client calls POST /api/auth/refresh
7. Server validates refresh token, issues new pair
8. On logout, client calls POST /api/auth/logout to revoke refresh token
```

---

### 1.3 Standard Request Headers

All authenticated requests MUST include:

| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <access_token>` | Yes (except login/refresh) |
| `Content-Type` | `application/json` | Yes (for request bodies) |
| `Accept` | `application/json` | Recommended |

---

### 1.4 Standard Error Response Format

All errors follow a consistent structure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error summary.",
    "details": [
      {
        "field": "username",
        "message": "username is required.",
        "code": "REQUIRED"
      }
    ]
  }
}
```

#### Error Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Always `false` for errors |
| `error.code` | `string` | Machine-readable error code (see table below) |
| `error.message` | `string` | Human-readable summary |
| `error.details` | `array\|null` | Optional array of field-level errors (validation only) |
| `error.details[].field` | `string` | The field that failed validation |
| `error.details[].message` | `string` | Human-readable field error |
| `error.details[].code` | `string` | Machine-readable field error code |

#### Standard Error Codes

| HTTP Status | Error Code | Description |
|-------------|-----------|-------------|
| 400 | `VALIDATION_ERROR` | Request body or query params failed validation |
| 400 | `BAD_REQUEST` | General malformed request |
| 401 | `UNAUTHORIZED` | Missing or invalid access token |
| 401 | `TOKEN_EXPIRED` | Access token has expired |
| 401 | `INVALID_CREDENTIALS` | Wrong username or password |
| 401 | `INVALID_REFRESH_TOKEN` | Refresh token is invalid or revoked |
| 403 | `FORBIDDEN` | User lacks permission for this action |
| 404 | `NOT_FOUND` | Requested resource does not exist |
| 409 | `CONFLICT` | Resource conflict (e.g. duplicate username, active reservations prevent delete) |
| 413 | `FILE_TOO_LARGE` | Uploaded file exceeds size limit |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Uploaded file type not allowed |
| 422 | `UNPROCESSABLE_ENTITY` | Semantically invalid request (e.g. return date before pickup date) |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

### 1.5 Standard Pagination Format

All list endpoints support pagination and return a consistent envelope:

#### Request Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | `integer` | `1` | Page number (1-indexed) |
| `per_page` | `integer` | `20` | Items per page (max: 100) |
| `sort_by` | `string` | varies | Field to sort by |
| `sort_order` | `string` | `asc` | Sort direction: `asc` or `desc` |

#### Response Envelope

```json
{
  "success": true,
  "data": [ /* array of items */ ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_items": 87,
    "total_pages": 5,
    "has_next_page": true,
    "has_prev_page": false
  }
}
```

#### Single-Resource Response Envelope

```json
{
  "success": true,
  "data": { /* single object */ }
}
```

#### Mutation Response Envelope

```json
{
  "success": true,
  "data": { /* created/updated object */ },
  "message": "Resource created successfully."
}
```

---

### 1.6 Rate Limiting

| Scope | Limit | Window |
|-------|-------|--------|
| General (authenticated) | 100 requests | 1 minute |
| Login endpoint | 5 attempts | 1 minute (per IP) |
| Refresh endpoint | 10 attempts | 1 minute (per IP) |
| File upload | 10 uploads | 5 minutes |

Rate limit headers are included in every response:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests in window |
| `X-RateLimit-Remaining` | Remaining requests in current window |
| `X-RateLimit-Reset` | Unix timestamp when window resets |

When exceeded, the API returns:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": null
  }
}
```

**HTTP Status:** `429 Too Many Requests`
**Header:** `Retry-After: <seconds>`

---

### 1.7 CORS Configuration

| Setting | Value |
|---------|-------|
| Allowed Origins | Configured via `CORS_ORIGINS` env variable (comma-separated) |
| Allowed Methods | `GET, POST, PUT, DELETE, OPTIONS` |
| Allowed Headers | `Content-Type, Authorization, Accept` |
| Exposed Headers | `X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset` |
| Credentials | `true` (for cookie-based refresh tokens) |
| Max Age | `86400` (24 hours) |

---

### 1.8 File Upload Handling

File uploads use `multipart/form-data` instead of JSON.

| Setting | Value |
|---------|-------|
| Max File Size | 5 MB |
| Allowed MIME Types | `image/jpeg`, `image/png`, `image/webp` |
| Storage | Local filesystem (`/uploads/inventory/`) |
| Filename | `{uuid}.{ext}` (original filename is discarded) |
| Serving URL | `/uploads/inventory/{filename}` (served statically) |
| Image Processing | Resized to max 800×800px, converted to WebP for storage |

---

### 1.9 Soft Deletes

Resources that support soft deletion (users, borrower entities) are never physically removed from the database. Instead:

- A `deleted_at` timestamp column is set to the current time.
- Soft-deleted records are **excluded** from all list queries by default.
- Soft-deleted records return `404` when accessed directly.
- Admin can pass `?include_deleted=true` on list endpoints to include soft-deleted records.

---

### 1.10 Timestamp Format

All timestamps use **ISO 8601** format in UTC:

```
2026-05-29T00:00:00.000Z
```

---

## 2. Authentication Endpoints

### 2.1 POST /api/auth/login

**Description:** Authenticate a user with username and password. Returns JWT access token and refresh token.

**Authentication:** None required.

**Rate Limit:** 5 attempts per minute per IP.

#### Request

**Headers:**

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |

**Body:**

```json
{
  "username": "admin",
  "password": "SecureP@ss123"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `username` | `string` | Yes | Valid username format, max 255 chars | User username |
| `password` | `string` | Yes | Min 8 chars | User password |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "a1b2c3d4e5f6...opaque-token",
    "token_type": "Bearer",
    "expires_in": 900,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "admin@example.com",
      "display_name": "Admin User",
      "role": "admin",
      "created_at": "2026-01-15T10:30:00.000Z"
    }
  },
  "message": "Login successful."
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or invalid username/password format |
| 401 | `INVALID_CREDENTIALS` | Username not found or password incorrect |
| 403 | `FORBIDDEN` | User account is deactivated |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many login attempts |

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid username or password.",
    "details": null
  }
}
```

#### Business Rules

1. Passwords are compared using `bcrypt` with a cost factor of 12.
2. The error message must NOT reveal whether the username or password was incorrect (always "Invalid username or password").
3. Deactivated (soft-deleted) users cannot log in — return `403 FORBIDDEN` with message "Account is deactivated. Contact an administrator."
4. A new refresh token record is created in the database on every successful login.
5. The `last_login_at` timestamp on the user record is updated.

---

### 2.2 POST /api/auth/refresh

**Description:** Exchange a valid refresh token for a new access token and refresh token pair (token rotation).

**Authentication:** None required (the refresh token itself authenticates the request).

#### Request

**Headers:**

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |

**Body:**

```json
{
  "refresh_token": "a1b2c3d4e5f6...opaque-token"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `refresh_token` | `string` | Yes | The refresh token issued at login or last refresh |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "x9y8z7w6v5u4...new-opaque-token",
    "token_type": "Bearer",
    "expires_in": 900
  },
  "message": "Token refreshed successfully."
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing refresh token |
| 401 | `INVALID_REFRESH_TOKEN` | Token not found, expired, or already revoked |
| 403 | `FORBIDDEN` | User account has been deactivated since token was issued |

#### Business Rules

1. **Token rotation:** On successful refresh, the old refresh token is revoked and a brand-new refresh token is issued alongside the new access token.
2. **Replay detection:** If a previously revoked refresh token is reused, ALL refresh tokens for that user are revoked immediately (potential token theft detected). The response is `401 INVALID_REFRESH_TOKEN`.
3. Refresh tokens expire after 7 days from their creation.
4. If the user has been soft-deleted since the token was issued, return `403`.

---

### 2.3 POST /api/auth/logout

**Description:** Revoke the specified refresh token, ending the session for that device.

**Authentication:** `Bearer` token required.

#### Request

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |
| `Content-Type` | `application/json` |

**Body:**

```json
{
  "refresh_token": "a1b2c3d4e5f6...opaque-token"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `refresh_token` | `string` | Yes | The refresh token to revoke |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": null,
  "message": "Logged out successfully."
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing refresh token |
| 401 | `UNAUTHORIZED` | Invalid or missing access token |

#### Business Rules

1. The refresh token is marked as revoked in the database (`revoked_at` is set).
2. If the refresh token does not exist or is already revoked, still return `200` (idempotent).
3. The access token remains valid until its natural expiration (no server-side access token revocation in v1).

---

### 2.4 GET /api/auth/me

**Description:** Get the profile of the currently authenticated user.

**Authentication:** `Bearer` token required.
**Authorization:** Any authenticated user.

#### Request

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |

**Body:** None.

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "admin@example.com",
    "display_name": "Admin User",
    "role": "admin",
    "borrower_entities": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Engineering Department"
      }
    ],
    "created_at": "2026-01-15T10:30:00.000Z",
    "updated_at": "2026-03-20T14:00:00.000Z",
    "last_login_at": "2026-05-29T00:00:00.000Z"
  }
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Missing or invalid access token |
| 401 | `TOKEN_EXPIRED` | Access token expired |

---

### 2.5 PUT /api/auth/me

**Description:** Update the current user's own profile (display name and/or password).

**Authentication:** `Bearer` token required.
**Authorization:** Any authenticated user.

#### Request

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |
| `Content-Type` | `application/json` |

**Body:**

```json
{
  "display_name": "John Updated",
  "current_password": "OldP@ss123",
  "new_password": "NewSecureP@ss456"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `display_name` | `string` | No | 1–100 chars | New display name |
| `current_password` | `string` | Conditional | — | Required if `new_password` is provided |
| `new_password` | `string` | No | Min 8 chars, must contain: uppercase, lowercase, digit | New password |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "admin@example.com",
    "display_name": "John Updated",
    "role": "admin",
    "created_at": "2026-01-15T10:30:00.000Z",
    "updated_at": "2026-05-29T00:15:00.000Z"
  },
  "message": "Profile updated successfully."
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid field values or constraints violated |
| 401 | `UNAUTHORIZED` | Missing or invalid access token |
| 401 | `INVALID_CREDENTIALS` | `current_password` is incorrect |
| 422 | `UNPROCESSABLE_ENTITY` | `new_password` provided without `current_password` |

#### Business Rules

1. Users cannot change their own username or role — those require admin access.
2. `current_password` must match the existing password hash before the new password is applied.
3. `new_password` is hashed with `bcrypt` (cost factor 12) before storage.
4. If only `display_name` is provided (no password change), `current_password` is not required.
5. An audit log entry is created for the profile update.

---

## 3. Users Endpoints

> All endpoints in this section require `role: admin`.

### 3.1 GET /api/users

**Description:** List all users with pagination, search, and filtering.

**Authentication:** `Bearer` token required.
**Authorization:** Admin only.

#### Request

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | `integer` | `1` | Page number |
| `per_page` | `integer` | `20` | Items per page (max 100) |
| `search` | `string` | — | Search across `username` and `display_name` (case-insensitive, partial match) |
| `role` | `string` | — | Filter by role: `admin` or `user` |
| `sort_by` | `string` | `created_at` | Sort field: `username`, `display_name`, `role`, `created_at`, `last_login_at` |
| `sort_order` | `string` | `desc` | `asc` or `desc` |
| `include_deleted` | `boolean` | `false` | Include soft-deleted users |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "admin@example.com",
      "display_name": "Admin User",
      "role": "admin",
      "borrower_entities": [
        {
          "id": "660e8400-e29b-41d4-a716-446655440001",
          "name": "Engineering Department"
        }
      ],
      "created_at": "2026-01-15T10:30:00.000Z",
      "updated_at": "2026-03-20T14:00:00.000Z",
      "last_login_at": "2026-05-28T22:00:00.000Z",
      "deleted_at": null
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_items": 42,
    "total_pages": 3,
    "has_next_page": true,
    "has_prev_page": false
  }
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | User is not an admin |

---

### 3.2 GET /api/users/:id

**Description:** Get full details for a specific user.

**Authentication:** `Bearer` token required.
**Authorization:** Admin only.

#### Request

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uuid` | User ID |

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "user@example.com",
    "display_name": "Regular User",
    "role": "user",
    "borrower_entities": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Engineering Department"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440002",
        "name": "Marketing Team"
      }
    ],
    "created_at": "2026-02-10T08:00:00.000Z",
    "updated_at": "2026-04-01T12:00:00.000Z",
    "last_login_at": "2026-05-28T18:00:00.000Z",
    "deleted_at": null
  }
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | User is not an admin |
| 404 | `NOT_FOUND` | User ID does not exist (or is soft-deleted and `include_deleted` not used) |

---

### 3.3 POST /api/users

**Description:** Create a new user account.

**Authentication:** `Bearer` token required.
**Authorization:** Admin only.

#### Request

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |
| `Content-Type` | `application/json` |

**Body:**

```json
{
  "username": "newuser@example.com",
  "password": "SecureP@ss123",
  "display_name": "New User",
  "role": "user"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `username` | `string` | Yes | Valid username format, max 255 chars, must be unique | User username |
| `password` | `string` | Yes | Min 8 chars, must contain: uppercase, lowercase, digit | Initial password |
| `display_name` | `string` | Yes | 1–100 chars | Display name |
| `role` | `string` | Yes | `admin` or `user` | User role |

#### Success Response

**Status:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440003",
    "username": "newuser@example.com",
    "display_name": "New User",
    "role": "user",
    "borrower_entities": [],
    "created_at": "2026-05-29T00:10:00.000Z",
    "updated_at": "2026-05-29T00:10:00.000Z",
    "last_login_at": null,
    "deleted_at": null
  },
  "message": "User created successfully."
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing required fields or invalid values |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | User is not an admin |
| 409 | `CONFLICT` | username already exists |

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "A user with this username already exists.",
    "details": [
      {
        "field": "username",
        "message": "username is already in use.",
        "code": "DUPLICATE"
      }
    ]
  }
}
```

#### Business Rules

1. username must be unique across all active users (soft-deleted users' usernames may be reused).
2. Password is hashed with `bcrypt` (cost 12) before storage.
3. An audit log entry is created with action `USER_CREATED`.
4. The password is never returned in any response.

---

### 3.4 PUT /api/users/:id

**Description:** Update a user's details (username, display name, role, and/or password).

**Authentication:** `Bearer` token required.
**Authorization:** Admin only.

#### Request

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uuid` | User ID |

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |
| `Content-Type` | `application/json` |

**Body (all fields optional — only provided fields are updated):**

```json
{
  "username": "updated@example.com",
  "display_name": "Updated Name",
  "role": "admin",
  "password": "NewP@ssword456"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `username` | `string` | No | Valid username, max 255 chars, unique | New username |
| `display_name` | `string` | No | 1–100 chars | New display name |
| `role` | `string` | No | `admin` or `user` | New role |
| `password` | `string` | No | Min 8 chars, uppercase, lowercase, digit | New password (admin reset) |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "updated@example.com",
    "display_name": "Updated Name",
    "role": "admin",
    "borrower_entities": [],
    "created_at": "2026-01-15T10:30:00.000Z",
    "updated_at": "2026-05-29T00:20:00.000Z",
    "last_login_at": "2026-05-28T22:00:00.000Z",
    "deleted_at": null
  },
  "message": "User updated successfully."
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid field values |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | User is not an admin |
| 404 | `NOT_FOUND` | User ID does not exist |
| 409 | `CONFLICT` | username already in use by another user |

#### Business Rules

1. Admin cannot demote themselves (the last admin) — at least one admin must always exist.
2. If `password` is provided, it is hashed before storage. No `current_password` check is needed (admin privilege).
3. If `username` is changed, uniqueness is validated against active (non-deleted) users.
4. An audit log entry is created with action `USER_UPDATED` including changed fields (not password values).

---

### 3.5 DELETE /api/users/:id

**Description:** Soft-delete (deactivate) a user. The user's record is preserved but they can no longer log in.

**Authentication:** `Bearer` token required.
**Authorization:** Admin only.

#### Request

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uuid` | User ID |

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |

**Body:** None.

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": null,
  "message": "User deactivated successfully."
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Not an admin, or attempting to delete self |
| 404 | `NOT_FOUND` | User ID does not exist or already deleted |
| 409 | `CONFLICT` | User is the last remaining admin |

#### Business Rules

1. Admin cannot delete themselves.
2. Cannot delete the last remaining admin account.
3. Sets `deleted_at` to the current timestamp.
4. All active refresh tokens for this user are revoked immediately.
5. The user's existing reservations remain unchanged (historical data).
6. An audit log entry is created with action `USER_DEACTIVATED`.

---

### 3.6 POST /api/users/:id/assign-entity

**Description:** Assign a user to a borrower entity. This creates a many-to-many relationship allowing the user to make reservations on behalf of that entity.

**Authentication:** `Bearer` token required.
**Authorization:** Admin only.

#### Request

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uuid` | User ID |

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |
| `Content-Type` | `application/json` |

**Body:**

```json
{
  "borrower_entity_id": "660e8400-e29b-41d4-a716-446655440001"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `borrower_entity_id` | `uuid` | Yes | ID of the borrower entity to assign |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "user@example.com",
    "display_name": "Regular User",
    "role": "user",
    "borrower_entities": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Engineering Department"
      }
    ]
  },
  "message": "User assigned to borrower entity successfully."
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing `borrower_entity_id` |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Not an admin |
| 404 | `NOT_FOUND` | User or borrower entity not found |
| 409 | `CONFLICT` | User is already assigned to this entity |

#### Business Rules

1. A user can be assigned to multiple borrower entities.
2. The assignment is idempotent — if already assigned, return `409 CONFLICT`.
3. An audit log entry is created with action `USER_ENTITY_ASSIGNED`.

---

### 3.7 DELETE /api/users/:id/assign-entity

**Description:** Remove a user's assignment from a borrower entity.

**Authentication:** `Bearer` token required.
**Authorization:** Admin only.

#### Request

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uuid` | User ID |

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |
| `Content-Type` | `application/json` |

**Body:**

```json
{
  "borrower_entity_id": "660e8400-e29b-41d4-a716-446655440001"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `borrower_entity_id` | `uuid` | Yes | ID of the borrower entity to unassign |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "user@example.com",
    "display_name": "Regular User",
    "role": "user",
    "borrower_entities": []
  },
  "message": "User unassigned from borrower entity successfully."
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing `borrower_entity_id` |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Not an admin |
| 404 | `NOT_FOUND` | User, borrower entity, or assignment not found |

#### Business Rules

1. If the assignment does not exist, return `404 NOT_FOUND`.
2. Removing assignment does not affect existing reservations made by this user for that entity.
3. An audit log entry is created with action `USER_ENTITY_UNASSIGNED`.

---

## 4. Borrower Entities Endpoints

### 4.1 GET /api/borrower-entities

**Description:** List borrower entities. Admins see all entities; regular users see only their assigned entities.

**Authentication:** `Bearer` token required.
**Authorization:** Any authenticated user (scoped results).

#### Request

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | `integer` | `1` | Page number |
| `per_page` | `integer` | `20` | Items per page (max 100) |
| `search` | `string` | — | Search by entity name (case-insensitive, partial match) |
| `sort_by` | `string` | `name` | Sort field: `name`, `created_at` |
| `sort_order` | `string` | `asc` | `asc` or `desc` |
| `include_deleted` | `boolean` | `false` | Include soft-deleted entities (admin only) |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Engineering Department",
      "description": "All engineering resources and teams",
      "assigned_users_count": 5,
      "active_reservations_count": 3,
      "created_at": "2026-01-10T09:00:00.000Z",
      "updated_at": "2026-03-15T11:00:00.000Z",
      "deleted_at": null
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_items": 8,
    "total_pages": 1,
    "has_next_page": false,
    "has_prev_page": false
  }
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Missing or invalid token |

#### Business Rules

1. **Admin users:** See all borrower entities, plus aggregate counts.
2. **Regular users:** See only entities they are assigned to via the `user_borrower_entities` junction table.
3. `include_deleted` is silently ignored for non-admin users.

---

### 4.2 GET /api/borrower-entities/:id

**Description:** Get details for a specific borrower entity, including assigned users.

**Authentication:** `Bearer` token required.
**Authorization:** Admin, or user assigned to this entity.

#### Request

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uuid` | Borrower entity ID |

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Engineering Department",
    "description": "All engineering resources and teams",
    "assigned_users": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "username": "user1@example.com",
        "display_name": "User One",
        "role": "user"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440005",
        "username": "user2@example.com",
        "display_name": "User Two",
        "role": "user"
      }
    ],
    "active_reservations_count": 3,
    "created_at": "2026-01-10T09:00:00.000Z",
    "updated_at": "2026-03-15T11:00:00.000Z",
    "deleted_at": null
  }
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | User is not admin and not assigned to this entity |
| 404 | `NOT_FOUND` | Entity not found |

---

### 4.3 POST /api/borrower-entities

**Description:** Create a new borrower entity.

**Authentication:** `Bearer` token required.
**Authorization:** Admin only.

#### Request

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |
| `Content-Type` | `application/json` |

**Body:**

```json
{
  "name": "Marketing Team",
  "description": "Handles all marketing campaigns and events"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `name` | `string` | Yes | 1–150 chars, must be unique | Entity name |
| `description` | `string` | No | Max 500 chars | Optional description |

#### Success Response

**Status:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440010",
    "name": "Marketing Team",
    "description": "Handles all marketing campaigns and events",
    "assigned_users": [],
    "active_reservations_count": 0,
    "created_at": "2026-05-29T00:30:00.000Z",
    "updated_at": "2026-05-29T00:30:00.000Z",
    "deleted_at": null
  },
  "message": "Borrower entity created successfully."
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing name or invalid constraints |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Not an admin |
| 409 | `CONFLICT` | Entity name already exists |

#### Business Rules

1. Entity name must be unique (case-insensitive) across active entities.
2. An audit log entry is created with action `ENTITY_CREATED`.

---

### 4.4 PUT /api/borrower-entities/:id

**Description:** Update a borrower entity's name and/or description.

**Authentication:** `Bearer` token required.
**Authorization:** Admin only.

#### Request

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uuid` | Borrower entity ID |

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |
| `Content-Type` | `application/json` |

**Body (all fields optional):**

```json
{
  "name": "Updated Marketing Team",
  "description": "Updated description"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `name` | `string` | No | 1–150 chars, unique | New entity name |
| `description` | `string` | No | Max 500 chars | New description |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440010",
    "name": "Updated Marketing Team",
    "description": "Updated description",
    "assigned_users": [],
    "active_reservations_count": 0,
    "created_at": "2026-05-29T00:30:00.000Z",
    "updated_at": "2026-05-29T00:45:00.000Z",
    "deleted_at": null
  },
  "message": "Borrower entity updated successfully."
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid field values |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Not an admin |
| 404 | `NOT_FOUND` | Entity not found |
| 409 | `CONFLICT` | Name already in use by another entity |

#### Business Rules

1. Name uniqueness is validated case-insensitively.
2. An audit log entry is created with action `ENTITY_UPDATED`.

---

### 4.5 DELETE /api/borrower-entities/:id

**Description:** Soft-delete a borrower entity.

**Authentication:** `Bearer` token required.
**Authorization:** Admin only.

#### Request

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uuid` | Borrower entity ID |

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |

**Body:** None.

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": null,
  "message": "Borrower entity deactivated successfully."
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Not an admin |
| 404 | `NOT_FOUND` | Entity not found or already deleted |
| 409 | `CONFLICT` | Entity has active (non-returned, non-cancelled) reservations |

#### Business Rules

1. Cannot delete an entity that has active reservations (status `reserved` or `checked_out`).
2. Sets `deleted_at` to the current timestamp.
3. User assignments to this entity are preserved (historical data) but effectively become inactive.
4. An audit log entry is created with action `ENTITY_DEACTIVATED`.

---

## 5. Inventory Items Endpoints

### 5.1 GET /api/inventory

**Description:** List all inventory items with pagination, search, filtering, and sorting.

**Authentication:** `Bearer` token required.
**Authorization:** Any authenticated user.

#### Request

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | `integer` | `1` | Page number |
| `per_page` | `integer` | `20` | Items per page (max 100) |
| `search` | `string` | — | Search across `name` and `description` (case-insensitive, partial match) |
| `status` | `string` | — | Filter by availability: `available`, `low_stock`, `out_of_stock` |
| `category` | `string` | — | Filter by category name (exact match) |
| `sort_by` | `string` | `name` | Sort field: `name`, `quantity_total`, `quantity_available`, `created_at` |
| `sort_order` | `string` | `asc` | `asc` or `desc` |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440001",
      "name": "Projector - Epson EB-X51",
      "description": "Portable projector, 3800 lumens, XGA resolution",
      "category": "Electronics",
      "quantity_total": 10,
      "quantity_available": 7,
      "quantity_reserved": 3,
      "image_url": "/uploads/inventory/abc123.webp",
      "created_at": "2026-02-01T08:00:00.000Z",
      "updated_at": "2026-04-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_items": 156,
    "total_pages": 8,
    "has_next_page": true,
    "has_prev_page": false
  }
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Missing or invalid token |

#### Business Rules

1. `quantity_available` is a computed value: `quantity_total - quantity_reserved` (based on active reservation items).
2. `status` filter is computed:
   - `available`: `quantity_available > 0`
   - `low_stock`: `0 < quantity_available <= low_stock_threshold` (configurable via app config, default: 20% of total)
   - `out_of_stock`: `quantity_available == 0`

---

### 5.2 GET /api/inventory/:id

**Description:** Get full details for a specific inventory item, including current availability.

**Authentication:** `Bearer` token required.
**Authorization:** Any authenticated user.

#### Request

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uuid` | Inventory item ID |

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440001",
    "name": "Projector - Epson EB-X51",
    "description": "Portable projector, 3800 lumens, XGA resolution",
    "category": "Electronics",
    "quantity_total": 10,
    "quantity_available": 7,
    "quantity_reserved": 3,
    "image_url": "/uploads/inventory/abc123.webp",
    "notes": "Handle with care. Include carrying case when lending.",
    "packages": [
      {
        "id": "990e8400-e29b-41d4-a716-446655440001",
        "name": "Conference Room Kit",
        "quantity_in_package": 1
      }
    ],
    "created_at": "2026-02-01T08:00:00.000Z",
    "updated_at": "2026-04-15T10:00:00.000Z"
  }
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 404 | `NOT_FOUND` | Item not found |

---

### 5.3 POST /api/inventory

**Description:** Create a new inventory item.

**Authentication:** `Bearer` token required.
**Authorization:** Admin only.

#### Request

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |
| `Content-Type` | `application/json` |

**Body:**

```json
{
  "name": "Whiteboard Marker Set",
  "description": "Set of 4 dry-erase markers (red, blue, green, black)",
  "category": "Office Supplies",
  "quantity_total": 50,
  "notes": "Check marker condition before lending. Replace dried markers."
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `name` | `string` | Yes | 1–200 chars, must be unique | Item name |
| `description` | `string` | No | Max 1000 chars | Detailed description |
| `category` | `string` | No | Max 100 chars | Category label |
| `quantity_total` | `integer` | Yes | Min 1 | Total quantity owned |
| `notes` | `string` | No | Max 2000 chars | Internal admin notes |

#### Success Response

**Status:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440050",
    "name": "Whiteboard Marker Set",
    "description": "Set of 4 dry-erase markers (red, blue, green, black)",
    "category": "Office Supplies",
    "quantity_total": 50,
    "quantity_available": 50,
    "quantity_reserved": 0,
    "image_url": null,
    "notes": "Check marker condition before lending. Replace dried markers.",
    "packages": [],
    "created_at": "2026-05-29T01:00:00.000Z",
    "updated_at": "2026-05-29T01:00:00.000Z"
  },
  "message": "Inventory item created successfully."
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing required fields or invalid values |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Not an admin |
| 409 | `CONFLICT` | Item name already exists |

#### Business Rules

1. Item name must be unique (case-insensitive).
2. `quantity_total` must be at least 1.
3. On creation, `quantity_available` equals `quantity_total`.
4. An audit log entry is created with action `ITEM_CREATED`.

---

### 5.4 PUT /api/inventory/:id

**Description:** Update an inventory item's details.

**Authentication:** `Bearer` token required.
**Authorization:** Admin only.

#### Request

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uuid` | Inventory item ID |

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |
| `Content-Type` | `application/json` |

**Body (all fields optional):**

```json
{
  "name": "Whiteboard Marker Set (Large)",
  "description": "Updated description",
  "category": "Office Supplies",
  "quantity_total": 60,
  "notes": "Updated notes"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `name` | `string` | No | 1–200 chars, unique | Updated name |
| `description` | `string` | No | Max 1000 chars | Updated description |
| `category` | `string` | No | Max 100 chars | Updated category |
| `quantity_total` | `integer` | No | Min 1, see business rules | Updated total quantity |
| `notes` | `string` | No | Max 2000 chars | Updated notes |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440050",
    "name": "Whiteboard Marker Set (Large)",
    "description": "Updated description",
    "category": "Office Supplies",
    "quantity_total": 60,
    "quantity_available": 57,
    "quantity_reserved": 3,
    "image_url": null,
    "notes": "Updated notes",
    "packages": [],
    "created_at": "2026-05-29T01:00:00.000Z",
    "updated_at": "2026-05-29T01:15:00.000Z"
  },
  "message": "Inventory item updated successfully."
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid field values |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Not an admin |
| 404 | `NOT_FOUND` | Item not found |
| 409 | `CONFLICT` | Name already in use by another item |
| 422 | `UNPROCESSABLE_ENTITY` | New `quantity_total` would be less than currently reserved quantity |

#### Business Rules

1. `quantity_total` cannot be reduced below the currently reserved quantity. For example, if 8 units are reserved, `quantity_total` cannot be set below 8.
2. Changing `quantity_total` automatically adjusts `quantity_available` = `quantity_total - quantity_reserved`.
3. An audit log entry is created with action `ITEM_UPDATED` including old and new values of changed fields.

---

### 5.5 DELETE /api/inventory/:id

**Description:** Permanently delete an inventory item.

**Authentication:** `Bearer` token required.
**Authorization:** Admin only.

#### Request

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uuid` | Inventory item ID |

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |

**Body:** None.

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": null,
  "message": "Inventory item deleted successfully."
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Not an admin |
| 404 | `NOT_FOUND` | Item not found |
| 409 | `CONFLICT` | Item has active reservations or is part of a package |

#### Business Rules

1. Cannot delete an item that has active reservations (status `reserved` or `checked_out`).
2. Cannot delete an item that is included in any package. The item must first be removed from all packages.
3. The item's image file (if any) is deleted from the filesystem.
4. This is a **hard delete** — the item and all associated historical reservation line items are permanently removed.
5. An audit log entry is created with action `ITEM_DELETED`.

---

### 5.6 POST /api/inventory/:id/upload-image

**Description:** Upload or replace the image for an inventory item.

**Authentication:** `Bearer` token required.
**Authorization:** Admin only.

#### Request

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uuid` | Inventory item ID |

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |
| `Content-Type` | `multipart/form-data` |

**Body (multipart/form-data):**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `image` | `file` | Yes | Max 5 MB; MIME: `image/jpeg`, `image/png`, `image/webp` | The image file |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440001",
    "name": "Projector - Epson EB-X51",
    "image_url": "/uploads/inventory/d4e5f6a7.webp"
  },
  "message": "Image uploaded successfully."
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | No file provided in `image` field |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Not an admin |
| 404 | `NOT_FOUND` | Item not found |
| 413 | `FILE_TOO_LARGE` | File exceeds 5 MB |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | File type not allowed |

#### Business Rules

1. If the item already has an image, the old file is deleted from the filesystem before the new one is saved.
2. The image is resized to a maximum of 800×800 pixels (maintaining aspect ratio) and converted to WebP format.
3. The filename is a UUID to prevent enumeration and naming conflicts.
4. An audit log entry is created with action `ITEM_IMAGE_UPLOADED`.

---

## 6. Packages Endpoints

### 6.1 GET /api/packages

**Description:** List all packages with their included items and quantities.

**Authentication:** `Bearer` token required.
**Authorization:** Any authenticated user.

#### Request

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | `integer` | `1` | Page number |
| `per_page` | `integer` | `20` | Items per page (max 100) |
| `search` | `string` | — | Search by package name (case-insensitive, partial match) |
| `sort_by` | `string` | `name` | Sort field: `name`, `created_at` |
| `sort_order` | `string` | `asc` | `asc` or `desc` |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440001",
      "name": "Conference Room Kit",
      "description": "Everything needed to set up a conference room presentation",
      "items": [
        {
          "inventory_item_id": "880e8400-e29b-41d4-a716-446655440001",
          "name": "Projector - Epson EB-X51",
          "quantity": 1,
          "image_url": "/uploads/inventory/abc123.webp"
        },
        {
          "inventory_item_id": "880e8400-e29b-41d4-a716-446655440002",
          "name": "HDMI Cable (3m)",
          "quantity": 2,
          "image_url": null
        },
        {
          "inventory_item_id": "880e8400-e29b-41d4-a716-446655440003",
          "name": "Portable Speaker",
          "quantity": 1,
          "image_url": "/uploads/inventory/def456.webp"
        }
      ],
      "total_item_count": 4,
      "created_at": "2026-03-01T09:00:00.000Z",
      "updated_at": "2026-04-10T11:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_items": 12,
    "total_pages": 1,
    "has_next_page": false,
    "has_prev_page": false
  }
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Missing or invalid token |

#### Business Rules

1. `total_item_count` is the sum of all item quantities in the package.

---

### 6.2 GET /api/packages/:id

**Description:** Get full details of a specific package including all items with their availability.

**Authentication:** `Bearer` token required.
**Authorization:** Any authenticated user.

#### Request

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uuid` | Package ID |

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440001",
    "name": "Conference Room Kit",
    "description": "Everything needed to set up a conference room presentation",
    "items": [
      {
        "inventory_item_id": "880e8400-e29b-41d4-a716-446655440001",
        "name": "Projector - Epson EB-X51",
        "description": "Portable projector, 3800 lumens",
        "quantity_in_package": 1,
        "quantity_available": 7,
        "image_url": "/uploads/inventory/abc123.webp"
      },
      {
        "inventory_item_id": "880e8400-e29b-41d4-a716-446655440002",
        "name": "HDMI Cable (3m)",
        "description": "High-speed HDMI cable",
        "quantity_in_package": 2,
        "quantity_available": 15,
        "image_url": null
      },
      {
        "inventory_item_id": "880e8400-e29b-41d4-a716-446655440003",
        "name": "Portable Speaker",
        "description": "Bluetooth portable speaker",
        "quantity_in_package": 1,
        "quantity_available": 3,
        "image_url": "/uploads/inventory/def456.webp"
      }
    ],
    "is_fully_available": true,
    "total_item_count": 4,
    "created_at": "2026-03-01T09:00:00.000Z",
    "updated_at": "2026-04-10T11:00:00.000Z"
  }
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 404 | `NOT_FOUND` | Package not found |

#### Business Rules

1. `is_fully_available` is `true` only when every item in the package has `quantity_available >= quantity_in_package`.

---

### 6.3 POST /api/packages

**Description:** Create a new package with items.

**Authentication:** `Bearer` token required.
**Authorization:** Admin only.

#### Request

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |
| `Content-Type` | `application/json` |

**Body:**

```json
{
  "name": "Outdoor Event Kit",
  "description": "Complete kit for outdoor company events",
  "items": [
    {
      "inventory_item_id": "880e8400-e29b-41d4-a716-446655440010",
      "quantity": 2
    },
    {
      "inventory_item_id": "880e8400-e29b-41d4-a716-446655440011",
      "quantity": 4
    },
    {
      "inventory_item_id": "880e8400-e29b-41d4-a716-446655440012",
      "quantity": 1
    }
  ]
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `name` | `string` | Yes | 1–200 chars, must be unique | Package name |
| `description` | `string` | No | Max 1000 chars | Description |
| `items` | `array` | Yes | At least 1 item | List of items in the package |
| `items[].inventory_item_id` | `uuid` | Yes | Must reference a valid item | Inventory item ID |
| `items[].quantity` | `integer` | Yes | Min 1 | Quantity of this item in the package |

#### Success Response

**Status:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440020",
    "name": "Outdoor Event Kit",
    "description": "Complete kit for outdoor company events",
    "items": [
      {
        "inventory_item_id": "880e8400-e29b-41d4-a716-446655440010",
        "name": "Folding Table",
        "quantity_in_package": 2,
        "quantity_available": 8,
        "image_url": null
      },
      {
        "inventory_item_id": "880e8400-e29b-41d4-a716-446655440011",
        "name": "Folding Chair",
        "quantity_in_package": 4,
        "quantity_available": 20,
        "image_url": null
      },
      {
        "inventory_item_id": "880e8400-e29b-41d4-a716-446655440012",
        "name": "Canopy Tent (3x3m)",
        "quantity_in_package": 1,
        "quantity_available": 5,
        "image_url": "/uploads/inventory/ghi789.webp"
      }
    ],
    "is_fully_available": true,
    "total_item_count": 7,
    "created_at": "2026-05-29T01:30:00.000Z",
    "updated_at": "2026-05-29T01:30:00.000Z"
  },
  "message": "Package created successfully."
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing required fields, empty items array, or invalid values |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Not an admin |
| 404 | `NOT_FOUND` | One or more `inventory_item_id` values do not exist |
| 409 | `CONFLICT` | Package name already exists |

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "One or more inventory items not found.",
    "details": [
      {
        "field": "items[1].inventory_item_id",
        "message": "Inventory item '880e8400-...' does not exist.",
        "code": "INVALID_REFERENCE"
      }
    ]
  }
}
```

#### Business Rules

1. Package name must be unique (case-insensitive).
2. The `items` array must contain at least one item.
3. Duplicate `inventory_item_id` values in the `items` array are not allowed (merge quantities instead).
4. All referenced inventory items must exist.
5. An audit log entry is created with action `PACKAGE_CREATED`.

---

### 6.4 PUT /api/packages/:id

**Description:** Update a package and its item list. The items array is a **full replacement** — existing items not in the new list are removed, new items are added.

**Authentication:** `Bearer` token required.
**Authorization:** Admin only.

#### Request

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uuid` | Package ID |

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |
| `Content-Type` | `application/json` |

**Body (all fields optional, but `items` if provided replaces the full set):**

```json
{
  "name": "Updated Outdoor Event Kit",
  "description": "Updated description",
  "items": [
    {
      "inventory_item_id": "880e8400-e29b-41d4-a716-446655440010",
      "quantity": 3
    },
    {
      "inventory_item_id": "880e8400-e29b-41d4-a716-446655440013",
      "quantity": 1
    }
  ]
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `name` | `string` | No | 1–200 chars, unique | Updated name |
| `description` | `string` | No | Max 1000 chars | Updated description |
| `items` | `array` | No | At least 1 item if provided | Full replacement of package items |
| `items[].inventory_item_id` | `uuid` | Yes (per item) | Must reference valid item | Inventory item ID |
| `items[].quantity` | `integer` | Yes (per item) | Min 1 | Quantity in package |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440020",
    "name": "Updated Outdoor Event Kit",
    "description": "Updated description",
    "items": [
      {
        "inventory_item_id": "880e8400-e29b-41d4-a716-446655440010",
        "name": "Folding Table",
        "quantity_in_package": 3,
        "quantity_available": 8,
        "image_url": null
      },
      {
        "inventory_item_id": "880e8400-e29b-41d4-a716-446655440013",
        "name": "Extension Cord (10m)",
        "quantity_in_package": 1,
        "quantity_available": 12,
        "image_url": null
      }
    ],
    "is_fully_available": true,
    "total_item_count": 4,
    "created_at": "2026-05-29T01:30:00.000Z",
    "updated_at": "2026-05-29T01:45:00.000Z"
  },
  "message": "Package updated successfully."
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid values or empty items array |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Not an admin |
| 404 | `NOT_FOUND` | Package not found or referenced inventory item not found |
| 409 | `CONFLICT` | Name already in use by another package |

#### Business Rules

1. If `items` is provided, it fully replaces the existing item associations (delete-and-insert strategy in a transaction).
2. If `items` is omitted, existing items remain unchanged and only metadata fields are updated.
3. The `items` array, if provided, must contain at least one item.
4. An audit log entry is created with action `PACKAGE_UPDATED`.

---

### 6.5 DELETE /api/packages/:id

**Description:** Permanently delete a package.

**Authentication:** `Bearer` token required.
**Authorization:** Admin only.

#### Request

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uuid` | Package ID |

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |

**Body:** None.

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": null,
  "message": "Package deleted successfully."
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Not an admin |
| 404 | `NOT_FOUND` | Package not found |
| 409 | `CONFLICT` | Package is referenced by active reservations |

#### Business Rules

1. Cannot delete a package that has active reservations (status `reserved` or `checked_out`) referencing it.
2. Deleting a package does not delete the underlying inventory items — only the package grouping is removed.
3. Package-item associations (`package_items` table rows) are deleted in cascade.
4. An audit log entry is created with action `PACKAGE_DELETED`.

---

## 7. Reservations Endpoints

### 7.1 GET /api/reservations

**Description:** List reservations. Admins see all reservations; regular users see only reservations belonging to their assigned borrower entities.

**Authentication:** `Bearer` token required.
**Authorization:** Any authenticated user (scoped results).

#### Request

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | `integer` | `1` | Page number |
| `per_page` | `integer` | `20` | Items per page (max 100) |
| `status` | `string` | — | Filter: `reserved`, `checked_out`, `returned`, `cancelled` |
| `borrower_entity_id` | `uuid` | — | Filter by borrower entity (admin only) |
| `search` | `string` | — | Search by reservation reference number or borrower entity name |
| `date_from` | `string` | — | Filter: pickup date >= this date (ISO 8601 date: `YYYY-MM-DD`) |
| `date_to` | `string` | — | Filter: pickup date <= this date (ISO 8601 date: `YYYY-MM-DD`) |
| `sort_by` | `string` | `created_at` | Sort: `created_at`, `pickup_date`, `return_date`, `status` |
| `sort_order` | `string` | `desc` | `asc` or `desc` |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440001",
      "reference_number": "RES-2026-0042",
      "status": "reserved",
      "borrower_entity": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Engineering Department"
      },
      "created_by": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "display_name": "Regular User"
      },
      "pickup_date": "2026-06-01",
      "return_date": "2026-06-05",
      "notes": "Needed for the annual tech conference",
      "item_count": 5,
      "created_at": "2026-05-28T14:00:00.000Z",
      "updated_at": "2026-05-28T14:00:00.000Z",
      "returned_at": null,
      "cancelled_at": null
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_items": 23,
    "total_pages": 2,
    "has_next_page": true,
    "has_prev_page": false
  }
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Missing or invalid token |

#### Business Rules

1. **Admin users:** See all reservations. Can filter by any `borrower_entity_id`.
2. **Regular users:** See only reservations where `borrower_entity_id` matches one of their assigned entities. The `borrower_entity_id` filter, if provided, must be one of their assigned entities.
3. List view returns a summary `item_count` instead of full item details for performance.

---

### 7.2 GET /api/reservations/:id

**Description:** Get full details of a specific reservation, including all reserved items and their quantities.

**Authentication:** `Bearer` token required.
**Authorization:** Admin, or user assigned to the reservation's borrower entity.

#### Request

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uuid` | Reservation ID |

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "aa0e8400-e29b-41d4-a716-446655440001",
    "reference_number": "RES-2026-0042",
    "status": "reserved",
    "borrower_entity": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Engineering Department"
    },
    "created_by": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "display_name": "Regular User",
      "username": "user@example.com"
    },
    "pickup_date": "2026-06-01",
    "return_date": "2026-06-05",
    "notes": "Needed for the annual tech conference",
    "items": [
      {
        "id": "bb0e8400-e29b-41d4-a716-446655440001",
        "type": "item",
        "inventory_item": {
          "id": "880e8400-e29b-41d4-a716-446655440001",
          "name": "Projector - Epson EB-X51",
          "image_url": "/uploads/inventory/abc123.webp"
        },
        "quantity": 2,
        "source_package": null
      },
      {
        "id": "bb0e8400-e29b-41d4-a716-446655440002",
        "type": "package_item",
        "inventory_item": {
          "id": "880e8400-e29b-41d4-a716-446655440002",
          "name": "HDMI Cable (3m)",
          "image_url": null
        },
        "quantity": 2,
        "source_package": {
          "id": "990e8400-e29b-41d4-a716-446655440001",
          "name": "Conference Room Kit"
        }
      },
      {
        "id": "bb0e8400-e29b-41d4-a716-446655440003",
        "type": "package_item",
        "inventory_item": {
          "id": "880e8400-e29b-41d4-a716-446655440003",
          "name": "Portable Speaker",
          "image_url": "/uploads/inventory/def456.webp"
        },
        "quantity": 1,
        "source_package": {
          "id": "990e8400-e29b-41d4-a716-446655440001",
          "name": "Conference Room Kit"
        }
      }
    ],
    "created_at": "2026-05-28T14:00:00.000Z",
    "updated_at": "2026-05-28T14:00:00.000Z",
    "returned_at": null,
    "cancelled_at": null
  }
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | User is not admin and not assigned to the reservation's borrower entity |
| 404 | `NOT_FOUND` | Reservation not found |

---

### 7.3 POST /api/reservations

**Description:** Create a new reservation. Supports direct item reservations, package reservations (with optional exclusions), and mixed reservations combining both.

**Authentication:** `Bearer` token required.
**Authorization:** Any authenticated user (must be assigned to the specified borrower entity, or admin).

#### Request

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |
| `Content-Type` | `application/json` |

**Body:**

```json
{
  "borrower_entity_id": "660e8400-e29b-41d4-a716-446655440001",
  "pickup_date": "2026-06-01",
  "return_date": "2026-06-05",
  "notes": "Needed for the annual tech conference",
  "items": [
    {
      "type": "item",
      "inventory_item_id": "880e8400-e29b-41d4-a716-446655440001",
      "quantity": 2
    },
    {
      "type": "package",
      "package_id": "990e8400-e29b-41d4-a716-446655440001",
      "excluded_item_ids": [
        "880e8400-e29b-41d4-a716-446655440001"
      ]
    }
  ]
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `borrower_entity_id` | `uuid` | Yes | Must exist and be active | The borrower entity making the reservation |
| `pickup_date` | `string` | Yes | ISO date (`YYYY-MM-DD`), must be today or future | Date items will be picked up |
| `return_date` | `string` | Yes | ISO date (`YYYY-MM-DD`), must be after `pickup_date` | Expected return date |
| `notes` | `string` | No | Max 2000 chars | Optional notes |
| `items` | `array` | Yes | At least 1 item | Array of items/packages to reserve |
| `items[].type` | `string` | Yes | `item` or `package` | Whether this is a direct item or a package |
| `items[].inventory_item_id` | `uuid` | Conditional | Required when `type: "item"` | Direct inventory item to reserve |
| `items[].quantity` | `integer` | Conditional | Required when `type: "item"`, min 1 | Quantity to reserve |
| `items[].package_id` | `uuid` | Conditional | Required when `type: "package"` | Package to reserve |
| `items[].excluded_item_ids` | `uuid[]` | No | Only valid when `type: "package"` | Items from the package to exclude |

#### Reservation Processing Logic

When processing a reservation, the server:

1. **Direct items (`type: "item"`):** Reserves the specified `quantity` of the inventory item.
2. **Packages (`type: "package"`):** Expands the package into its individual items and quantities, excluding any items listed in `excluded_item_ids`.
3. **Quantity aggregation:** If the same inventory item appears multiple times (e.g., directly and also via a package), quantities are summed and checked against availability.
4. **Availability check:** For each unique inventory item, the total requested quantity must not exceed `quantity_available`.
5. **Atomic operation:** All items are reserved in a single database transaction. If any item fails the availability check, the entire reservation fails.

#### Success Response

**Status:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "aa0e8400-e29b-41d4-a716-446655440010",
    "reference_number": "RES-2026-0043",
    "status": "reserved",
    "borrower_entity": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Engineering Department"
    },
    "created_by": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "display_name": "Regular User",
      "username": "user@example.com"
    },
    "pickup_date": "2026-06-01",
    "return_date": "2026-06-05",
    "notes": "Needed for the annual tech conference",
    "items": [
      {
        "id": "bb0e8400-e29b-41d4-a716-446655440010",
        "type": "item",
        "inventory_item": {
          "id": "880e8400-e29b-41d4-a716-446655440001",
          "name": "Projector - Epson EB-X51",
          "image_url": "/uploads/inventory/abc123.webp"
        },
        "quantity": 2,
        "source_package": null
      },
      {
        "id": "bb0e8400-e29b-41d4-a716-446655440011",
        "type": "package_item",
        "inventory_item": {
          "id": "880e8400-e29b-41d4-a716-446655440002",
          "name": "HDMI Cable (3m)",
          "image_url": null
        },
        "quantity": 2,
        "source_package": {
          "id": "990e8400-e29b-41d4-a716-446655440001",
          "name": "Conference Room Kit"
        }
      },
      {
        "id": "bb0e8400-e29b-41d4-a716-446655440012",
        "type": "package_item",
        "inventory_item": {
          "id": "880e8400-e29b-41d4-a716-446655440003",
          "name": "Portable Speaker",
          "image_url": "/uploads/inventory/def456.webp"
        },
        "quantity": 1,
        "source_package": {
          "id": "990e8400-e29b-41d4-a716-446655440001",
          "name": "Conference Room Kit"
        }
      }
    ],
    "created_at": "2026-05-29T02:00:00.000Z",
    "updated_at": "2026-05-29T02:00:00.000Z",
    "returned_at": null,
    "cancelled_at": null
  },
  "message": "Reservation created successfully."
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or invalid fields |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | User not assigned to the specified borrower entity |
| 404 | `NOT_FOUND` | Borrower entity, inventory item, or package not found |
| 409 | `CONFLICT` | Insufficient stock for one or more items |
| 422 | `UNPROCESSABLE_ENTITY` | `return_date` is before or equal to `pickup_date`; `pickup_date` is in the past |

**Insufficient stock error example:**

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Insufficient stock for one or more items.",
    "details": [
      {
        "field": "items[0]",
        "message": "Requested 5 of 'Projector - Epson EB-X51' but only 3 available.",
        "code": "INSUFFICIENT_STOCK",
        "inventory_item_id": "880e8400-e29b-41d4-a716-446655440001",
        "requested": 5,
        "available": 3
      }
    ]
  }
}
```

#### Business Rules

1. **Reference number** is auto-generated in the format `RES-{YEAR}-{SEQUENTIAL_NUMBER}` (zero-padded to 4 digits).
2. **Status** is set to `reserved` on creation.
3. `pickup_date` must be today or in the future.
4. `return_date` must be strictly after `pickup_date`.
5. Regular users can only create reservations for borrower entities they are assigned to.
6. Admins can create reservations for any borrower entity.
7. When a package is reserved with exclusions, the `excluded_item_ids` must be valid item IDs that exist within the specified package. Invalid exclusion IDs are silently ignored.
8. The Projector item in the example above was excluded from the Conference Room Kit via `excluded_item_ids` but reserved directly — the item only appears once as a direct reservation.
9. All inventory quantities are updated atomically in a database transaction.
10. An audit log entry is created with action `RESERVATION_CREATED`.

---

### 7.4 PUT /api/reservations/:id

**Description:** Update a reservation. Admin only. Can modify items, dates, status, and notes.

**Authentication:** `Bearer` token required.
**Authorization:** Admin only.

#### Request

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uuid` | Reservation ID |

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |
| `Content-Type` | `application/json` |

**Body (all fields optional):**

```json
{
  "status": "checked_out",
  "pickup_date": "2026-06-02",
  "return_date": "2026-06-07",
  "notes": "Updated notes - confirmed pickup",
  "items": [
    {
      "type": "item",
      "inventory_item_id": "880e8400-e29b-41d4-a716-446655440001",
      "quantity": 1
    }
  ]
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `status` | `string` | No | `reserved`, `checked_out`, `returned`, `cancelled` | New status |
| `pickup_date` | `string` | No | ISO date | Updated pickup date |
| `return_date` | `string` | No | ISO date, after pickup_date | Updated return date |
| `notes` | `string` | No | Max 2000 chars | Updated notes |
| `items` | `array` | No | At least 1 item if provided | Full replacement of reservation items (same format as create) |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "aa0e8400-e29b-41d4-a716-446655440001",
    "reference_number": "RES-2026-0042",
    "status": "checked_out",
    "borrower_entity": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Engineering Department"
    },
    "created_by": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "display_name": "Regular User",
      "username": "user@example.com"
    },
    "pickup_date": "2026-06-02",
    "return_date": "2026-06-07",
    "notes": "Updated notes - confirmed pickup",
    "items": [
      {
        "id": "bb0e8400-e29b-41d4-a716-446655440020",
        "type": "item",
        "inventory_item": {
          "id": "880e8400-e29b-41d4-a716-446655440001",
          "name": "Projector - Epson EB-X51",
          "image_url": "/uploads/inventory/abc123.webp"
        },
        "quantity": 1,
        "source_package": null
      }
    ],
    "created_at": "2026-05-28T14:00:00.000Z",
    "updated_at": "2026-05-29T02:30:00.000Z",
    "returned_at": null,
    "cancelled_at": null
  },
  "message": "Reservation updated successfully."
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid field values |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Not an admin |
| 404 | `NOT_FOUND` | Reservation or referenced items not found |
| 409 | `CONFLICT` | Insufficient stock; or invalid status transition |
| 422 | `UNPROCESSABLE_ENTITY` | Invalid dates; cannot modify returned/cancelled reservation |

#### Business Rules

1. **Status transitions:** Only these transitions are valid:
   - `reserved` → `checked_out`
   - `reserved` → `cancelled`
   - `checked_out` → `returned`
   - `checked_out` → `cancelled` (emergency only)
2. Changing status to `returned` sets `returned_at` timestamp and releases inventory quantities.
3. Changing status to `cancelled` sets `cancelled_at` timestamp and releases inventory quantities.
4. Cannot update a reservation that is already in `returned` or `cancelled` status.
5. If `items` are modified, old item quantities are released before new quantities are reserved (within a transaction).
6. An audit log entry is created with action `RESERVATION_UPDATED`, including changed fields and previous values.

---

### 7.5 POST /api/reservations/:id/return

**Description:** Mark a reservation as returned. All reserved items are released back to available inventory.

**Authentication:** `Bearer` token required.
**Authorization:** Admin, or user assigned to the reservation's borrower entity.

#### Request

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uuid` | Reservation ID |

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |
| `Content-Type` | `application/json` |

**Body (optional):**

```json
{
  "notes": "All items returned in good condition."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `notes` | `string` | No | Additional notes to append (e.g., condition report) |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "aa0e8400-e29b-41d4-a716-446655440001",
    "reference_number": "RES-2026-0042",
    "status": "returned",
    "returned_at": "2026-06-05T16:30:00.000Z",
    "items": [ /* ... full item list ... */ ]
  },
  "message": "Reservation marked as returned. All items have been released."
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | User not authorized for this reservation |
| 404 | `NOT_FOUND` | Reservation not found |
| 422 | `UNPROCESSABLE_ENTITY` | Reservation is not in `checked_out` status |

#### Business Rules

1. Only reservations with status `checked_out` can be returned.
2. Sets `status` to `returned` and `returned_at` to current timestamp.
3. All item quantities from this reservation are added back to `quantity_available`.
4. If `notes` are provided, they are appended to existing notes (separated by a newline and timestamp).
5. An audit log entry is created with action `RESERVATION_RETURNED`.

---

### 7.6 POST /api/reservations/:id/cancel

**Description:** Cancel a reservation. All reserved items are released back to available inventory.

**Authentication:** `Bearer` token required.
**Authorization:** Admin, or user assigned to the reservation's borrower entity.

#### Request

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uuid` | Reservation ID |

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |
| `Content-Type` | `application/json` |

**Body (optional):**

```json
{
  "reason": "Event postponed to next month."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | `string` | No | Reason for cancellation (stored in notes) |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "aa0e8400-e29b-41d4-a716-446655440001",
    "reference_number": "RES-2026-0042",
    "status": "cancelled",
    "cancelled_at": "2026-05-30T10:00:00.000Z"
  },
  "message": "Reservation cancelled. All items have been released."
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | User not authorized for this reservation |
| 404 | `NOT_FOUND` | Reservation not found |
| 422 | `UNPROCESSABLE_ENTITY` | Reservation is already `returned` or `cancelled` |

#### Business Rules

1. Reservations with status `reserved` or `checked_out` can be cancelled.
2. Sets `status` to `cancelled` and `cancelled_at` to current timestamp.
3. All item quantities are released back to available inventory.
4. If `reason` is provided, it is appended to notes prefixed with "Cancellation reason: ".
5. An audit log entry is created with action `RESERVATION_CANCELLED`.

---

### 7.7 DELETE /api/reservations/:id

**Description:** Permanently delete a reservation and all its associated records.

**Authentication:** `Bearer` token required.
**Authorization:** Admin only.

#### Request

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uuid` | Reservation ID |

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |

**Body:** None.

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": null,
  "message": "Reservation deleted successfully."
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Not an admin |
| 404 | `NOT_FOUND` | Reservation not found |
| 409 | `CONFLICT` | Reservation is in `checked_out` status (must be returned or cancelled first) |

#### Business Rules

1. Cannot delete a reservation that is currently `checked_out` — it must be returned or cancelled first to ensure inventory quantities are properly reconciled.
2. If the reservation is in `reserved` status, its quantities are released before deletion.
3. If the reservation is already `returned` or `cancelled`, quantities have already been released, so it is simply deleted.
4. Reservation items (`reservation_items` table rows) are deleted in cascade.
5. This is a **hard delete** — the reservation is permanently removed.
6. An audit log entry is created with action `RESERVATION_DELETED`.

---

## 8. App Configuration Endpoints

### 8.1 GET /api/config

**Description:** Get the current application configuration.

**Authentication:** `Bearer` token required.
**Authorization:** Admin only.

#### Request

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "app_name": "Resource Manager",
    "low_stock_threshold_percent": 20,
    "max_reservation_days": 30,
    "allow_same_day_pickup": true,
    "require_return_confirmation": false,
    "updated_at": "2026-05-01T12:00:00.000Z",
    "updated_by": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "display_name": "Admin User"
    }
  }
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Not an admin |

---

### 8.2 PUT /api/config

**Description:** Update application configuration. All fields are optional; only provided fields are updated.

**Authentication:** `Bearer` token required.
**Authorization:** Admin only.

#### Request

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |
| `Content-Type` | `application/json` |

**Body (all fields optional):**

```json
{
  "app_name": "Acme Resource Manager",
  "low_stock_threshold_percent": 25,
  "max_reservation_days": 14,
  "allow_same_day_pickup": false,
  "require_return_confirmation": true
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `app_name` | `string` | No | 1–100 chars | Application display name |
| `low_stock_threshold_percent` | `integer` | No | 1–100 | Percentage of total quantity that triggers "low stock" status |
| `max_reservation_days` | `integer` | No | 1–365 | Maximum number of days a reservation can span |
| `allow_same_day_pickup` | `boolean` | No | — | Whether pickup_date can be today |
| `require_return_confirmation` | `boolean` | No | — | Whether returns require admin confirmation |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "app_name": "Acme Resource Manager",
    "low_stock_threshold_percent": 25,
    "max_reservation_days": 14,
    "allow_same_day_pickup": false,
    "require_return_confirmation": true,
    "updated_at": "2026-05-29T02:45:00.000Z",
    "updated_by": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "display_name": "Admin User"
    }
  },
  "message": "Configuration updated successfully."
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid field values or constraints violated |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Not an admin |

#### Business Rules

1. Configuration is stored as key-value pairs in the `app_config` table.
2. Changes take effect immediately — no restart needed.
3. `max_reservation_days` is enforced on new reservations: `return_date - pickup_date <= max_reservation_days`.
4. `allow_same_day_pickup` affects validation of `pickup_date` on new reservations.
5. An audit log entry is created with action `CONFIG_UPDATED` including old and new values.

---

## 9. Dashboard Endpoints

### 9.1 GET /api/dashboard/stats

**Description:** Get dashboard statistics. Admins see full system statistics; regular users see statistics scoped to their assigned borrower entities.

**Authentication:** `Bearer` token required.
**Authorization:** Any authenticated user (scoped results).

#### Request

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |

#### Success Response — Admin View

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "overview": {
      "total_inventory_items": 156,
      "total_quantity_across_items": 2340,
      "total_available_quantity": 1890,
      "total_reserved_quantity": 450,
      "utilization_rate_percent": 19.2,
      "items_out_of_stock": 3,
      "items_low_stock": 12
    },
    "reservations": {
      "total_active": 23,
      "status_breakdown": {
        "reserved": 15,
        "checked_out": 8,
        "returned_this_month": 42,
        "cancelled_this_month": 5
      },
      "overdue_count": 2
    },
    "entities": {
      "total_active": 8,
      "most_active": [
        {
          "id": "660e8400-e29b-41d4-a716-446655440001",
          "name": "Engineering Department",
          "active_reservations": 7
        },
        {
          "id": "660e8400-e29b-41d4-a716-446655440002",
          "name": "Marketing Team",
          "active_reservations": 5
        }
      ]
    },
    "users": {
      "total_active": 42,
      "admins": 3,
      "regular_users": 39
    },
    "recent_activity": [
      {
        "type": "reservation_created",
        "reference_number": "RES-2026-0043",
        "entity_name": "Engineering Department",
        "user_name": "Regular User",
        "timestamp": "2026-05-29T02:00:00.000Z"
      },
      {
        "type": "reservation_returned",
        "reference_number": "RES-2026-0038",
        "entity_name": "Marketing Team",
        "user_name": "Another User",
        "timestamp": "2026-05-28T16:00:00.000Z"
      }
    ]
  }
}
```

#### Success Response — Regular User View

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "my_entities": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Engineering Department",
        "active_reservations": 3,
        "reservations_this_month": 7
      }
    ],
    "my_reservations": {
      "total_active": 3,
      "status_breakdown": {
        "reserved": 2,
        "checked_out": 1
      },
      "overdue_count": 0
    },
    "recent_activity": [
      {
        "type": "reservation_created",
        "reference_number": "RES-2026-0043",
        "entity_name": "Engineering Department",
        "timestamp": "2026-05-29T02:00:00.000Z"
      }
    ]
  }
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Missing or invalid token |

#### Business Rules

1. **Overdue** reservations are those with status `checked_out` and `return_date < today`.
2. `recent_activity` returns the 10 most recent events.
3. `utilization_rate_percent` = `(total_reserved_quantity / total_quantity_across_items) * 100`, rounded to one decimal.
4. Regular users only see data for their assigned entities and their own reservations.

---

## 10. Audit Log Endpoints

### 10.1 GET /api/audit-log

**Description:** List audit log entries with pagination and filtering. Provides a chronological record of all system actions.

**Authentication:** `Bearer` token required.
**Authorization:** Admin only.

#### Request

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | `integer` | `1` | Page number |
| `per_page` | `integer` | `50` | Items per page (max 100) |
| `action` | `string` | — | Filter by action code (e.g., `USER_CREATED`, `RESERVATION_CREATED`) |
| `user_id` | `uuid` | — | Filter by the user who performed the action |
| `resource_type` | `string` | — | Filter by resource type: `user`, `entity`, `item`, `package`, `reservation`, `config` |
| `resource_id` | `uuid` | — | Filter by specific resource ID |
| `date_from` | `string` | — | Filter: entries on or after this date (ISO 8601: `YYYY-MM-DD`) |
| `date_to` | `string` | — | Filter: entries on or before this date (ISO 8601: `YYYY-MM-DD`) |
| `sort_order` | `string` | `desc` | `asc` or `desc` (always sorted by timestamp) |

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "cc0e8400-e29b-41d4-a716-446655440001",
      "action": "RESERVATION_CREATED",
      "resource_type": "reservation",
      "resource_id": "aa0e8400-e29b-41d4-a716-446655440010",
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "display_name": "Regular User",
        "username": "user@example.com"
      },
      "details": {
        "reference_number": "RES-2026-0043",
        "borrower_entity": "Engineering Department",
        "item_count": 5
      },
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2026-05-29T02:00:00.000Z"
    },
    {
      "id": "cc0e8400-e29b-41d4-a716-446655440002",
      "action": "USER_UPDATED",
      "resource_type": "user",
      "resource_id": "550e8400-e29b-41d4-a716-446655440005",
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "display_name": "Admin User",
        "username": "admin@example.com"
      },
      "details": {
        "changes": {
          "display_name": {
            "old": "Old Name",
            "new": "New Name"
          },
          "role": {
            "old": "user",
            "new": "admin"
          }
        }
      },
      "ip_address": "192.168.1.50",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2026-05-28T22:15:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total_items": 1234,
    "total_pages": 25,
    "has_next_page": true,
    "has_prev_page": false
  }
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Not an admin |

#### All Audit Log Action Codes

| Action Code | Resource Type | Description |
|-------------|--------------|-------------|
| `USER_CREATED` | `user` | New user account created |
| `USER_UPDATED` | `user` | User details modified |
| `USER_DEACTIVATED` | `user` | User soft-deleted |
| `USER_ENTITY_ASSIGNED` | `user` | User assigned to borrower entity |
| `USER_ENTITY_UNASSIGNED` | `user` | User removed from borrower entity |
| `PROFILE_UPDATED` | `user` | User updated own profile |
| `USER_LOGIN` | `user` | Successful login |
| `USER_LOGOUT` | `user` | User logged out |
| `ENTITY_CREATED` | `entity` | Borrower entity created |
| `ENTITY_UPDATED` | `entity` | Borrower entity modified |
| `ENTITY_DEACTIVATED` | `entity` | Borrower entity soft-deleted |
| `ITEM_CREATED` | `item` | Inventory item created |
| `ITEM_UPDATED` | `item` | Inventory item modified |
| `ITEM_DELETED` | `item` | Inventory item permanently deleted |
| `ITEM_IMAGE_UPLOADED` | `item` | Item image uploaded or replaced |
| `PACKAGE_CREATED` | `package` | Package created |
| `PACKAGE_UPDATED` | `package` | Package modified |
| `PACKAGE_DELETED` | `package` | Package permanently deleted |
| `RESERVATION_CREATED` | `reservation` | Reservation created |
| `RESERVATION_UPDATED` | `reservation` | Reservation modified (admin) |
| `RESERVATION_RETURNED` | `reservation` | Reservation marked as returned |
| `RESERVATION_CANCELLED` | `reservation` | Reservation cancelled |
| `RESERVATION_DELETED` | `reservation` | Reservation permanently deleted |
| `CONFIG_UPDATED` | `config` | App configuration updated |

#### Business Rules

1. Audit log entries are **immutable** — they cannot be edited or deleted via the API.
2. The `details` field is a JSON object whose structure varies by action type (see examples above).
3. `ip_address` and `user_agent` are captured from the request headers for security auditing.
4. Audit entries are retained indefinitely.
5. The log always sorts by `created_at`; `sort_order` controls ascending vs descending.
