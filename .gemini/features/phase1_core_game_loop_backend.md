# Phase 1: Core Game Loop (MVP) - Backend

## 🎯 Goal
Implement the foundational backend logic for game session management, the quiz phase, real-time communication, and basic data persistence.

## 🚀 Features

### 1. Game Session Management
*   **Create Game:**
    *   Host initiates a new game session.
    *   Generate unique game ID.
    *   Store initial game state in MongoDB (status: 'waiting', empty player list).
*   **Join Game:**
    *   Players join a game using the game ID, providing their chosen name.
    *   Add player to the game session, including their name.
    *   Validate max players (4-8).
*   **Player/Role Assignment:**
    *   Randomly assign roles (Host, Insider, Commons) to connected players.
    *   Ensure one Host, one Insider, and remaining Commons.
    *   Persist roles and player names in game session.
*   **Secret Word Selection:**
    *   Host selects a word from a predefined list of **Thai noun words** (app-provided themes/words).
    *   Alternatively, automatic random selection of a **Thai noun word** if host doesn't choose.
    *   Store secret word in game session (accessible only to Host and Insider).

### 2. Quiz Phase Logic
*   **Timer Management:**
    *   Start a 5-minute timer when the quiz phase begins.
    *   Broadcast remaining time to all players.
    *   Handle timer expiration (Game ends, Insider wins if word not guessed).
*   **Question/Answer Handling:**
    *   Receive player questions via WebSocket.
    *   Validate questions (e.g., not too long, appropriate format).
    *   Host provides "Yes/No" answers.
    *   Store questions and answers in game session history.

### 3. Real-time Communication (WebSockets)
*   **Game State Broadcasts:**
    *   Broadcast current game state (players, roles, phase, timer, question/answer history) to all connected players on state changes.
*   **Player Actions:**
    *   Handle `join_game` event.
    *   Handle `ask_question` event.
    *   Handle `answer_question` event.

### 4. Basic Data Persistence (MongoDB)
*   **Game Sessions:**
    *   Schema for `Game` collection (ID, players, secret word, status, current phase, timer info, Q&A history).
*   **Word Bank:**
    *   Basic storage for words/themes used in the game (could be a simple array or a separate collection).

## 🛠 Technical Considerations
*   **ElysiaJS:** Define controllers for REST (create/join game) and WebSocket handlers for real-time game events.
*   **Mongoose:** Setup schemas and models for `Game` and potentially `Word` collections.
*   **Bun:** Utilize Bun's runtime for server execution.
*   **Type Safety:** Ensure all data structures are strictly typed using TypeScript.
*   **Error Handling:** Implement robust error handling for API and WebSocket interactions.
