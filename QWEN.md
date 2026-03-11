# Outsider - Project Context

## 🎯 Project Overview

**Outsider** is a digital adaptation of the board game *Insider* - a social deduction game where 4-8 players must guess a secret word while identifying the hidden "Outsider" (Insider) who knows the word and subtly manipulates the group toward the answer.

### Game Flow
1. **Lobby Phase**: Players join, admin selects a host, configure timers
2. **Quiz Phase** (3 min default): Host/Insider know secret word, Commons ask Yes/No questions
3. **Showdown Phase**: Discussion → Voting → Role reveal
4. **Win Conditions**: 
   - **Commons & Host Win**: Word guessed AND Insider identified
   - **Insider Wins**: Word NOT guessed OR Insider NOT identified

## 🛠 Tech Stack

| Layer | Technology | Hosting |
|-------|------------|---------|
| Runtime | Bun | - |
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript | Vercel |
| Backend | ElysiaJS + TypeScript | Render |
| Database | MongoDB (Mongoose ODM) | MongoDB Atlas |
| Styling | TailwindCSS v4 | - |
| Type Safety | @elysiajs/eden (Eden Treaty) | - |
| Logging | Pino | - |

## 📂 Project Structure

```
outsider/
├── app/                          # Frontend (Next.js)
│   ├── src/
│   │   ├── app/                  # Next.js App Router
│   │   │   ├── [roomId]/         # Dynamic room route
│   │   │   ├── globals.css       # Global styles (Pixel Art theme)
│   │   │   ├── layout.tsx        # Root layout
│   │   │   └── page.tsx          # Home page (create/join room)
│   │   ├── hooks/                # Custom React hooks
│   │   │   └── useDeviceId.ts    # Persistent identity via localStorage
│   │   └── lib/                  # Utilities
│   │       └── api.ts            # Eden Treaty client
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.ts
│
├── service/                      # Backend (ElysiaJS)
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── room-controller.ts    # REST endpoints (create, join, leave)
│   │   │   └── ws-controller.ts      # WebSocket handlers (game logic)
│   │   ├── models/
│   │   │   └── room.ts               # Mongoose schema + Elysia validation
│   │   ├── lib/
│   │   │   ├── db.ts                 # MongoDB connection
│   │   │   └── logger.ts             # Pino logger
│   │   └── index.ts                  # Elysia entry point
│   ├── .env                      # Environment variables (MongoDB URI)
│   ├── package.json
│   └── tsconfig.json
│
└── .gemini/                      # Project documentation & task plans
    ├── tasks/                    # Implementation plans (Phase 1, Phase 2)
    └── features/                 # Feature specifications
```

## 🚀 Building and Running

### Prerequisites
- [Bun](https://bun.sh/) runtime installed
- MongoDB instance (local or Atlas)

### Environment Setup

**Backend** (`service/.env`):
```bash
MONGO_URI=mongodb://localhost:27017/outsider
# Or MongoDB Atlas connection string
PORT=3001
CORS_ORIGIN=http://localhost:4444
```

**Frontend** (create `app/.env.local` if needed):
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

### Development Commands

**Backend:**
```bash
cd service
bun run dev          # Start ElysiaJS dev server on port 3001
```

**Frontend:**
```bash
cd app
bun run dev          # Start Next.js dev server on port 4444
bun run build        # Build for production
bun run lint         # Run ESLint
```

### Testing
```bash
cd service
bun test             # Run backend tests (if implemented)

cd app
bun run lint         # Lint check
```

## 🎮 Key Architecture Concepts

### Identity Management
- No user accounts - uses `deviceId` (UUID stored in `localStorage`) for persistent identity
- Players reconnect automatically if they refresh or lose connection
- `isOnline` flag tracks current connection status

### WebSocket Communication
- Connection: `ws://localhost:3001/ws/rooms/:roomId?deviceId=:deviceId`
- All game state updates broadcast via `room_state_update` event
- Events are JSON-stringified payloads with `type` field

### Room States
```typescript
'lobby'               → Waiting for players, admin configures game
'playing'             → Quiz phase active
'showdown_discussion' → Discussion phase
'showdown_voting'     → Voting phase (Phase 2)
'completed'           → Game over, results displayed
```

### Key WebSocket Events

**Client → Server:**
- `start_game` (admin): Begin game with selected host
- `kick_player` (admin): Remove player
- `end_round` (admin): Reset to lobby
- `update_timer_config` (admin): Change quiz/discussion timers
- `trigger_showdown` (host): Word guessed, start showdown
- `submit_vote` (player): Vote for suspected insider
- `reveal_roles` (host): End game, show all roles

**Server → Client:**
- `room_state_update`: General state broadcast
- `game_started`: Game begins, roles assigned
- `voting_started`: Voting phase begins
- `vote_tallied`: Real-time vote count update
- `roles_revealed`: Game over, all roles shown

## 🎨 UI/UX Theme

**Pixel Art Aesthetic:**
- Retro gaming feel with pixelated styling
- Bold borders with shadow effects (`border-b-4`, `shadow-[4px_4px_0px_...]`)
- Monospace font (`font-mono`)
- Dark background (`bg-gray-900`)
- Color coding:
  - Blue: Commons, general actions
  - Yellow/Gold: Host, admin actions
  - Red: Insider, danger, voting
  - Green: Success, word guessed
  - Purple: Showdown phase

## 📋 Development Phases

### Phase 1 (Completed) - Core Game Loop
- Room creation/joining
- Admin controls (kick, start game, timer config)
- Host selection
- Role assignment (host, insider, common)
- Secret word visibility toggle (anti-cheating)
- Quiz phase timer

### Phase 2 (Planned) - Showdown & Winning
- Discussion phase timer
- Voting mechanism
- Win condition determination
- Role reveal
- Game results screen

### Phase 3 (Future) - Enhancements
- Word bank with categories
- Chat interface for questions
- "Play Again" functionality
- Game history

## 📝 Coding Conventions

### TypeScript Naming
- **Variables/Functions**: `camelCase` (`gameSession`, `handleVote`)
- **Components/Classes**: `PascalCase` (`GameCard`, `RoomPage`)
- **Constants**: `UPPER_SNAKE_CASE` (`MAX_PLAYERS`, `API_BASE_URL`)
- **Files**: `kebab-case` (`room-controller.ts`, `useDeviceId.ts`)

### Backend Patterns
- Elysia `t` schemas for validation + Eden type inference
- Mongoose for MongoDB persistence
- Pino for structured logging
- WebSocket messages validated before processing

### Frontend Patterns
- Functional components with hooks
- Custom hooks for reusable logic (`useDeviceId`, `useCountdown`)
- Eden Treaty for type-safe API calls
- TailwindCSS for all styling

## 🔧 Key Files Reference

| File | Purpose |
|------|---------|
| `service/src/index.ts` | Elysia app entry, CORS, route registration |
| `service/src/models/room.ts` | Mongoose schema + Elysia validation schemas |
| `service/src/controllers/ws-controller.ts` | Core game logic, WebSocket handlers |
| `app/src/app/[roomId]/page.tsx` | Main room/game page, WebSocket client |
| `app/src/lib/api.ts` | Eden Treaty client initialization |
| `app/src/hooks/useDeviceId.ts` | Persistent identity management |

## 🐛 Common Issues & Solutions

**WebSocket not connecting:**
- Ensure backend is running on port 3001
- Check `NEXT_PUBLIC_WS_URL` environment variable
- Vercel hosting requires external WebSocket URL (Render backend)

**MongoDB connection error:**
- Verify `MONGO_URI` in `service/.env`
- Ensure MongoDB is running or Atlas connection is valid

**Type errors with Eden:**
- Backend `AppRouter` type must be exported from `service/src/index.ts`
- Frontend imports type: `import type { AppRouter } from '../../../service/src/index'`

## 📚 Documentation Files

- `GEMINI.md` - Main project overview, game rules, UI theme
- `BACKEND.md` - Backend architecture, API endpoints, testing guidelines
- `FRONTEND.md` - Frontend architecture, component patterns, hooks
- `.gemini/tasks/` - Detailed implementation plans for each phase
- `.gemini/features/` - Feature specifications
