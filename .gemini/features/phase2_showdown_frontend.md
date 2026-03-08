# Phase 2: Showdown & Winning Conditions - Frontend

## 🎯 Goal
Develop the user interface and client-side logic to support the Showdown discussion, voting process, and display of final game results.

## 🚀 Features

### 1. Showdown Phase UI
*   **Discussion Timer:**
    *   Display a new in-app timer for the discussion phase.
*   **Voting Interface:**
    *   Present a clear interface for players to cast their votes.
    *   Initially, allow voting on the player who guessed the word.
    *   If a second vote is needed, provide an interface to vote for any suspected player from the player list.
    *   Show who has voted (without revealing their actual vote) to encourage participation.
*   **Real-time Updates:**
    *   Listen for `voting_started`, `vote_tallied` (or similar) events from the backend.
    *   Dynamically update the UI to reflect the current voting stage and results.

### 2. Game Results UI
*   **Win/Loss Display:**
    *   Clearly indicate if the player's team (Commons/Host or Insider) won or lost.
*   **Role Reveals:**
    *   Display all player roles at the end of the game (who was the Insider, Host, Commons).
*   **Game Summary:**
    *   Show a summary of the game, including the secret word, key questions/answers, and voting outcomes.
    *   Option to start a new game or return to the lobby.

## 🛠 Technical Considerations
*   **Next.js (App Router):** Integrate new UI components within existing game session pages.
*   **React:** Manage complex UI states for voting, vote tallies, and results display.
*   **TypeScript:** Strong typing for vote payloads and game result data.
*   **TailwindCSS:** Style voting buttons, result screens, and role reveals, ensuring they adhere to the Pixel Art theme and maintain a clean, minimal, and easy-to-use aesthetic.
*   **WebSocket Handling:** Extend `useWebSocket` hook to handle new backend events related to showdown and game conclusion.
*   **User Feedback:** Provide clear visual feedback when a vote is cast or when game phases change, consistent with the Pixel Art theme.
*   **Conditional Rendering:** Dynamically render UI elements based on the current game phase and player's role, always considering the overall theme.
