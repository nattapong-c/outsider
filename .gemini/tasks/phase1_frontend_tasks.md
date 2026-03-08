# Phase 1: Core Game Loop (MVP) - Frontend Development Tasks

## 🎯 Goal
Develop the user interface and client-side logic to support game creation, joining, player display, and the interactive quiz phase, adhering to the Pixel Art theme and minimal, clean, easy-to-use aesthetic.

## 📝 Tasks

### 1. Project Setup & Core Infrastructure
*   **TASK:** Initialize Next.js project within `app/`.
    *   **Sub-tasks:**
        *   `npx create-next-app@latest --ts --tailwind --app --src-dir .` (or equivalent for App Router with TypeScript and TailwindCSS).
        *   Configure `tsconfig.json` and `tailwind.config.ts`.
        *   Install core dependencies (React, Next.js, TailwindCSS).
        *   Create basic `app/layout.tsx` and `app/page.tsx` for initial setup.
*   **TASK:** Configure basic Pixel Art theme in TailwindCSS.
    *   **Sub-tasks:**
        *   Select pixel art-friendly fonts (e.g., from Google Fonts).
        *   Define a limited color palette.
        *   Create utility classes or components for pixelated borders, shadows, etc.

### 2. API Client & WebSocket Integration
*   **TASK:** Create API Client for Backend REST Endpoints.
    *   **Sub-tasks:**
        *   Create `app/src/lib/api.ts` for making `fetch` requests to the ElysiaJS backend.
        *   Define types for API request/response payloads (e.g., `IGameSession`, `IPlayer`).
*   **TASK:** Implement `useWebSocket` Custom Hook.
    *   **Sub-tasks:**
        *   Create `app/src/hooks/useWebSocket.ts`.
        *   Handle WebSocket connection, message sending, and event listening.
        *   Manage connection state (connecting, connected, disconnected).

### 3. Lobby/Game List UI
*   **TASK:** Develop `LobbyPage` Component.
    *   **Sub-tasks:**
        *   Create `app/page.tsx` for the lobby view.
        *   Fetch and display a list of active game sessions using the API client.
        *   Design game cards for each session, adhering to Pixel Art theme.
*   **TASK:** Implement `Create Game` Form/Button.
    *   **Sub-tasks:**
        *   Add a button to initiate game creation.
        *   Integrate with `POST /games` backend endpoint.
        *   On success, navigate to the new game session page.
*   **TASK:** Implement `Join Game` Form.
    *   **Sub-tasks:**
        *   Create an input field for `gameId`.
        *   Add a button to join the game.
        *   Integrate with `POST /games/:id/join` backend endpoint.
        *   On success, navigate to the game session page.
        *   Display error messages for invalid `gameId` or full games.
*   **TASK:** Implement Player Name Input.
    *   **Sub-tasks:**
        *   Create a UI component (e.g., modal or input field) for players to enter their desired name.
        *   Store the name locally (e.g., in `localStorage` or React context) before joining/creating a game.
        *   Pass the player name to the backend when calling `Create Game` or `Join Game` APIs.

### 4. Game Session UI
*   **TASK:** Develop `GameSessionPage` Component.
    *   **Sub-tasks:**
        *   Create `app/[gameId]/page.tsx` for dynamic game sessions.
        *   Utilize `useGameSession` hook to fetch and manage game state.
        *   Connect to WebSocket using `useWebSocket` hook.
        *   Display current game phase (e.g., "Waiting for Players", "Quiz Phase").
        *   Display an in-game timer, styled in Pixel Art.
*   **TASK:** Develop `PlayerList` Component.
    *   **Sub-tasks:**
        *   Create `app/src/components/PlayerList.tsx`.
        *   Display names and status of players in the game, highlighting the current player.
        *   Ensure player roles (Host, Insider, Common) are displayed privately.
*   **TASK:** Display Secret Word & Role.
    *   **Sub-tasks:**
        *   Conditionally render the secret word for Host and Insider only.
        *   For the Host, ensure the UI provides options to select a Thai noun word (if manual selection is needed).
        *   Display assigned role privately to each player.

### 5. Quiz Phase UI
*   **TASK:** Develop `QuestionInput` Component.
    *   **Sub-tasks:**
        *   Create `app/src/components/QuestionInput.tsx`.
        *   Textarea for entering questions.
        *   "Ask Question" button, sending `ask_question` WebSocket event.
        *   Disable for Host.
*   **TASK:** Develop `HostAnswerInterface` Component.
    *   **Sub-tasks:**
        *   Create `app/src/components/HostAnswerInterface.tsx`.
        *   Display "Yes" and "No" buttons for the Host.
        *   Send `answer_question` WebSocket event.
        *   Only visible to the Host.
*   **TASK:** Develop `ChatInterface` Component.
    *   **Sub-tasks:**
        *   Create `app/src/components/ChatInterface.tsx`.
        *   Display a scrollable list of questions and answers.
        *   Receive `question_asked` and `answer_provided` WebSocket events to update the chat.
        *   Style chat bubbles and messages in Pixel Art.

### 6. UI/UX Refinement & Error Handling
*   **TASK:** Apply Pixel Art Theme consistently.
    *   **Sub-tasks:**
        *   Ensure all UI elements (buttons, inputs, text, backgrounds) conform to the Pixel Art aesthetic.
        *   Verify fonts are pixel-art friendly.
        *   Implement minimal, clean layouts for all components.
*   **TASK:** Implement Error Display.
    *   **Sub-tasks:**
        *   Display user-friendly error messages for API failures, WebSocket disconnections, and game logic errors (e.g., game full).
        *   Style error messages to fit the theme.
