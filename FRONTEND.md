# FRONTEND.md - Project "Outsider" Frontend Documentation

## 🎯 Overview
This document outlines the frontend architecture, technologies, and key conventions for the **Outsider** application. The frontend is responsible for the user interface and interaction with the backend game services.

## 🛠 Technology Stack
*   **Framework:** Next.js (App Router)
*   **Language:** TypeScript
*   **UI Library:** React
*   **Styling:** TailwindCSS
*   **Package Manager/Runtime:** Bun (for development and build)

## ✍️ Naming Convention Guidelines (TypeScript Best Practices)
Adhering to consistent naming conventions improves code readability and maintainability.

*   **Variables, Functions, Properties, Method Names**: Use `camelCase`.
    *   Examples: `userName`, `gameSessionId`, `handlePlayerClick`, `useGameState`
*   **Components, Classes, Interfaces, Types (Type Aliases)**: Use `PascalCase`.
    *   Examples: `GameCard`, `PlayerList`, `IGameState`, `WebSocketMessage`, `GamePage`
*   **Enums and Enum Members**: Use `PascalCase` for the enum name and `PascalCase` for its members.
    *   Examples: `GameStatus.InProgress`, `PlayerRole.Insider`
*   **Constants (Global/Module-Level)**: Use `UPPER_SNAKE_CASE`.
    *   Examples: `MAX_PLAYERS_PER_GAME`, `API_BASE_URL`
*   **Filenames**: Use `kebab-case` for most files (e.g., `game-card.tsx`, `use-game-state.ts`). For files exclusively exporting a single `PascalCase` component or interface, `PascalCase` filename is also acceptable (e.g., `PlayerList.tsx`).
*   **Private/Protected Members**: Prefix with an underscore `_` (less common in React function components, more for classes or utility functions).
    *   Examples: `_internalState`, `_formatPlayerName`

## 💡 Code Style Examples

### Interfaces & Types
Interfaces and type aliases define data structures, ensuring type safety across the application.
```typescript
interface IGameSession {
  id: string;
  secretWordHidden: boolean; // Frontend might only know if it's hidden
  status: 'waiting' | 'in_progress' | 'completed';
  players: IPlayer[];
  timerRemaining: number; // Time left for current phase
}

interface IPlayer {
  id: string;
  name: string;
  role: 'unknown' | 'host' | 'insider' | 'common'; // Frontend might initially not know roles
  isCurrentPlayer: boolean;
  hasGuessed: boolean;
}

type PlayerRole = 'host' | 'insider' | 'common'; // For backend-provided roles
type GameStatus = 'waiting' | 'in_progress' | 'completed';
```

### React Components (Functional)
Prefer functional components with hooks.
```typescript
import React, { useState, useEffect } from 'react';

interface GameCardProps {
  gameId: string;
  status: GameStatus;
  playerCount: number;
  onJoinGame: (id: string) => void;
}

const GameCard: React.FC<GameCardProps> = ({ gameId, status, playerCount, onJoinGame }) => {
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinClick = () => {
    setIsJoining(true);
    onJoinGame(gameId);
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md">
      <h3 className="text-xl font-bold">Game #{gameId.substring(0, 4)}</h3>
      <p>Status: {status}</p>
      <p>Players: {playerCount}</p>
      <button
        onClick={handleJoinClick}
        disabled={isJoining || status === 'in_progress'}
        className="mt-2 px-4 py-2 bg-blue-600 rounded disabled:opacity-50"
      >
        {isJoining ? 'Joining...' : 'Join Game'}
      </button>
    </div>
  );
};

export default GameCard;
```

### Custom Hooks
Encapsulate reusable logic, especially for stateful operations or API interactions.
```typescript
import { useState, useEffect, useCallback } from 'react';
import { IGameSession } from '../types'; // Assuming types are in a shared location

const useGameSession = (gameId: string) => {
  const [game, setGame] = useState<IGameSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGame = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // In a real app, this would be an API call
      const response = await fetch(`/api/games/${gameId}`);
      if (!response.ok) {
        throw new Error(`Error fetching game: ${response.statusText}`);
      }
      const data: IGameSession = await response.json();
      setGame(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load game.');
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchGame();
    // Potentially set up WebSocket listener here for real-time updates
    // return () => { /* cleanup WebSocket */ };
  }, [fetchGame]);

  return { game, isLoading, error, refetchGame: fetchGame };
};

export default useGameSession;
```

### Error Handling in UI
Handle errors gracefully, providing user feedback.
```typescript
// Example within a component
import { useRouter } from 'next/router'; // Assuming Next.js router

const GamePage: React.FC = () => {
  const router = useRouter();
  const { gameId } = router.query;
  const { game, isLoading, error } = useGameSession(gameId as string);

  if (isLoading) {
    return <p>Loading game...</p>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}. Please try again later.</div>;
  }

  if (!game) {
    return <p>Game not found.</p>;
  }

  return (
    <div>
      <h1>Welcome to Game: {game.id}</h1>
      {/* Render game UI */}
    </div>
  );
};


## 📂 Project Structure
(Refer to `GEMINI.md` for high-level structure. This section will detail specific frontend directories.)

### `app/src/app/` (Next.js App Router)
*   **`[gameId]/page.tsx`**: Dynamic routes for individual game sessions.
*   **`layout.tsx`**: Root layout for the application.
*   **`page.tsx`**: Landing page or entry point.

### `app/src/components/`
*   **Atomic Design Principles**: Components are organized into atomic levels (e.g., atoms, molecules, organisms, templates, pages).
*   **Reusable UI Elements**: Buttons, input fields, modals, game cards, etc.

### `app/src/hooks/`
*   **Custom React Hooks**: For encapsulating reusable stateful logic.
*   **Game State Management**: Hooks for interacting with global game state.
*   **Socket Communication**: Hooks for WebSocket connections (e.g., `useWebSocket`).

### `app/src/lib/`
*   **Utility Functions**: Helper functions, formatters, validators.
*   **API Client Setup**: Configuration for interacting with the backend.

### `app/src/services/`
*   **Frontend Business Logic**: Functions that orchestrate API calls, manage local data, and handle complex UI-related logic.

### `app/src/types/`
*   **TypeScript Definitions**: Shared interfaces and types for frontend data structures, API payloads, and game entities.

## 🔄 State Management
*   (Specify chosen state management solution, e.g., Zustand, Redux, React Context)
*   Global game state, player state, UI state.

## 🌐 API Integration
*   **REST API**: For initial data loading, user authentication (if applicable).
*   **WebSockets (Socket.IO/ws)**: For real-time game updates and communication.
    *   (Document message formats, event names, and handling logic.)

## ✨ Styling Conventions
*   **TailwindCSS**: Utility-first CSS framework.
*   **Consistent Theming**: Define color palettes, typography, and spacing in `tailwind.config.ts`.
*   **Responsive Design**: Ensure optimal display across various screen sizes.

---
