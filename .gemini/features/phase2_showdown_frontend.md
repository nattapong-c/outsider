# Phase 2: Showdown & Winning Conditions - Frontend

## 🎯 Goal
Develop the user interface and client-side logic to support the Showdown discussion, voting process, and display of final game results.

## 🚀 Features

### 1. Showdown Phase UI
*   **Host Trigger Controls:**
    *   **Word Guessed:** Since players guess the word verbally out loud, the `host` must have a manual button (e.g., "Word Guessed!") during the Quiz Phase. Clicking this sends a WebSocket event to initiate the Showdown. The host does NOT need to select who guessed the word.
    *   **Time's Up (Manual):** If the room is configured for manual transition (`autoTransition: false`), when the quiz timer reaches 0, the `host` must be presented with a "Proceed to Discussion" button to manually move the game forward.
*   **Discussion Timer:**
    *   Display a new in-app timer for the discussion phase.
*   **Voting Interface:**
    *   Present a clear interface for players to cast their votes.
    *   Provide an interface for all players to vote for *any* suspected player from the player list simultaneously, **excluding the `host`**. The voting UI must prevent selecting the host.
    *   **Vote Counts:** Must display the accumulated vote count for each eligible player.
    *   Show who has voted to encourage participation.
*   **Real-time Updates:**
    *   Listen for `voting_started`, `vote_tallied` (or similar) events from the backend.
    *   Dynamically update the UI to reflect the current voting stage and real-time vote counts.

### 2. Game Results UI
*   **Intermediate Voting Finished State:**
    *   Once the voting timer expires or all votes are in, show a "Waiting for Host to Reveal Roles" screen to most players.
    *   **Host Control:** Provide a prominent "Reveal Roles" button exclusively for the `host` to trigger the final reveal.
*   **Win/Loss Display:**
    *   Clearly indicate if the player's team (Commons/Host or Insider) won or lost, displayed only after the host triggers the reveal.
*   **Role Reveals:**
    *   Display all player roles at the end of the game (who was the Insider, Host, Commons).
*   **Game Summary:**
    *   Show a summary of the game, including the secret word, key questions/answers, and voting outcomes.
    *   **Admin Control:** Provide a "Return to Lobby" or "Prepare New Game" button exclusively for the `admin` to reset the room state.

## 🛠 Technical Considerations
*   **Next.js (App Router):** Integrate new UI components within existing game session pages.
*   **React:** Manage complex UI states for voting, vote tallies, and results display.
*   **TypeScript:** Strong typing for vote payloads and game result data.
*   **TailwindCSS:** Style voting buttons, result screens, and role reveals, ensuring they adhere to the Pixel Art theme and maintain a clean, minimal, and easy-to-use aesthetic.
*   **WebSocket Handling:** Extend `useWebSocket` hook to handle new backend events related to showdown and game conclusion.
*   **User Feedback:** Provide clear visual feedback when a vote is cast or when game phases change, consistent with the Pixel Art theme.
*   **Conditional Rendering:** Dynamically render UI elements based on the current game phase and player's role, always considering the overall theme.
