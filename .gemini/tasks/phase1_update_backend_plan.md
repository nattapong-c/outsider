# Phase 1 Update Implementation Plan - Backend

## 🎯 Goal
Update the backend logic to support explicit host selection by the admin and to allow for configurable timers for the quiz and discussion phases.

## 🚀 Implementation Steps

### 1. Update Data Models
*   **File:** `service/src/models/room.ts`
*   **Action:** Add `timerConfig: { quiz: Number, discussion: Number, autoTransition: Boolean }` to the `Room` schema. Ensure it defaults to `{ quiz: 180, discussion: 180, autoTransition: true }`.

### 2. Update WebSocket `start_game` Event
*   **File:** `service/src/controllers/ws-controller.ts`
*   **Action:** Modify the `start_game` message handler.
    *   It should now expect a `hostPlayerId` in the message payload.
    *   Validate that `hostPlayerId` is provided.
    *   Assign the `host` role to the player matching `hostPlayerId`.
    *   Randomly assign `insider` and `common` to the remaining players.

### 3. Implement Timer Configuration Event
*   **File:** `service/src/controllers/ws-controller.ts`
*   **Action:** Add a new WebSocket message handler for `update_timer_config`.
    *   This should only be accessible by the `admin`.
    *   It accepts a payload with `{ quiz: number, discussion: number, autoTransition: boolean }`.
    *   Update the room's `timerConfig` in the database and broadcast a `room_state_update` to all clients.

### 4. Implement Timer Expiration Logic
*   **File:** `service/src/controllers/ws-controller.ts` (or a separate timer service)
*   **Action:** Update the Quiz phase timer expiration logic.
    *   When the timer expires, check the room's `timerConfig.autoTransition`.
    *   If `true`, automatically trigger the `showdown_discussion` phase.
    *   If `false`, simply broadcast a state update indicating the timer has expired and wait for a manual `trigger_showdown` event from the `host`.
