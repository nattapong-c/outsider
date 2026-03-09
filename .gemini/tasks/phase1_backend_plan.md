# Phase 1 Implementation Plan - Backend (ElysiaJS + Bun)

## 🎯 Goal
Implement the core Room and Game lifecycle logic, including real-time communication via WebSockets, persistent identities using `deviceId`, and integration with MongoDB. Ensure all endpoints and WebSocket payloads are strongly typed using Elysia schemas for Eden Treaty consumption by the frontend.

## 🏗️ Architecture & Naming Strategy
*   **Roles:** Distinct separation between Room Lifecycle and Game Lifecycle.
    *   `admin`: Room creator. Manages the room (kick players, start game, end round). Note: Admin cannot be transferred.
    *   `host`: In-game role (formerly "Master"). Knows the secret word and answers Yes/No questions.
    *   Other In-game Roles: `insider`, `common`.
*   **Identity:** Rely on a client-generated `deviceId` (UUID) for player identification instead of formal user accounts.
*   **Disconnections:**
    *   Explicit Leave (Via LEAVE button): Handled via a REST endpoint. Removes player from the room immediately, and deletes the room if empty.
    *   Implicit Leave (Screen Shutdown / Tab Close): Handled by WebSocket disconnects. Players are marked `isOnline: false` but kept in the room. They can reconnect and resume if they use the same `deviceId`.
*   **Type Safety:** Leverage `@elysiajs/eden` for end-to-end type safety without code generation.
*   **Logging:** Use `pino` for structured logging.

## 🚀 Implementation Steps

### [x] 1. Project Setup & Configuration
1.  Initialize the ElysiaJS project in the `service/` directory using Bun.
2.  Install necessary dependencies: `mongoose`, `@elysiajs/cors`, `@elysiajs/swagger`, `pino`, `pino-pretty`.
3.  Configure MongoDB connection using Mongoose in `src/lib/db.ts` and set port to `3001`.

### [x] 2. Data Models (Mongoose & Elysia Schemas)
Define both Mongoose schemas for MongoDB persistence and Elysia `t` schemas for API validation and Eden type generation.
*   **Player Model & Room Model** implemented in `src/models/room.ts`.

### [x] 3. REST Endpoints (Entry/Exit)
Implement routes in `src/controllers/room-controller.ts`.
*   `POST /rooms`: Creates a new room. Returns `roomId`. Sets the creator as the `admin`.
*   `GET /rooms/:roomId`: Fetches room state for auto-reconnection logic.
*   `POST /rooms/:roomId/join`: Handles joining/reconnecting players.
*   `POST /rooms/:roomId/leave`: Explicit leave. Reassigns admin if needed, or deletes the room if the player list becomes empty.

### [x] 4. WebSocket Router (`/ws/rooms/:roomId`)
Implement WebSocket logic in `src/controllers/ws-controller.ts`. 
*   **Authentication:** Authenticates using `deviceId` query parameter.
*   **Inbound Events:** `start_game`, `kick_player`, `end_round`.
*   **Outbound Events:** Ensure all payloads are explicitly `JSON.stringify`'d.
*   **Disconnect Logic:** On WS disconnect, mark the player's `isOnline` status to `false` and always broadcast a `room_state_update` so other players see the update.

### [x] 5. Eden Type Export
Export `AppRouter` at the end of `src/index.ts` for frontend consumption.
