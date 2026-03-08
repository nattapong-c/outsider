# Phase 1: Core Game Loop (MVP) - Backend Development Tasks

## 🎯 Goal
Implement the foundational backend logic for game session management, the quiz phase, real-time communication, and basic data persistence.

## 📝 Tasks

### 1. Project Setup & Core Infrastructure
*   **TASK:** Initialize ElysiaJS project within `service/`.
    *   **Sub-tasks:**
        *   `bun init` or equivalent for ElysiaJS project structure.
        *   Configure `tsconfig.json` for TypeScript.
        *   Install core dependencies (ElysiaJS, Mongoose, Bun).
        *   Create basic `src/index.ts` entry point.
*   **TASK:** Configure MongoDB Connection.
    *   **Sub-tasks:**
        *   Install Mongoose.
        *   Create `service/src/lib/db.ts` for MongoDB connection logic.
        *   Integrate DB connection into `src/index.ts`.
        *   Add environment variable for MongoDB URI.

### 2. Game Data Models & Services
*   **TASK:** Define `Game` and `Player` Mongoose Schemas/Models.
    *   **Sub-tasks:**
        *   Create `service/src/models/Game.ts` with schema for game ID, players array, secret word, status, current phase, Q&A history, timestamps.
        *   Define `Player` sub-schema with ID, **name (string)**, role.
        *   Implement validation for schema fields.
*   **TASK:** Implement Word Bank Management.
    *   **Sub-tasks:**
        *   Create `service/src/services/WordService.ts`.
        *   Implement function to load a predefined list of **Thai noun words** (e.g., from a JSON file or directly in code for MVP).
        *   Implement function to randomly select a Thai noun word.

### 3. Game Session Management API (REST)
*   **TASK:** Implement `Create Game` API Endpoint.
    *   **Sub-tasks:**
        *   Create `service/src/controllers/GameController.ts`.
        *   Define `POST /games` endpoint in ElysiaJS.
        *   Accept player name as part of the request.
        *   Generate unique `gameId` upon creation.
        *   Persist initial game state (status: 'waiting', host player **with name**) in MongoDB.
        *   Return `gameId` to the client.
*   **TASK:** Implement `Join Game` API Endpoint.
    *   **Sub-tasks:**
        *   Define `POST /games/:id/join` endpoint.
        *   Accept player name as part of the request.
        *   Validate `gameId` existence and game status ('waiting').
        *   Validate player count (4-8 players).
        *   Add new player (with **name**) to the game session in MongoDB.
        *   Return updated game state.

### 4. Real-time Communication (WebSockets)
*   **TASK:** Setup WebSocket Server for Game Sessions.
    *   **Sub-tasks:**
        *   Integrate ElysiaJS WebSocket plugin.
        *   Handle `connection` and `disconnection` events for players.
        *   Implement a mechanism to track connected players per game session.
*   **TASK:** Implement `Game State Broadcasts`.
    *   **Sub-tasks:**
        *   Create a `service/src/services/WebSocketService.ts` for broadcasting logic.
        *   Implement a function to broadcast current game state to all players in a specific game.
        *   Trigger broadcasts on significant game state changes (player join, role assignment, phase change, Q&A update).

### 5. Game Logic - Core Quiz Phase
*   **TASK:** Implement Player/Role Assignment Logic.
    *   **Sub-tasks:**
        *   Create `service/src/services/GameLogicService.ts`.
        *   Implement function to randomly assign one Host, one Insider, and remaining Commons roles.
        *   Persist assigned roles in the `Game` document.
*   **TASK:** Implement Secret Word Selection Logic.
    *   **Sub-tasks:**
        *   Integrate `WordService` to select a Thai noun word.
        *   Store the secret word in the `Game` document, only visible to Host and Insider.
*   **TASK:** Implement Quiz Phase Timer Management.
    *   **Sub-tasks:**
        *   Implement server-side timer (e.g., using `setInterval` or similar).
        *   Broadcast remaining time periodically.
        *   Handle timer expiration: update game status, determine Insider win, broadcast game end.

### 6. Quiz Phase - Question & Answer Handling
*   **TASK:** Implement `ask_question` WebSocket Event Handler.
    *   **Sub-tasks:**
        *   Receive player questions.
        *   Validate question format/length.
        *   Store question in game session history.
        *   Broadcast `question_asked` event to all players.
*   **TASK:** Implement `answer_question` WebSocket Event Handler.
    *   **Sub-tasks:**
        *   Receive Host's "Yes/No" answer.
        *   Validate that only the Host can answer.
        *   Store answer in game session history.
        *   Broadcast `answer_provided` event to all players.

### 7. Error Handling & Validation
*   **TASK:** Implement Global Error Handling Middleware for ElysiaJS.
    *   **Sub-tasks:**
        *   Catch custom application errors (`CustomAppError`) and standard errors.
        *   Return appropriate HTTP status codes and error messages.
*   **TASK:** Implement Input Validation for API and WebSocket Payloads.
    *   **Sub-tasks:**
        *   Use Elysia's validation capabilities (e.g., Zod schemas) for incoming requests (create/join game, questions, answers).
        *   Return clear error messages for invalid inputs.