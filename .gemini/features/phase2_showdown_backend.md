# Phase 2: Showdown & Winning Conditions - Backend

## 🎯 Goal
Implement the backend logic for the Showdown phase, including discussion timer management, voting mechanisms, and determining final game outcomes based on voting and game state.

## 🚀 Features

### 1. Showdown Phase Logic
*   **Initiate Showdown:**
    *   The transition from the guessing (quiz) phase to the discussion phase happens in one of three ways:
        1.  **Guessed Correctly:** Triggered manually by the `host` when a player correctly guesses the secret word.
        2.  **Auto Time's Up:** If `autoTransition` is enabled, the backend automatically triggers the transition when the quiz timer expires.
        3.  **Manual Time's Up:** If `autoTransition` is disabled, the quiz timer expires but the game waits for the `host` to manually trigger the transition.
    *   The backend handles a specific `trigger_showdown` WebSocket event from the `host` for the manual triggers.
    *   Transition game state to 'showdown_discussion'.
*   **Discussion Timer Management:**
    *   Start a new timer based on the room's `timerConfig` (default 3 minutes) for discussion.
    *   Broadcast remaining discussion time.
*   **Voting Mechanism:**
    *   **General Vote:** Initiate a general vote where all players can vote for *any* suspected player, **except the `host`**. The `host` is exempt from being voted as the Insider.
    *   Collect votes from all players.
    *   Tally votes to identify the most suspected player.
    *   Determine if the identified player is the actual Insider.
    *   Ensure voting is fair (one vote per player per round).

### 2. Game End Logic
*   **Determine Win Condition:**
    *   **Commons & Host Win:** If word guessed AND Insider correctly identified in the general vote.
    *   **Insider Win:** If group fails to guess word (Quiz timer expires), OR group guesses word but fails to identify Insider.
*   **Finalize Game State:**
    *   Update game status to 'voting_finished' (or similar intermediate state) once all votes are tallied.
    *   **Manual Reveal:** The `host` must manually trigger a `reveal_roles` WebSocket event to transition the state to 'completed'.
    *   Record winning role/team.
    *   Store final game results (e.g., who was the Insider, who voted for whom, vote counts, outcome).
    *   Broadcast final game results and role reveals to all players only after the host triggers the reveal.
    *   **Round Reset:** The `admin` retains the sole ability to send the `end_round` event to reset the room back to the `lobby` for a new game.

## 🛠 Technical Considerations
*   **ElysiaJS:** Extend WebSocket handlers to manage showdown events (`start_showdown`, `submit_vote`).
*   **Mongoose:** Update `Game` schema to include voting data, discussion timer, and final game results.
*   **Game State Transitions:** Carefully manage transitions between 'quiz', 'showdown_discussion', 'showdown_voting', and 'completed' states.
*   **Concurrency:** Handle simultaneous votes to ensure accurate tallying.
*   **Error Handling:** Robust validation for voting (e.g., preventing multiple votes, voting for invalid players).
