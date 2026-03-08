# Phase 2: Showdown & Winning Conditions - Backend

## 🎯 Goal
Implement the backend logic for the Showdown phase, including discussion timer management, voting mechanisms, and determining final game outcomes based on voting and game state.

## 🚀 Features

### 1. Showdown Phase Logic
*   **Initiate Showdown:**
    *   Triggered when the secret word is correctly guessed during the Quiz phase.
    *   Transition game state to 'showdown'.
*   **Discussion Timer Management:**
    *   Start a new timer (e.g., 2-3 minutes) for discussion.
    *   Broadcast remaining discussion time.
*   **Voting Mechanism:**
    *   First Vote: Allow players to vote on whether the player who guessed the word is the Insider.
        *   Collect votes, tally results.
        *   Determine if guessed player is identified as Insider.
    *   Second Vote (if needed): If first vote is innocent or wrong, initiate a general vote for any suspected player.
        *   Collect votes from all players.
        *   Tally votes to identify the most suspected player.
        *   Determine if the identified player is the actual Insider.
    *   Ensure voting is fair (one vote per player per round).

### 2. Game End Logic
*   **Determine Win Condition:**
    *   **Commons & Host Win:** If word guessed AND Insider correctly identified.
    *   **Insider Win:** If group fails to guess word (Quiz timer expires), OR group guesses word but fails to identify Insider.
*   **Finalize Game State:**
    *   Update game status to 'completed'.
    *   Record winning role/team.
    *   Store final game results (e.g., who was the Insider, who voted for whom, outcome).
    *   Broadcast final game results and role reveals to all players.

## 🛠 Technical Considerations
*   **ElysiaJS:** Extend WebSocket handlers to manage showdown events (`start_showdown`, `submit_vote`).
*   **Mongoose:** Update `Game` schema to include voting data, discussion timer, and final game results.
*   **Game State Transitions:** Carefully manage transitions between 'quiz', 'showdown_discussion', 'showdown_vote1', 'showdown_vote2', and 'completed' states.
*   **Concurrency:** Handle simultaneous votes to ensure accurate tallying.
*   **Error Handling:** Robust validation for voting (e.g., preventing multiple votes, voting for invalid players).
