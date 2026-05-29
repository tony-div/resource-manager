# Resource Manager - API Design

## Overview
This document outlines the RESTful API design for the Resource Manager application.

> **Security Note:** Swagger UI is provided for API exploration during development, but **Swagger UI will be disabled in the production environment**.

## Global Conventions

- **Base URL**: All endpoints are relative to `/api`.
- **Authentication**: JWT tokens passed via the `Authorization: Bearer <token>` header.
- **Content-Type**: All requests and responses use `application/json` unless otherwise specified.
- **Arabic Search**: All `GET` list endpoints that feature text-based search functionality **must** search against the `search_normalized` columns in the database to ensure accurate Arabic text matching (ignoring variations in diacritics, hamza, taa marbouta, etc.).
- **Standard Error Response**:
  ```json
  {
    "error": "ERROR_CODE_STRING",
    "message": "Human readable error description",
    "details": [] 
  }
  ```

---

## 1. Auth Endpoints

### `POST /api/auth/login`
Authenticates a user.
- **Auth Required**: No
- **Request Payload**:
  ```json
  {
    "username": "admin_user",
    "password": "securepassword123"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "admin_user",
      "role": "admin"
    }
  }
  ```
- **Error Responses**: `401 Unauthorized` (Invalid credentials), `400 Bad Request` (Missing fields).

### `POST /api/auth/logout`
Invalidates the current session.
- **Auth Required**: Yes
- **Success Response (200 OK)**:
  ```json
  { "message": "Logged out successfully" }
  ```

---

## 2. Users Endpoints

### `GET /api/users`
Retrieves a paginated list of users.
- **Auth Required**: Yes (Admin)
- **Query Parameters**: `page`, `limit`, `search` (searches `search_normalized` columns).
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      { "id": 1, "username": "admin_user", "role": "admin", "is_active": true }
    ],
    "meta": { "total": 1, "page": 1, "limit": 20 }
  }
  ```

### `POST /api/users`
Creates a new user.
- **Auth Required**: Yes (Admin)
- **Request Payload**:
  ```json
  {
    "username": "new_user",
    "password": "password123",
    "role": "staff"
  }
  ```
- **Success Response (201 Created)**: Returns the created user object (without password).

### `GET /api/users/:id`
Retrieves a specific user.
- **Auth Required**: Yes (Admin or self)
- **Success Response (200 OK)**: User object.
- **Error Responses**: `404 Not Found`.

### `PUT /api/users/:id`
Updates user details.
- **Auth Required**: Yes (Admin or self)
- **Request Payload**:
  ```json
  {
    "username": "updated_user",
    "role": "staff",
    "is_active": true
  }
  ```
- **Success Response (200 OK)**: Updated user object.

### `DELETE /api/users/:id`
Deletes or deactivates a user.
- **Auth Required**: Yes (Admin)
- **Success Response (200 OK)**: `{ "message": "User deleted successfully" }`

---

## 3. Borrower Entities Endpoints

### `GET /api/entities`
Retrieves a list of borrower entities (e.g., departments, external organizations).
- **Auth Required**: Yes
- **Query Parameters**: `page`, `limit`, `search` (searches `search_normalized` columns).
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      { "id": 1, "name": "Engineering Dept", "contact_person": "Jane Doe" }
    ],
    "meta": { "total": 1, "page": 1, "limit": 20 }
  }
  ```

### `POST /api/entities`
Creates a new borrower entity.
- **Auth Required**: Yes
- **Request Payload**:
  ```json
  {
    "name": "Marketing",
    "contact_person": "John Smith",
    "contact_phone": "555-1234"
  }
  ```
- **Success Response (201 Created)**: Created entity object.

### `GET /api/entities/:id`
Retrieves specific borrower entity details.
- **Auth Required**: Yes
- **Success Response (200 OK)**: Entity object.

### `PUT /api/entities/:id`
Updates an existing borrower entity.
- **Auth Required**: Yes
- **Success Response (200 OK)**: Updated entity object.

### `DELETE /api/entities/:id`
Deletes a borrower entity.
- **Auth Required**: Yes (Admin)
- **Success Response (200 OK)**: `{ "message": "Entity deleted successfully" }`

---

## 4. Inventory Items Endpoints

### `GET /api/inventory`
Retrieves a list of inventory items.
- **Auth Required**: Yes
- **Query Parameters**: `page`, `limit`, `search` (searches `search_normalized` columns), `category`.
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": 101,
        "name": "Projector",
        "total_quantity": 10,
        "available_quantity": 8
      }
    ],
    "meta": { "total": 150, "page": 1, "limit": 20 }
  }
  ```

### `POST /api/inventory`
Creates a new inventory item.
- **Auth Required**: Yes
- **Request Payload**:
  ```json
  {
    "name": "Laptop",
    "description": "Dell XPS 15",
    "category": "Electronics",
    "total_quantity": 5
  }
  ```
- **Success Response (201 Created)**: Created inventory item object.

### `GET /api/inventory/:id`
Retrieves details of a specific inventory item.
- **Auth Required**: Yes
- **Success Response (200 OK)**: Inventory item object.

### `PUT /api/inventory/:id`
Updates an inventory item, including its quantity.
- **Auth Required**: Yes
- **Quantity Adjustment Rules**: If `total_quantity` is reduced to a number lower than the currently reserved quantity, the system will **automatically resolve the overallocation by cancelling or updating the latest active reservations**.
- **Request Payload**:
  ```json
  {
    "name": "Laptop",
    "total_quantity": 3
  }
  ```
- **Success Response (200 OK)**: Updated inventory item object.

### `DELETE /api/inventory/:id`
Deletes an inventory item.
- **Auth Required**: Yes (Admin)
- **Cleanup Rule**: Automatically handles cleanup by **removing the item from any associated packages** and **cancelling any active reservations** that include this item.
- **Success Response (200 OK)**: `{ "message": "Item deleted and cleaned up successfully" }`

---

## 5. Packages Endpoints

### `GET /api/packages`
Retrieves a list of bundled packages.
- **Auth Required**: Yes
- **Query Parameters**: `page`, `limit`, `search` (searches `search_normalized` columns).
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      { "id": 1, "name": "AV Kit", "items": [...] }
    ],
    "meta": { "total": 5, "page": 1, "limit": 20 }
  }
  ```

### `POST /api/packages`
Creates a new package bundle.
- **Auth Required**: Yes
- **Request Payload**:
  ```json
  {
    "name": "Conference Kit",
    "description": "Basic conference setup",
    "items": [
      { "inventory_id": 101, "quantity": 1 },
      { "inventory_id": 105, "quantity": 2 }
    ]
  }
  ```
- **Success Response (201 Created)**: Created package object.

### `GET /api/packages/:id`
Retrieves a specific package.
- **Auth Required**: Yes
- **Success Response (200 OK)**: Package object including item details.

### `PUT /api/packages/:id`
Updates a package definition.
- **Auth Required**: Yes
- **Success Response (200 OK)**: Updated package object.

### `DELETE /api/packages/:id`
Deletes a package.
- **Auth Required**: Yes (Admin)
- **Cleanup Rule**: Automatically handles cleanup by **cancelling any active reservations** that specifically requested this package.
- **Success Response (200 OK)**: `{ "message": "Package deleted and reservations cancelled" }`

---

## 6. Reservations Endpoints

### `GET /api/reservations`
Retrieves a list of reservations.
- **Auth Required**: Yes
- **Query Parameters**: `status`, `borrower_entity_id`, `start_date`, `end_date`.
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": 1,
        "borrower_entity_id": 2,
        "status": "active",
        "pickup_time": "2026-06-01T09:00:00Z",
        "return_time": "2026-06-03T17:00:00Z"
      }
    ],
    "meta": { "total": 10, "page": 1, "limit": 20 }
  }
  ```

### `POST /api/reservations`
Creates a new reservation.
- **Auth Required**: Yes
- **Entity Selection**: The payload **must require `borrower_entity_id`**. One reservation belongs to exactly one entity.
- **Time Windows**: Payload must accept `pickup_time` and `return_time`. Validation exists to prevent overlapping time windows that exceed available inventory.
- **Request Payload**:
  ```json
  {
    "borrower_entity_id": 2,
    "pickup_time": "2026-06-01T09:00:00Z",
    "return_time": "2026-06-03T17:00:00Z",
    "items": [
      { "inventory_id": 101, "quantity": 1 }
    ],
    "packages": [
      { "package_id": 1, "quantity": 1 }
    ]
  }
  ```
- **Success Response (201 Created)**: Created reservation object.
- **Error Responses**: `409 Conflict` (Overlapping time window exceeds available inventory), `400 Bad Request` (Missing `borrower_entity_id` or invalid time format).

### `GET /api/reservations/:id`
Retrieves a specific reservation.
- **Auth Required**: Yes
- **Success Response (200 OK)**: Reservation details.

### `PUT /api/reservations/:id`
Updates an existing reservation (e.g., modifying dates or items prior to pickup).
- **Auth Required**: Yes
- **Success Response (200 OK)**: Updated reservation object.
- **Error Responses**: `409 Conflict` (Changes cause overallocation).

### `DELETE /api/reservations/:id`
Cancels a reservation.
- **Auth Required**: Yes
- **Success Response (200 OK)**: `{ "message": "Reservation cancelled" }`

### `POST /api/reservations/:id/return`
Marks a reservation as returned and restores inventory quantities.
- **Auth Required**: Yes (**Restricted to Admin roles only**)
- **Request Payload**:
  ```json
  {
    "notes": "Returned in good condition"
  }
  ```
- **Success Response (200 OK)**: `{ "message": "Reservation successfully returned", "status": "completed" }`
- **Error Responses**: `403 Forbidden` (If user is not an admin).

---

## 7. App Configuration Endpoints

### `GET /api/config`
Retrieves global application settings.
- **Auth Required**: Yes
- **Success Response (200 OK)**:
  ```json
  {
    "company_name": "Resource Manager Inc",
    "default_reservation_days": 3,
    "timezone": "Asia/Riyadh"
  }
  ```

### `PUT /api/config`
Updates application settings.
- **Auth Required**: Yes (Admin)
- **Request Payload**: Partial or full settings object.
- **Success Response (200 OK)**: Updated configuration object.

---

## 8. Dashboard Endpoints

### `GET /api/dashboard/stats`
Retrieves summary statistics for the dashboard overview.
- **Auth Required**: Yes
- **Success Response (200 OK)**:
  ```json
  {
    "active_reservations_count": 14,
    "pending_returns_count": 3,
    "total_inventory_items": 450,
    "total_borrower_entities": 25
  }
  ```

---

## 9. Audit Log Endpoints

### `GET /api/audit-logs`
Retrieves a history of system actions (creates, updates, deletes).
- **Auth Required**: Yes (Admin)
- **Query Parameters**: `page`, `limit`, `user_id`, `action`, `entity_type`.
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": 1024,
        "user_id": 1,
        "action": "UPDATE",
        "entity_type": "inventory",
        "entity_id": 101,
        "timestamp": "2026-05-29T06:20:00Z",
        "details": { "total_quantity": { "old": 5, "new": 3 } }
      }
    ],
    "meta": { "total": 500, "page": 1, "limit": 50 }
  }
  ```
