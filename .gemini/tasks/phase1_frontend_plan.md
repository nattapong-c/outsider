# Phase 1 Implementation Plan - Frontend (Next.js App Router)

## 🎯 Goal
Develop the user interface for the Lobby and Game views, implement robust reconnection logic handling both browser closes and screen timeouts, and integrate Elysia's Eden client for end-to-end type safety. The UI must strictly adhere to the defined Pixel Art theme.

## 🏗️ Architecture & Strategy
*   **Identity Management:** Use a persistent `deviceId` stored in `localStorage` to identify users across sessions and reloads without requiring formal accounts.
*   **Eden Treaty:** Utilize `@elysiajs/eden` to consume backend types, providing full intellisense for REST calls and WebSocket payloads.
*   **Vercel & WebSockets:** Remember that the Next.js frontend is hosted on Vercel, but the WebSocket connections must point directly to the backend service (hosted on Render), as Vercel serverless functions do not support persistent WebSockets.

## 🚀 Implementation Steps

### [x] 1. Project Setup & Core Hooks
1.  Initialize the Next.js project in the `app/` directory (`npx create-next-app@latest`). Ensure TypeScript and TailwindCSS are configured.
2.  Install dependencies: `@elysiajs/eden`.
3.  **Eden Client Setup (`src/lib/api.ts`):** Initialize the Eden Treaty client pointing to the backend URL on port 3001.
4.  **`useDeviceId` Hook (`src/hooks/useDeviceId.ts`):** 
    *   Checks `localStorage` for a `deviceId`.
    *   If missing, generates a new UUID (`crypto.randomUUID()`) and saves it.

### [x] 2. Disconnect & Reconnection Logic
Implement robust handling for different types of disconnects.
*   **Explicit Leave (Via Button):** Implemented an explicit "LEAVE" button that hits `POST /leave`.
*   **Implicit Reconnect (Screen Timeout/Network Drop/Refresh):** Added auto-reconnect logic on component mount using `GET /rooms/:roomId` to bypass the nickname screen if the user is already in the room.

### [x] 3. The Lobby View (`/app/[roomId]/page.tsx`) & Home (`/app/page.tsx`)
*   **Home View:** Present a "Create New Room" button and a "Join Room" input field to enter a 6-character room ID.
*   **Join Flow:** Present a modal asking for a "Nickname" before the user can fully connect to the room.
*   **Player List UI:**
    *   Display all players currently in the room.
    *   Visually distinguish the `admin` (e.g., with a Crown icon).
    *   Visually indicate offline players.
*   **Admin Controls:** Render the following controls *only* if the current user's `deviceId` matches the room's admin `deviceId`:
    *   "Start Game" button.
    *   "Kick" buttons next to other players.
    *   Redirect kicked players to the home page automatically.

### [x] 4. Game View
*   **State Transition:** When the WebSocket receives a `room_state_update` indicating `status === 'playing'`, transition the UI from the Lobby View to the Game View.
*   **Role Display:** Privately display the assigned role (`host`, `insider`, `common`) to the user.
*   **Host UI:** If the user is the `host`, clearly display the secret word. (Question answering UI pending in further phases).
*   **Admin Persistent Controls:** The `admin` retains an "End Round" button to force-reset the game to the lobby state at any time.

### [x] 5. UI/UX & Theming
*   Strictly adhere to the Pixel Art theme defined in `GEMINI.md`.
*   Integrated custom CSS for `pixel-text` and setup basic theme colors in `globals.css`.
