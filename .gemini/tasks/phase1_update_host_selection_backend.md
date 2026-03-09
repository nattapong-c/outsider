# Phase 1 Update: Explicit Host Selection - Backend

## 🎯 Goal
Update the backend `start_game` WebSocket logic. The Admin must now explicitly select which player will be the `host` (in-game role). The remaining roles (`insider`, `common`) will still be distributed randomly among the rest of the players.

## 🚀 Implementation Steps

### 1. Update WebSocket `start_game` Event
*   **File:** `service/src/controllers/ws-controller.ts`
*   **Action:** Modify the `start_game` message handler.
    *   It should now expect a `hostPlayerId` in the message payload (e.g., `parsedMessage.hostPlayerId`).
    *   Validate that `hostPlayerId` is provided and exists in the current room's player list.
    *   Assign the `host` role specifically to the player matching `hostPlayerId`.
    *   Filter out the `host` from the player list, and securely shuffle the remaining players to randomly assign `1` `insider` and the rest as `common`.
    *   Save the room state and broadcast `game_started` as before.

## 🛠 Testing
*   Update any existing game loop test scripts (e.g., `service/scripts/test-game-loop.ts`) to include a `hostPlayerId` when sending the `start_game` event.
