# BACKEND.md - Project "Outsider" Backend Documentation

## 🎯 Overview
This document details the backend architecture, services, and data models for the **Outsider** application. The backend is responsible for game logic, state management, real-time communication, and data persistence.

## 🛠 Technology Stack
*   **Framework:** ElysiaJS
*   **Runtime:** Bun
*   **Database:** MongoDB (via Mongoose ODM)
*   **Language:** TypeScript
*   **Real-time Communication:** WebSockets (built-in Elysia support)

## ✍️ Naming Convention Guidelines (TypeScript Best Practices)
Adhering to consistent naming conventions improves code readability and maintainability.

*   **Variables, Functions, Properties, Method Names**: Use `camelCase`.
    *   Examples: `userName`, `getGameSession`, `isValidPlayer`, `startGameRound`
*   **Classes, Interfaces, Types (Type Aliases)**: Use `PascalCase`.
    *   Examples: `GameSession`, `Player`, `IGameState`, `WebSocketMessage`
*   **Enums and Enum Members**: Use `PascalCase` for the enum name and `PascalCase` for its members.
    *   Examples: `GameStatus.InProgress`, `PlayerRole.Insider`
*   **Constants (Global/Module-Level)**: Use `UPPER_SNAKE_CASE`.
    *   Examples: `DEFAULT_PORT`, `MAX_PLAYERS_PER_GAME`, `DB_CONNECTION_STRING`
*   **Filenames**: Use `kebab-case` for most files (e.g., `user-controller.ts`, `game-service.ts`). For files exclusively exporting a single `PascalCase` class or interface, `PascalCase` filename is also acceptable (e.g., `GameSession.ts`) but `kebab-case` is generally preferred for consistency.
*   **Private/Protected Members**: Prefix with an underscore `_`.
    *   Examples: `_privateField`, `_calculateScore`

## 💡 Code Style Examples

### Interfaces
Interfaces define the shape of an object, promoting strong typing and clear contracts.
```typescript
interface IGameSession {
  id: string;
  secretWord: string;
  status: 'waiting' | 'in_progress' | 'completed';
  players: IPlayer[];
  createdAt: Date;
  updatedAt: Date;
}

interface IPlayer {
  id: string;
  name: string;
  role: PlayerRole; // Using a type alias here
  score: number;
}
```

### Classes
Classes encapsulate data and behavior. Follow naming conventions for class names, properties, and methods.
```typescript
class GameService {
  private _gameSessions: Map<string, IGameSession> = new Map(); // Private member example

  constructor() {
    // Initialization logic
  }

  public createNewGame(hostId: string): IGameSession {
    const newGame: IGameSession = {
      id: crypto.randomUUID(), // Example of a UUID generator
      secretWord: '', // Set by host later
      status: 'waiting',
      players: [{ id: hostId, role: 'host', name: 'Host Player' }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this._gameSessions.set(newGame.id, newGame);
    return newGame;
  }

  public getGameSession(gameId: string): IGameSession | undefined {
    return this._gameSessions.get(gameId);
  }

  private _validatePlayer(player: IPlayer): boolean { // Private method example
    // ... validation logic
    return true;
  }
}
```

### Type Aliases
Type aliases provide a way to define new names for types, enhancing readability.
```typescript
type PlayerRole = 'host' | 'insider' | 'common';
type GameStatus = 'waiting' | 'in_progress' | 'completed'; // Re-use in IGameSession
```

### Error Handling
Implement custom error classes for specific application errors to provide more context and structured error responses.
```typescript
class CustomAppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string; // A specific code for programmatic handling

  constructor(message: string, statusCode: number = 500, errorCode: string = 'SERVER_ERROR') {
    super(message);
    this.name = 'CustomAppError'; // Good practice for custom errors
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Object.setPrototypeOf(this, CustomAppError.prototype); // Ensures proper prototype chain for 'instanceof'
  }
}

// Example usage in a service or controller
function joinGame(gameId: string, playerId: string) {
  const game = new GameService().getGameSession(gameId); // Assuming GameService instance
  if (!game) {
    throw new CustomAppError(`Game with ID ${gameId} not found.`, 404, 'GAME_NOT_FOUND');
  }
  if (game.status !== 'waiting') {
    throw new CustomAppError(`Game ${gameId} is already in progress.`, 400, 'GAME_STARTED');
  }
  // ... rest of join logic
}

// Example of catching and handling in an ElysiaJS handler (or similar context)
// This would typically be handled by a global error middleware in Elysia
/*
app.onError(({ error, set }) => {
  if (error instanceof CustomAppError) {
    set.status = error.statusCode;
    return {
      error: {
        message: error.message,
        code: error.errorCode,
      },
    };
  }
  // Handle other unexpected errors
  set.status = 500;
  return {
    error: {
      message: 'An unexpected server error occurred.',
      code: 'UNEXPECTED_ERROR',
    },
  };
});
*/

## ✅ Testing Guidelines
Comprehensive testing is crucial for ensuring the reliability and correctness of the backend services.

### Frameworks & Tools
*   **Test Runner:** `Bun.test` (Bun's built-in test runner) is the primary choice. `Vitest` is also a strong alternative if more advanced features are required.
*   **Assertion Library:** `expect` (bundled with `Bun.test` and `Vitest`).
*   **HTTP Testing:** `Supertest` for testing ElysiaJS HTTP endpoints.
*   **Mocks:** Built-in mocking capabilities of `Bun.test` or `Vitest`.

### Types of Tests

#### 🧪 Unit Tests
*   **Focus:** Test individual functions, classes, or modules in isolation.
*   **Scope:** Ensure each unit of code behaves as expected under various inputs.
*   **Mocks:** Heavily utilize mocks and stubs for external dependencies (e.g., database calls, external APIs, other services) to prevent side effects and ensure tests are fast and reliable.
*   **Location:** Place unit tests in a `__tests__/unit` directory adjacent to the code they test, or in `*.test.ts` files within the same directory.

#### 🔗 Integration Tests
*   **Focus:** Verify the interaction and collaboration between multiple integrated units or components (e.g., a controller interacting with a service, or a service interacting with the database).
*   **Scope:** Ensure that components work correctly when combined.
*   **Environment:** May involve a test database (e.g., an in-memory MongoDB instance or a separate test database) and running a partial or full application context (e.g., an ElysiaJS instance).
*   **Location:** Place integration tests in a `__tests__/integration` directory.

#### 🚀 End-to-End (E2E) Tests
*   **Focus:** Test the entire system flow from start to finish, simulating real user interactions and system behavior.
*   **Scope:** Validate critical user journeys and overall application correctness.
*   **Tools:** Use `Supertest` to make HTTP requests to the running backend application. For WebSocket interactions, a custom client simulation might be necessary.
*   **Environment:** Requires a fully running backend application, potentially with a dedicated test database.
*   **Location:** Place E2E tests in a `__tests__/e2e` directory.

### Best Practices
*   **Clear Test Descriptions:** Use descriptive `describe` and `it`/`test` blocks to explain what each test suite and individual test case is verifying.
*   **Arrange-Act-Assert (AAA) Pattern:** Structure tests clearly:
    *   **Arrange:** Set up the test data, mocks, and environment.
    *   **Act:** Execute the code under test.
    *   **Assert:** Verify the outcome using assertions.
*   **Isolate Tests:** Each test should run independently of others. Avoid shared state between tests.
*   **Mock External Dependencies:** Prevent tests from relying on slow or unreliable external services.
*   **Test Coverage:** Aim for high test coverage, particularly for core business logic and critical paths.
*   **Cleanup:** Ensure tests clean up any created resources (e.g., database entries) after execution.
*   **Separate Test Database:** For integration and E2E tests involving the database, use a separate database instance to prevent data corruption in development or production environments.






## 📂 Project Structure
(Refer to `GEMINI.md` for high-level structure. This section will detail specific backend directories.)

### `service/src/controllers/`
*   **Route Handlers**: Define HTTP endpoints (REST).
*   **WebSocket Handlers**: Manage WebSocket connections and message processing.
*   Separation of concerns between request handling and business logic.

### `service/src/models/`
*   **Mongoose Schemas**: Define the structure and validation for MongoDB documents.
*   **Game State Model**: How game sessions, players, words, and roles are stored.
*   **User Model**: (If user authentication is implemented).

### `service/src/services/`
*   **Core Game Logic**: Encapsulates the rules and state transitions of the *Insider* game.
    *   Role distribution, secret word selection, timer management.
    *   Question/Answer validation, voting mechanisms.
*   **Utility Services**: Helper functions for game-related operations.

### `service/src/lib/`
*   **Database Connection**: Mongoose setup and connection pooling.
*   **Middlewares**: Custom Elysia middlewares (e.g., authentication, logging, error handling).
*   **Type Definitions**: Shared types for internal backend use.

### `service/src/index.ts`
*   **Elysia Entry Point**: Initializes the Elysia server, registers routes, WebSocket handlers, and connects to the database.

## 🚀 API Endpoints (REST & WebSockets)

### REST Endpoints (Example)
*   `POST /games`: Create a new game session.
*   `GET /games/:id`: Get details of a specific game.
*   `POST /games/:id/join`: Join a game session.

### WebSocket Events (Example)
*   **Client to Server:**
    *   `join_game`: Player joins a game.
    *   `ask_question`: Player submits a question to the Host.
    *   `answer_question`: Host submits a "Yes/No" answer.
    *   `vote`: Player casts a vote for the Insider.
*   **Server to Client:**
    *   `game_state_update`: Broadcasts current game state to all players.
    *   `player_joined`: Notifies when a new player joins.
    *   `question_asked`: Broadcasts a new question.
    *   `answer_provided`: Broadcasts the Host's answer.
    *   `voting_started`: Initiates the voting phase.
    *   `game_over`: Notifies game conclusion and results.

## 🗄 Database Schema (MongoDB)
*   **`Game` Collection**: Stores active game sessions.
    *   `_id` (Game ID)
    *   `players`: Array of player objects (ID, role, name, score)
    *   `secretWord`: The word for the current round
    *   `currentPhase`: (e.g., "quiz", "discussion", "voting")
    *   `timerStart`: Timestamp for current phase timer
    *   `questions`: Array of asked questions and answers
    *   `votes`: Voting results
    *   `status`: (e.g., "waiting", "in_progress", "completed")
*   **`User` Collection**: (If user authentication is implemented)
    *   `_id` (User ID)
    *   `username`
    *   `passwordHash`
    *   `email`

## 🔒 Authentication & Authorization
*   (Specify chosen method, e.g., JWT for REST, session tokens for WebSockets)
*   How players are authenticated to join games and perform actions.

---
