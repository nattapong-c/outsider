# Phase 1 Implementation Plan - Frontend (Next.js App Router)

## 🎯 Goal
Develop the user interface for the Lobby and Game views, implement robust reconnection logic handling both browser closes and screen timeouts, and integrate Elysia's Eden client for end-to-end type safety. The UI must strictly adhere to the defined Pixel Art theme.

## 🏗️ Architecture & Strategy
*   **Identity Management:** Use a persistent `deviceId` stored in `localStorage` to identify users across sessions and reloads without requiring formal accounts.
*   **Eden Treaty:** Utilize `@elysiajs/eden` to consume backend types, providing full intellisense for REST calls and WebSocket payloads.
*   **Vercel & WebSockets:** Remember that the Next.js frontend is hosted on Vercel, but the WebSocket connections must point directly to the backend service (hosted on Render), as Vercel serverless functions do not support persistent WebSockets.

## 🚀 Implementation Steps

### 1. Project Setup & Core Hooks
1.  Initialize the Next.js project in the `app/` directory (`npx create-next-app@latest`). Ensure TypeScript and TailwindCSS are configured.
2.  Install dependencies: `@elysiajs/eden`.
3.  **Eden Client Setup (`src/lib/api.ts`):** Initialize the Eden Treaty client pointing to the backend URL.
    ```typescript
    import { edenTreaty } from '@elysiajs/eden';
    import type { AppRouter } from '../../../service/src/index'; // Import type from backend
    
    export const api = edenTreaty<AppRouter>(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080');
    ```
4.  **`useDeviceId` Hook (`src/hooks/useDeviceId.ts`):** 
    *   Checks `localStorage` for a `deviceId`.
    *   If missing, generates a new UUID (`crypto.randomUUID()`) and saves it.
    *   Ensures this logic only runs on the client side (e.g., within `useEffect`).

### 2. Disconnect & Reconnection Logic
Implement robust handling for different types of disconnects.
*   **Explicit Leave (Browser/Tab Close):** Use the `beforeunload` event to send a synchronous or fire-and-forget REST call to explicitly leave the room.
    ```typescript
    useEffect(() => {
        const handleBeforeUnload = () => {
            // Fire-and-forget REST call
            api.rooms[roomId].leave.post({ deviceId }); 
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [roomId, deviceId]);
    ```
*   **Implicit Reconnect (Screen Timeout/Network Drop):** Handled automatically by the WebSocket connection logic. When the connection drops and is re-established, the backend will recognize the `deviceId` and update the player's status to `isOnline: true`.

### 3. The Lobby View (`/app/[roomId]/page.tsx`)
*   **Join Flow:** Present a modal asking for a "Nickname" before the user can fully connect to the room.
*   **Player List UI:**
    *   Display all players currently in the room.
    *   Visually distinguish the `admin` (e.g., with a Crown icon).
    *   Visually indicate offline players (e.g., grayed out or faded opacity for `isOnline === false`).
*   **Admin Controls:** Render the following controls *only* if the current user's `deviceId` matches the room's admin `deviceId`:
    *   "Start Game" button.
    *   "Kick" buttons next to other players.
    *   "Transfer Admin" button next to other players.

### 4. Game View
*   **State Transition:** When the WebSocket receives a `room_state_update` indicating `status === 'playing'`, transition the UI from the Lobby View to the Game View.
*   **Role Display:** Privately display the assigned role (`host`, `insider`, `common`) to the user.
*   **Host UI:** If the user is the `host`, clearly display the secret word and provide the UI controls for answering Yes/No questions (as defined in Phase 1 Core Game Loop).
*   **Admin Persistent Controls:** The `admin` (regardless of their in-game role) must have a persistent "End Round" button available to force-reset the game to the lobby state if necessary.

### 5. UI/UX & Theming
*   Strictly adhere to the Pixel Art theme defined in `GEMINI.md`.
*   Use appropriate fonts, colors, and button styling to create a cohesive retro aesthetic.
*   Ensure all interactions (joining, kicking, starting game) have clear visual feedback.
