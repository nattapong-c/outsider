# Phase 1: Core Game Loop (MVP) - Frontend

## 🎯 Goal
Develop the user interface and client-side logic to support room creation, joining, lobby management, the interactive quiz phase, and robust reconnection.

## 🚀 Features

### 1. Identity & Connection Management
*   **Persistent Identity:**
    *   Generate a unique `deviceId` on first visit and store it in `localStorage`. Use this for all authentications instead of formal user accounts.
*   **Disconnection Handling:**
    *   **Explicit Leave:** Use the `beforeunload` event to send a REST API call to explicitly leave the room when the browser/tab is closed.
    *   **Implicit Reconnect:** Automatically re-establish WebSocket connections on screen wake/network restore, leveraging `deviceId` to resume gameplay.

### 2. Lobby & Room Management UI
*   **Create Room:**
    *   Button/form to initiate room creation. Navigate to new room lobby upon creation.
*   **Join Room:**
    *   Input field for room ID and player Nickname.
    *   Error handling for invalid/full rooms.
*   **Lobby Display:**
    *   Show list of players in the current room.
    *   Visually identify the room **admin** (e.g., crown icon).
    *   Visually indicate offline players (e.g., faded opacity for `isOnline === false`).
*   **Admin Controls (Visible only to admin):**
    *   **Timer Configuration:** UI to configure the timer duration (default 3 minutes) for both the Quiz phase and the Discussion phase, along with a toggle for "Auto-transition on time up". This should be adjustable before starting the game and between rounds.
    *   **Select Host:** Admin must select one player from the lobby to be the in-game `host` (the player who answers questions).
    *   "Start Game" button (enabled after a host is selected).
    *   "Kick" buttons next to other players.

### 3. Game Session UI
*   **Role & Word Display:**
    *   Privately display assigned in-game role (`host`, `insider`, `common`) for each player once the game starts.
    *   **Secret Word Visibility:** Privately display the secret word for the `host` and `insider`.
    *   **Insider Word Toggle:** For the `insider` specifically, the secret word should be hidden by default behind a toggle (e.g., an eye icon or "Tap to reveal" text). This prevents adjacent common players from glancing at the insider's screen and seeing the word. The host does not necessarily need this toggle, but it can be implemented universally for consistency.
*   **Game State Display:**
    *   Visual representation of current game phase.
    *   In-app timer showing remaining time for the quiz.
*   **Persistent Admin Controls:**
    *   The room admin retains an "End Round" button to force-reset the game back to the lobby state at any time.

### 4. Quiz Phase UI
*   **Question Input:**
    *   Text input field for players to ask questions.
    *   "Ask Question" button.
*   **Host Answer Interface:**
    *   For the **host**, "Yes" and "No" buttons to answer questions.
*   **Chat Interface:**
    *   Display all asked questions and Host's answers in a chronological chat-like format.
    *   Automatically update with new questions/answers via WebSockets.

### 5. Real-time Updates
*   **WebSocket Connection:**
    *   Maintain WebSocket connection to the backend via Render URL (Vercel serverless functions do not support persistent WebSockets).
    *   Update relevant UI components based on received state changes.

## 🛠 Technical Considerations
*   **Next.js (App Router):** Use dynamic routes for room sessions (`[roomId]/page.tsx`).
*   **Type Safety (Eden Treaty):** Use `@elysiajs/eden` to consume backend types (`AppRouter`) for fully typed REST API calls and WebSocket events.
*   **React Hooks:** `useDeviceId` for identity, custom hooks for game state and socket management.
*   **TailwindCSS:** Strictly adhere to the Pixel Art theme, ensuring all interactions and states (online/offline) are visually distinct within the aesthetic.