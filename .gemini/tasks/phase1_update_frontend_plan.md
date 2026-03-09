# Phase 1 Update Implementation Plan - Frontend

## 🎯 Goal
Update the Lobby UI to allow the Admin to select a host and configure game timers before starting the game.

## 🚀 Implementation Steps

### 1. Update Room Page UI (`/app/[roomId]/page.tsx`)
*   **State Management:**
    *   Add a new state variable: `const [selectedHostId, setSelectedHostId] = useState<string | null>(null);`
    *   Add state to manage timer configurations: `const [timerConfig, setTimerConfig] = useState({ quiz: 180, discussion: 180, autoTransition: true });`
*   **Admin Controls UI (Lobby View):**
    *   **Host Selection:** Add a "Select as Host" button next to each player in the player list. Update `selectedHostId` on click.
    *   **Timer Configuration:** Add UI elements (e.g., sliders, number inputs) to allow the Admin to change the `quiz` and `discussion` timer durations.
    *   **Auto-Transition Toggle:** Add a checkbox/toggle for the `autoTransition` setting.
    *   When the Admin changes these settings, send an `update_timer_config` WebSocket message to the backend.
*   **Start Game Logic:**
    *   Modify the "START GAME" button to be disabled if `selectedHostId` is `null`.
    *   When clicked, send the `start_game` event with the `hostPlayerId`.

### 2. Update Timer Display
*   **File:** `app/src/app/[roomId]/page.tsx`
*   **Action:** Ensure the in-game timer component correctly displays the duration based on the `roomState.timerConfig`.
