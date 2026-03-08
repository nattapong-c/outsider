# Phase 1: Core Game Loop (MVP) - Frontend

## 🎯 Goal
Develop the user interface and client-side logic to support game creation, joining, player display, and the interactive quiz phase.

## 🚀 Features

### 1. Lobby/Game List
*   **Game Listing:**
    *   Display a list of active game sessions (via REST API call to backend).
    *   Show basic game info (ID, number of players, status).
*   **Create Game:**
    *   Button/form to initiate game creation.
    *   Navigate to new game session page upon creation.
*   **Join Game:**
    *   Input field for game ID.
    *   Button to join an existing game.
    *   Error handling for invalid/full game IDs.

### 2. Game Session UI
*   **Player Name Assignment:**
    *   Allow players to input and set their desired name before joining or creating a game.
    *   Display player names in the game lobby and during gameplay.
*   **Player Display:**
    *   Show list of players in the current game.
    *   Highlight current player.
    *   Privately display assigned role (Host, Insider, Common) for each player.
    *   **Privately display the secret word for Host and Insider.** For the Host, this will involve selecting from a list of Thai noun words.
*   **Game State Display:**
    *   Visual representation of current game phase (e.g., "Waiting for Players", "Quiz Phase").
    *   In-app timer showing remaining time for the current phase.

### 3. Quiz Phase UI
*   **Question Input:**
    *   Text input field for players (Commons and Insider) to ask questions.
    *   "Ask Question" button.
*   **Host Answer Interface:**
    *   For the Host, "Yes" and "No" buttons to answer questions.
*   **Chat Interface:**
    *   Display all asked questions and Host's answers in a chronological chat-like format.
    *   Automatically update with new questions/answers via WebSockets.

### 4. Real-time Updates
*   **WebSocket Connection:**
    *   Establish and maintain WebSocket connection to the backend.
    *   Listen for `game_state_update`, `player_joined`, `question_asked`, `answer_provided` events.
    *   Update relevant UI components based on received events.

## 🛠 Technical Considerations
*   **Next.js (App Router):** Use dynamic routes for game sessions (`[gameId]/page.tsx`).
*   **React:** Functional components with Hooks for state management and UI logic.
*   **TypeScript:** Ensure strong typing for all frontend data structures and API interactions.
*   **TailwindCSS:** For styling all UI components, strictly adhering to the Pixel Art theme and minimal, clean design principles. This includes careful selection of fonts, colors, and component shapes to fit the aesthetic.
*   **Custom Hooks:** `useGameSession` for fetching/managing game state, `useWebSocket` for real-time communication.
*   **UI/UX:** Ensure all interactive elements (buttons, inputs) are visually distinct and consistent with the Pixel Art theme, while maintaining ease of use and clarity.
*   **Error Handling:** Graceful display of errors to the user (e.g., game not found, server disconnected) within the established visual theme.
