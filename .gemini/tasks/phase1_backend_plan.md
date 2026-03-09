# Phase 1 Implementation Plan - Backend (ElysiaJS + Bun)

## 🎯 Goal
Implement the core Room and Game lifecycle logic, including real-time communication via WebSockets, persistent identities using `deviceId`, and integration with MongoDB. Ensure all endpoints and WebSocket payloads are strongly typed using Elysia schemas for Eden Treaty consumption by the frontend.

## 🏗️ Architecture & Naming Strategy
*   **Roles:** Distinct separation between Room Lifecycle and Game Lifecycle.
    *   `admin`: Room creator. Manages the room (kick players, start game, end round, transfer admin).
    *   `host`: In-game role (formerly "Master"). Knows the secret word and answers Yes/No questions.
    *   Other In-game Roles: `insider`, `common`.
*   **Identity:** Rely on a client-generated `deviceId` (UUID) for player identification instead of formal user accounts.
*   **Disconnections:**
    *   Explicit Leave (Browser Close): Handled via a REST endpoint called during `beforeunload`.
    *   Implicit Leave (Screen Shutdown): Handled by WebSocket disconnects. Players are marked `isOnline: false` but kept in the room. They can reconnect and resume if they use the same `deviceId`.
*   **Type Safety:** Leverage `@elysiajs/eden` for end-to-end type safety without code generation.

## 🚀 Implementation Steps

### 1. Project Setup & Configuration
1.  Initialize the ElysiaJS project in the `service/` directory using Bun (`bun create elysia .`).
2.  Install necessary dependencies: `mongoose`, `@elysiajs/cors`, `@elysiajs/swagger` (for documentation), and any testing libraries (`bun test` is built-in).
3.  Configure MongoDB connection using Mongoose in `src/lib/db.ts`.

### 2. Data Models (Mongoose & Elysia Schemas)
Define both Mongoose schemas for MongoDB persistence and Elysia `t` schemas for API validation and Eden type generation.

*   **Player Model:**
    *   Properties: `id` (string), `name` (string), `deviceId` (string), `isAdmin` (boolean), `isOnline` (boolean), `inGameRole` ('host' | 'insider' | 'common' | null).
*   **Room Model:**
    *   Properties: `roomId` (string), `status` ('lobby' | 'playing'), `secretWord` (string), `players` (Array of Player).
    *   *Note: For Phase 1, updating the room document in MongoDB on every state change is acceptable. If performance becomes an issue, consider an in-memory Bun Map with periodic DB syncs.*
*   **Word Bank Model (Optional for Phase 1 MVP):**
    *   A simple collection of Thai noun words. Alternatively, hardcode an array of words for initial testing.

### 3. REST Endpoints (Entry/Exit)
Implement routes in `src/controllers/room-controller.ts`. Ensure all body, params, and response types are defined using Elysia's `t`.

*   `POST /rooms`: Creates a new room. Returns `roomId`. Sets the creator as the `admin`.
*   `POST /rooms/:roomId/join`: 
    *   Accepts `name` and `deviceId`.
    *   If room is full and player isn't reconnecting, reject.
    *   If player reconnects (matching `deviceId`), update `isOnline: true` and return current state.
    *   If new player, add to room.
*   `POST /rooms/:roomId/leave`: 
    *   Accepts `deviceId`.
    *   Explicit leave triggered by the frontend's `beforeunload` event. Removes player from the room immediately.

### 4. WebSocket Router (`/ws/rooms/:roomId`)
Implement WebSocket logic in `src/controllers/ws-controller.ts`. 
*   **Authentication:** The WS connection should authenticate using the `deviceId` (e.g., passed as a query parameter).
*   **Inbound Events (Client -> Server):**
    *   `start_game`: (Admin only) Randomly picks a word from the Word Bank. Uses a secure shuffle (like Fisher-Yates) to randomly assign `host`, `insider`, and `common` roles to players. Updates room status to `playing`. Broadcasts `game_started` event.
    *   `kick_player`: (Admin only) Accepts `targetPlayerId`. Removes them from the room and broadcasts `player_kicked`.
    *   `end_round`: (Admin only) Resets room to `lobby` status, clears in-game roles. Broadcasts `round_ended`.
    *   `transfer_admin`: (Admin only) Accepts `targetPlayerId`. Swaps the `isAdmin` flag between the current admin and the target player.
*   **Outbound Events (Server -> Client):**
    *   `room_state_update`: Broadcasted on any state change (player joined, left, kicked, online status changed).
    *   `game_started`: Broadcasted when the admin starts the game. Contains private role information for specific players.
*   **Disconnect Logic:** On WS disconnect, mark the player's `isOnline` status to `false` and broadcast a `room_state_update`. Do not remove them from the room immediately (allow for reconnection).

### 5. Eden Type Export
Ensure the main Elysia app router is exported as a type at the end of `src/index.ts` so the frontend can consume it for type safety.

```typescript
// src/index.ts
import { Elysia } from 'elysia';
import { roomRoutes } from './controllers/room-controller';
import { wsRoutes } from './controllers/ws-controller';

const app = new Elysia()
    .use(roomRoutes)
    .use(wsRoutes)
    .listen(process.env.PORT || 8080);

export type AppRouter = typeof app;
```
