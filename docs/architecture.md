# Architecture & Project Structure

## 1. High-Level Architecture

The Resource Manager application follows a standard Client-Server architecture to ensure separation of concerns, scalability, and maintainability.

- **Client Application**: Built with React Native CLI. It natively targets Android devices and utilizes React Native Web to provide identical functionality for Desktop and iOS users through web browsers.
- **Backend API**: A Node.js and Express server providing RESTful APIs to handle business logic, file uploads, and client requests.
- **Database**: A MariaDB relational database acting as the single source of truth for the system, accessed via a raw SQL data access layer.

## 2. Technology Stack Decisions

- **Language**: **TypeScript** is used across the entire stack (Frontend and Backend) to enforce type safety, improve developer experience, and maintain consistent data models.
- **Frontend Framework**: **React Native CLI**. Chosen over Expo to maintain full control over native modules and build processes for the Android application, while leveraging React Native Web for Desktop and iOS reach.
- **Backend Framework**: **Node.js** with **Express**. Lightweight, fast, and highly compatible with TypeScript.
- **Database**: **MariaDB**. A robust, open-source relational database.
- **Database Access**: **mysql2** library. We strictly use raw SQL queries combined with the Repository Pattern. No ORMs (like Prisma or TypeORM) or Query Builders (like Knex.js) are used to ensure maximum performance and absolute control over SQL execution.
- **Image Handling**: **react-native-image-picker** is used to access the device camera and photo gallery, replacing Expo Image Picker.
- **Iconography**: **react-native-vector-icons** provides scalable vector icons across platforms, replacing Expo Vector Icons.

## 3. Backend Folder Structure

The backend follows a layered architecture to separate routing, business logic, and database access. All files use `.ts` extensions.

```text
backend/
├── src/
│   ├── config/           # Configuration files (database connection, environment variables)
│   ├── controllers/      # Route handlers (parse HTTP requests and return HTTP responses)
│   ├── middlewares/      # Express middlewares (authentication, request validation, error handling)
│   ├── models/           # TypeScript interfaces and types for database entities
│   ├── repositories/     # Raw SQL data access layer using mysql2
│   ├── routes/           # Express route definitions linking URLs to controllers
│   ├── services/         # Core business logic layer
│   ├── utils/            # Helper functions and shared utilities
│   ├── app.ts            # Express application setup and middleware wiring
│   └── server.ts         # Entry point to start the HTTP server
├── package.json
└── tsconfig.json
```

## 4. Frontend Folder Structure

The frontend uses React Native CLI with a TypeScript template (`.ts` and `.tsx` extensions). It includes native directories for Android and configuration for Web.

```text
client/
├── android/              # Native Android project files
├── web/                  # Web-specific entry points and configurations (React Native Web)
├── src/
│   ├── assets/           # Static assets (images, fonts)
│   ├── components/       # Reusable UI components (Buttons, Inputs, Cards)
│   ├── navigation/       # React Navigation configuration and routers
│   ├── screens/          # Full-screen application views
│   │   ├── UnifiedInventory/ # Unified UI: Combined Inventory and Packages tab
│   │   ├── Dashboard/    # Main overview screen
│   │   ├── QRScanner/    # QR code scanning interface
│   │   └── Auth/         # Login and authentication screens
│   ├── services/         # API integration layer (Axios/fetch wrappers)
│   ├── store/            # Global state management
│   ├── types/            # Shared TypeScript type definitions
│   ├── utils/            # Helper functions and constants
│   └── App.tsx           # Main application root component
├── index.js              # React Native entry point (registers App.tsx)
├── package.json
├── tsconfig.json
├── metro.config.js       # Metro bundler configuration
└── react-native.config.js# React Native CLI configuration
```

## 5. Design Patterns

- **Repository Pattern (Backend)**: All database interactions are encapsulated within Repositories. Controllers call Services, and Services call Repositories. Repositories execute raw SQL using parameterized queries via `mysql2`.
- **Service Layer (Backend)**: Business logic is decoupled from HTTP concerns. Services handle the "how" and "why" of operations, keeping Controllers thin and focused purely on request/response lifecycle.
- **Unified UI (Frontend)**: To streamline the user experience, the frontend features a unified Inventory/Packages tab. This combined interface reduces navigation friction and provides a holistic view of resources in a single screen.
- **Component-Based Architecture (Frontend)**: The UI is broken down into small, highly cohesive, and loosely coupled React components.

## 6. Security Architecture

- **Authentication**: Stateless authentication using JSON Web Tokens (JWT). Tokens are verified via a custom Express middleware on protected routes.
- **SQL Injection Prevention**: Strict enforcement of parameterized queries in the Repository layer via `mysql2`. No raw string concatenation is permitted for SQL queries.
- **Input Validation**: All incoming API payloads are validated using a validation schema library (e.g., Zod) before reaching the Service layer.
- **CORS & Headers**: Express is configured with Helmet for secure HTTP headers and CORS to restrict API access to known client origins (especially relevant for the web build).
- **Secrets Management**: Credentials, database URLs, and JWT secrets are managed via `.env` files and are never committed to version control.

## 7. Deployment Architecture

- **Backend (API)**: Containerized using Docker. Deployed to a cloud environment (e.g., AWS ECS, DigitalOcean App Platform, or a VPS) behind a reverse proxy (Nginx) and a load balancer.
- **Database**: A managed MariaDB instance (e.g., AWS RDS) or a persistently volume-backed Docker container with regular automated backups.
- **Frontend (Android)**: Compiled into an `.apk` or `.aab` file via React Native CLI and distributed directly to users or deployed via the Google Play Store.
- **Frontend (Desktop/iOS)**: The React Native Web build is bundled into static files (HTML, CSS, JS) and hosted on a global Content Delivery Network (CDN) like Vercel, Netlify, or AWS CloudFront for high availability and low latency access across Desktop and iOS browsers.
