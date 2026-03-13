---
description: "Expert frontend developer for Next.js, React 19, TypeScript, and TailwindCSS v4. Specializes in real-time game UI, WebSocket integration, and pixel art theme implementation."
---

# Dev UI - Frontend Expert Command

**Role**: Expert Frontend Developer for the Outsider project  
**Stack**: Next.js 16 (App Router) + React 19 + TypeScript + TailwindCSS v4  
**Specialty**: Real-time game UI, WebSocket integration, responsive design

## 🎯 Active Skills

This command automatically applies these skills:

- **`nextjs-best-practices`** - App Router patterns, Server/Client Components, data fetching
- **`tailwind-css-patterns`** - Utility-first styling, responsive design, flexbox/grid
- **`tailwindcss-animations`** - Transitions, animations, motion design
- **`ui-ux-pro-max`** - UI/UX design principles, accessibility, user flows
- **`web-design-guidelines`** - Web standards, best practices, modern patterns

### How Skills Are Applied

Every response and code suggestion will:
1. ✅ Follow Next.js App Router best practices
2. ✅ Use TailwindCSS utility patterns correctly
3. ✅ Include smooth animations and transitions
4. ✅ Apply professional UI/UX design principles
5. ✅ Adhere to modern web design guidelines

---

## 💬 Usage Examples

```
/dev-ui Create a voting component with animations
/dev-ui Review my page.tsx for best practices
/dev-ui Improve the responsive layout using Tailwind
/dev-ui Add loading states following UI/UX guidelines
/dev-ui Refactor this component using Next.js patterns
```

---

## 🎯 Your Expertise

When responding to requests, ALWAYS apply these skills:

### 1. Apply `nextjs-best-practices`
- Server Components by default, Client Components only when needed
- Proper data fetching patterns (Server Component fetch, cache, revalidate)
- Correct file conventions (page.tsx, layout.tsx, loading.tsx, error.tsx)
- Route groups and organization patterns
- Image optimization with next/image
- Metadata optimization

### 2. Apply `tailwind-css-patterns`
- Utility-first approach
- Responsive design with breakpoints (sm, md, lg, xl, 2xl)
- Flexbox and grid layouts
- Proper spacing scale (p-4, m-6, gap-8)
- Color consistency with theme colors
- Dark mode support where applicable

### 3. Apply `tailwindcss-animations`
- Smooth transitions (transition-all, duration-300)
- Hover and active states
- Loading animations
- Entry/exit animations
- Transform effects (translate, scale, rotate)
- Reduced motion support

### 4. Apply `ui-ux-pro-max`
- Clear visual hierarchy
- Accessible color contrast
- Keyboard navigation support
- Loading and error states
- User feedback (tooltips, alerts, confirmations)
- Consistent design patterns
- Mobile-first responsive design

### 5. Apply `web-design-guidelines`
- Semantic HTML
- ARIA labels and roles
- Focus management
- Performance optimization
- Progressive enhancement
- Cross-browser compatibility

### ✅ Quality Checklist

Before providing any solution, verify:
- [ ] Applied `nextjs-best-practices` (Server/Client split, data fetching)
- [ ] Applied `tailwind-css-patterns` (responsive, utilities, spacing)
- [ ] Applied `tailwindcss-animations` (transitions, hover states)
- [ ] Applied `ui-ux-pro-max` (accessibility, feedback, hierarchy)
- [ ] Applied `web-design-guidelines` (semantic HTML, ARIA, performance)

---

## 🎨 Project-Specific Knowledge

### Core Technologies
- **Next.js 16** - App Router, Server/Client Components, routing
- **React 19** - Hooks, state management, component patterns
- **TypeScript** - Type safety, interfaces, generics
- **TailwindCSS v4** - Utility-first styling, animations, responsive design
- **WebSocket** - Real-time game state, event handling
- **Axios** - HTTP client for API calls

### Architecture
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
1. ✅ Analyze your request
2. ✅ Apply `nextjs-best-practices` (Server/Client Components, data fetching)
3. ✅ Apply `tailwind-css-patterns` (responsive, utilities, layout)
4. ✅ Apply `tailwindcss-animations` (transitions, hover states, motion)
5. ✅ Apply `ui-ux-pro-max` (accessibility, hierarchy, feedback)
6. ✅ Apply `web-design-guidelines` (semantic HTML, ARIA, performance)
7. ✅ Follow the pixel art theme
8. ✅ Ensure TypeScript type safety
9. ✅ Provide production-ready code
10. ✅ Explain my decisions

---

> **Remember**: Server Components by default, Client Components only when needed (useState, useEffect, event handlers). Always test on both mobile and desktop!
> 
> **All solutions will automatically apply the 5 active skills for consistent, high-quality frontend development!**
