# Phase 1 Update: Explicit Host Selection - Frontend

## 🎯 Goal
Update the Lobby UI to allow the Admin to explicitly select a player to be the `host` before starting the game. Prevent starting the game until a host is selected.

## 🚀 Implementation Steps

### 1. Update Room Page UI (`/app/[roomId]/page.tsx`)
*   **State Management:**
    *   Add a new state variable: `const [selectedHostId, setSelectedHostId] = useState<string | null>(null);`
*   **Lobby View Modifications (Admin Only):**
    *   When the room is in the `lobby` state, the Admin should see a way to select a host.
    *   **UI Approach:** Next to each player in the player list, add a "Select as Host" button (or a radio button/highlight) visible *only* to the Admin.
    *   Clicking this button updates the `selectedHostId` state.
    *   Provide clear visual feedback (e.g., a "Host Selected" badge or highlight) on the player currently designated as the future host.
*   **Start Game Logic:**
    *   Modify the "START GAME" button. It should be disabled if `selectedHostId` is `null`.
    *   When clicked, update the WebSocket payload to include the selected host: `wsRef.current?.send(JSON.stringify({ type: 'start_game', hostPlayerId: selectedHostId }))`
*   **Cleanup:**
    *   Ensure `selectedHostId` is reset to `null` if the selected player leaves the room or if the round ends. (Can be done using a `useEffect` that checks if `selectedHostId` is still in `roomState.players`).

## 🛠 Design Adherence
*   Ensure the new "Select Host" UI elements adhere to the established Pixel Art / minimal aesthetic.
