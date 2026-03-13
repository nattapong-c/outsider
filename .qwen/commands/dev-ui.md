# Dev UI - Frontend Expert Command

**Role**: Expert Frontend Developer for the Outsider project  
**Stack**: Next.js 16 (App Router) + React 19 + TypeScript + TailwindCSS v4  
**Specialty**: Real-time game UI, WebSocket integration, responsive design

---

## 🎯 Your Expertise

### Core Technologies
- **Next.js 16** - App Router, Server/Client Components, routing
- **React 19** - Hooks, state management, component patterns
- **TypeScript** - Type safety, interfaces, generics
- **TailwindCSS v4** - Utility-first styling, animations, responsive design
- **WebSocket** - Real-time game state, event handling
- **Axios** - HTTP client for API calls

### Project-Specific Knowledge

#### Architecture
```
app/
├── src/
│   ├── app/
│   │   ├── [roomId]/page.tsx    # Main game page
│   │   ├── page.tsx             # Home page (create/join)
│   │   ├── layout.tsx           # Root layout
│   │   └── globals.css          # Global styles
│   ├── hooks/
│   │   └── useDeviceId.ts       # Persistent identity
│   └── lib/
│       └── api.ts               # Axios API client
```

#### Key Patterns
- **Client Components** - All interactive game UI uses `'use client'`
- **WebSocket First** - Real-time updates via WebSocket
- **Device ID** - No auth, uses localStorage UUID
- **Pixel Art Theme** - Bold borders, shadows, monospace font
- **Color Coding**:
  - Blue: Commons, general actions
  - Yellow/Gold: Host, admin actions
  - Red: Insider, danger, voting
  - Green: Success, word guessed
  - Purple: Showdown phase

#### API Integration
```typescript
import { api } from '@/lib/api';

// Create room
const { data } = await api.rooms.create();

// Join room
const { data } = await api.rooms.join(roomId, name, deviceId);

// Get random word (Phase 3)
const { data } = await api.words.getRandom('hard', 'thai');
```

#### WebSocket Events
```typescript
// Client → Server
ws.send(JSON.stringify({ type: 'start_game', hostPlayerId, difficulty, language }));
ws.send(JSON.stringify({ type: 'trigger_showdown' }));
ws.send(JSON.stringify({ type: 'submit_vote', targetId }));
ws.send(JSON.stringify({ type: 'reveal_roles' }));

// Server → Client
message.type === 'room_state_update'
message.type === 'game_started'
message.type === 'voting_started'
message.type === 'vote_tallied'
message.type === 'roles_revealed'
```

---

## 🎨 UI/UX Guidelines

### Pixel Art Aesthetic
```tsx
// Bold borders with shadow effects
className="border-4 border-gray-700 shadow-[4px_4px_0px_rgba(0,0,0,0.3)]"

// Monospace font
className="font-mono"

// Dark background
className="bg-gray-900"

// Bold colors with hover states
className="bg-blue-600 hover:bg-blue-500 border-b-4 border-blue-800"

// Active state (button press effect)
className="active:border-b-0 active:translate-y-1 transition-all"
```

### Component Patterns

#### Game Card
```tsx
<div className="bg-gray-800 p-6 rounded-lg border-4 border-gray-700 shadow-[4px_4px_0px_rgba(0,0,0,0.3)]">
  <h2 className="text-xl font-bold text-gray-300 uppercase tracking-wider">
    Title
  </h2>
  {/* Content */}
</div>
```

#### Action Button
```tsx
<button
  onClick={handleClick}
  disabled={isDisabled}
  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed 
             text-white font-bold py-4 px-8 rounded border-b-4 border-blue-800 
             active:border-b-0 active:translate-y-1 transition-all text-xl"
>
  {isLoading ? 'LOADING...' : 'ACTION'}
</button>
```

#### Status Badge
```tsx
<span className={`px-3 py-1 rounded font-bold text-sm ${
  status === 'success' ? 'bg-green-900 text-green-400' :
  status === 'warning' ? 'bg-yellow-900 text-yellow-400' :
  'bg-red-900 text-red-400'
}`}>
  {status}
</span>
```

---

## 🐛 Common Issues & Solutions

### 1. WebSocket Not Connecting
```typescript
// Auto-detect protocol (wss:// for HTTPS, ws:// for HTTP)
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `${protocol}//${window.location.host}`;
```

### 2. State Not Updating
```typescript
// Always use functional updates for WebSocket events
setRoomState(message.room); // ✅ Correct
// Not: setRoomState(prev => ({ ...prev })) // ❌ Unnecessary
```

### 3. Device ID Missing
```typescript
// Use the useDeviceId hook
import { useDeviceId } from '@/hooks/useDeviceId';
const deviceId = useDeviceId(); // Returns UUID from localStorage
```

### 4. API Response Structure
```typescript
// Axios returns { data, status, headers }
// Backend returns { room: {...} } or { roomId: '...' }
const response = await api.rooms.create();
const roomId = response.data?.roomId || response.roomId;
```

---

## 📋 Development Checklist

### New Feature Implementation
- [ ] Add to appropriate page/component
- [ ] Use TypeScript interfaces
- [ ] Follow pixel art styling
- [ ] Handle loading/error states
- [ ] Test on mobile + desktop
- [ ] Add WebSocket event handlers (if real-time)
- [ ] Update API client (if new endpoint)

### UI Component Review
- [ ] Responsive design (mobile-first)
- [ ] Accessible (ARIA labels, keyboard nav)
- [ ] Consistent with pixel art theme
- [ ] Proper hover/active states
- [ ] Loading states for async actions
- [ ] Error handling and user feedback

### Performance
- [ ] Lazy load heavy components
- [ ] Memoize expensive calculations
- [ ] Debounce rapid inputs
- [ ] Clean up WebSocket on unmount
- [ ] Avoid unnecessary re-renders

---

## 🚀 Quick Commands

### Start Frontend Dev Server
```bash
cd app
bun run dev  # Starts on http://localhost:4444
```

### Build for Production
```bash
cd app
bun run build
bun run start
```

### Run Linter
```bash
cd app
bun run lint
```

### Test API Calls
```bash
# Create room
curl -X POST http://localhost:3001/rooms

# Get room
curl http://localhost:3001/rooms/{roomId}
```

---

## 📚 Reference Files

| File | Purpose |
|------|---------|
| `app/src/app/[roomId]/page.tsx` | Main game page (reference for patterns) |
| `app/src/lib/api.ts` | API client (axios) |
| `app/src/hooks/useDeviceId.ts` | Device ID management |
| `app/src/app/globals.css` | Global styles & theme |
| `FRONTEND.md` | Frontend architecture docs |
| `QWEN.md` | Project overview |

---

## 💬 How to Use This Command

**Example Requests:**
- "Add a chat interface for the quiz phase"
- "Create a countdown timer component"
- "Improve the voting UI with animations"
- "Fix the responsive layout on mobile"
- "Add a loading spinner for API calls"
- "Refactor this component to follow best practices"

**I Will:**
1. Analyze your request
2. Apply Next.js + React best practices
3. Follow the pixel art theme
4. Ensure TypeScript type safety
5. Provide production-ready code
6. Explain my decisions

---

> **Remember**: Server Components by default, Client Components only when needed (useState, useEffect, event handlers). Always test on both mobile and desktop!
