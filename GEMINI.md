# GEMINI.md - Project "Outsider"

## 🎯 Project Overview
**Outsider** is the digital evolution of the physical board game *Insider*. It is a social deduction game where players must guess a secret word while identifying the "Outsider"—the hidden player who knows the word and is subtly manipulating the group toward the answer.

### 📚 Additional Documentation
For more detailed information when working on specific parts of the project, please refer to:
*   [Frontend Documentation (FRONTEND.md)](./FRONTEND.md)
*   [Backend Documentation (BACKEND.md)](./BACKEND.md)

---

## ✨ UI/UX Theme & Guidelines
The user interface for **Outsider** will adhere to a distinct visual and interaction style:

*   **Theme:** Pixel Art. The design should evoke a nostalgic, retro gaming feel with clear, stylized pixelated graphics for all UI elements, icons, and any in-game art.
*   **Aesthetic:** Minimal, Clean, and Easy-to-Use. Despite the Pixel Art theme, the layout and interaction patterns should remain straightforward and uncluttered. Prioritize readability and intuitive navigation. Avoid excessive visual noise.

---

## 🎮 Digital App Game Rules (Adapted from Insider)

This section outlines the rules for **Outsider**, a digital adaptation of the social deduction game *Insider*, designed for a mobile or web application.

### Players & Roles:
*   **4-8 Players** are required for a game session.
*   **Roles are assigned secretly by the application.** Each player will see their role displayed privately on their screen at the start of the game:
    *   **The Host (Master equivalent):** One player is designated as the Host, responsible for initiating the game and, if applicable, selecting the secret word. The app will clearly indicate the Host's role. The Host knows the secret word and provides "Yes/No" answers during the quiz phase.
    *   **The Insider:** One player knows the secret word and must subtly guide the group to guess it without revealing their identity. The word will be displayed only to the Insider at the beginning of the game.
    *   **The Commons:** The remaining players do not know the secret word. Their goal is to guess the word and identify the Insider.

### Game Setup & Secret Word Reveal:
1.  **Role Assignment:** The application randomly assigns roles to all connected players.
2.  **Word Selection:**
    *   The application presents a list of word themes or specific words to the Host for selection.
    *   Alternatively, the application can automatically select a random word from a predefined list.
3.  **Secret Word Revelation (Digital "Night Phase"):**
    *   The application displays a "Roles are being assigned" or "Secret Word Revelation" screen to all players.
    *   The secret word is privately revealed only to the Host and the Insider on their respective screens. The Commons' screens will indicate that the word is being revealed to others.

### Phase 1: The Quiz (Timed):
*   An **in-app timer** (e.g., 5 minutes) is displayed to all players.
*   Players (Commons and Insider) can ask the Host "Yes/No" questions related to the secret word via a **text-based chat interface** within the app.
*   The Host inputs "Yes" or "No" as answers, which are then displayed to all players.
*   The Insider must strategically phrase questions or contribute to the discussion to help the group guess the word, while avoiding overly obvious hints that would expose them.
*   **Timer Expiry:** If the word is not guessed before the timer runs out, the game ends, and the Insider wins (as the group failed to guess the word).

### Phase 2: The Showdown (Timed Discussion & Voting):
*   If the secret word is guessed correctly, the application initiates the Showdown phase with a new **in-app timer** (e.g., 2-3 minutes) for discussion.
*   **Accusation Phase:** Players discuss via the in-app chat interface, analyzing previous questions and answers to deduce who the Insider might be.
*   **Voting Phase:**
    *   The application presents a voting interface.
    *   First, players vote on whether the player who **correctly guessed the word** is the Insider.
    *   If that player is voted innocent (or wasn't the Insider), a second vote is initiated where players can vote for any other player they suspect to be the Insider.

### Winning Conditions:
*   **Commons & Host Win:** If the group successfully guesses the secret word AND correctly identifies the Insider through the voting process.
*   **Insider Wins:**
    *   If the group fails to guess the secret word before the quiz timer expires.
    *   OR, if the group guesses the word but fails to correctly identify the Insider during the voting process.

---

## 🛠 Tech Stack
| Layer | Technology | Hosting |
| :--- | :--- | :--- |
| :--- | :--- | :--- |
| **Runtime** | Bun | - |
| **Frontend** | Next.js (App Router) | Vercel |
| **Backend** | ElysiaJS | Render |
| **Database** | MongoDB | MongoDB Atlas |

---

## 📂 Project Structure
Following a **Clean Code** approach to separate concerns between the UI and the Game Engine.

```text
Outsider/
├── app/                        # Frontend (Next.js)
│   ├── src/
│   │   ├── app/                # Next.js App Router (Routes & Pages)
│   │   ├── components/         # Atomic UI components
│   │   ├── hooks/              # Custom React hooks (Game state, Socket)
│   │   ├── lib/                # Shared utilities & API clients
│   │   ├── services/           # Frontend business logic
│   │   └── types/              # Frontend TypeScript definitions
│   ├── public/                 # Static assets (Assets for cards/roles)
│   ├── next.config.mjs
│   └── tailwind.config.ts
│
├── service/                    # Backend (Elysia)
│   ├── src/
│   │   ├── controllers/        # Route & WebSocket handlers
│   │   ├── models/             # MongoDB Schemas / Mongoose models
│   │   ├── services/           # Core Game Logic (Role distribution, Word bank)
│   │   ├── lib/                # Database connection & Middlewares
│   │   └── index.ts            # Elysia entry point
│   ├── bun.lockb
│   └── package.json
│
└── README.md                   # Project documentation
