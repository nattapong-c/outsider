# Phase 1: Core Game Loop (MVP) - Backend

## 🎯 Goal
Implement the foundational backend logic for room management, game session lifecycle, the quiz phase, real-time communication, and basic data persistence.

## 🚀 Features

### 1. Room & Game Session Management
*   **Create Room:**
    *   A player creates a new room and becomes the room **admin**.
    *   Generate a unique room ID.
    *   Store initial room state in MongoDB (status: 'lobby', empty player list, `timerConfig`: { quiz: 180, discussion: 180, autoTransition: true } representing 3 minutes default).
*   **Join/Reconnect Room:**
    *   Players join a room using the room ID and a client-generated `deviceId`.
    *   If `deviceId` matches an existing player, reconnect them (mark `isOnline: true`).
    *   Otherwise, add as a new player, including their chosen name.
    *   Validate max players (4-8).
*   **Room Admin Controls:**
    *   **Update Timer Config:** Admin can update the timer duration for both the Quiz and Discussion phases while in the lobby.
    *   **Start Game:** Admin initiates the game and **must explicitly select** which player will be the `host` (the player who answers questions). The backend randomly picks a word from a predefined list of **Thai noun words** and randomly assigns the remaining in-game roles (`insider`, `common`) to the other players. Status changes to 'playing'.
    *   **Kick Player:** Admin can remove a player from the room.
    *   **Admin Role:** The admin role cannot be manually transferred to another player. It is automatically reassigned only if the current admin leaves the room.
    *   **End Round:** Admin can force-end the current game, resetting the room to 'lobby' status and clearing in-game roles so a new round can begin.
*   **Leave Room & Disconnections:**
    *   **Explicit Leave:** Player explicitly leaves or closes browser (`beforeunload` REST call). Remove player from room entirely.
    *   **Implicit Leave:** Screen shuts down or network drops (WebSocket disconnect). Mark player as `isOnline: false` but keep them in the room for a grace period, allowing seamless reconnection.

### 2. Quiz Phase Logic
*   **Timer Management:**
    *   Start a timer based on the room's `timerConfig` for the quiz phase (default 3 minutes) when the game starts.
    *   Broadcast remaining time to all players.
    *   Handle timer expiration: Depending on `timerConfig.autoTransition`, either automatically transition to the discussion phase or wait for the host to manually transition.
*   **Question/Answer Handling:**
    *   Receive player questions via WebSocket.
    *   Validate questions (e.g., not too long, appropriate format).
    *   The **host** (in-game role, not admin) provides "Yes/No" answers.
    *   Store questions and answers in room history.

### 3. Real-time Communication (WebSockets)
*   **Room/Game State Broadcasts:**
    *   Broadcast current state (players, roles, phase, timer, question/answer history) on any state change.
*   **Event Handling:**
    *   Handle admin actions (`start_game`, `kick_player`, `end_round`, `transfer_admin`).
    *   Handle game actions (`ask_question`, `answer_question`).

### 4. Basic Data Persistence (MongoDB)
*   **Rooms:**
    *   Schema for `Room` collection (roomId, players (with `deviceId`, `isAdmin`, `isOnline`, `inGameRole`), secret word, status, Q&A history).
*   **Word Bank:**
    *   Basic storage for words/themes used in the game.

## 🛠 Technical Considerations
*   **ElysiaJS:** Define controllers for REST (create/join/leave) and WebSocket handlers (`/ws/rooms/:roomId`) authenticated via `deviceId`.
*   **Type Safety (Eden Treaty):** Ensure all models, REST endpoints, and WebSocket payloads use Elysia `t` schemas to export a fully typed `AppRouter` for the frontend.
*   **Mongoose:** Setup schemas and models for `Room`. Avoid complex transactions; full document updates are acceptable for Phase 1 MVP.
*   **Bun:** Utilize Bun's runtime for server execution.