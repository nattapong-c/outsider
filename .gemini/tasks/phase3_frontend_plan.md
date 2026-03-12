# Phase 3 Frontend Implementation Plan - Scoring System

## 📋 Overview
**Goal**: Implement UI for player rankings and score display  
**Estimated Time**: 4-5 hours  
**Priority**: High  
**Dependencies**: Phase 3 backend API completion

---

## 🎯 Task Breakdown

### Task 1: Create Leaderboard Component (60 mins)
**File**: `app/src/app/[roomId]/page.tsx` (or extract to component)

**Subtasks**:
1. Create leaderboard UI for lobby phase
2. Sort players by score (descending)
3. Display rank, name, score, games played
4. Add visual styling (gold/silver/bronze for top 3)
5. Highlight current player

**Component Structure**:
```typescript
interface LeaderboardProps {
    players: PlayerType[];
    currentDeviceId: string;
}

function Leaderboard({ players, currentDeviceId }: LeaderboardProps) {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    
    return (
        <div className="bg-gray-800 p-6 rounded-lg border-4 border-gray-700 mb-6">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">
                🏆 PLAYER RANKINGS
            </h2>
            <div className="space-y-3">
                {sortedPlayers.map((player, index) => {
                    const rank = index + 1;
                    const isCurrentPlayer = player.deviceId === currentDeviceId;
                    const rankColor = rank === 1 ? 'text-yellow-400' : 
                                     rank === 2 ? 'text-gray-300' : 
                                     rank === 3 ? 'text-amber-600' : 'text-gray-500';
                    
                    return (
                        <div 
                            key={player.id}
                            className={`flex items-center justify-between p-3 rounded border-2 ${
                                isCurrentPlayer ? 'bg-blue-900/40 border-blue-700' : 'bg-gray-900 border-gray-700'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={`font-bold text-xl ${rankColor}`}>
                                    #{rank}
                                </span>
                                <span className="font-bold">
                                    {player.name}
                                    {isCurrentPlayer && <span className="text-blue-400 ml-2">(You)</span>}
                                </span>
                            </div>
                            <div className="text-right">
                                <div className="text-green-400 font-bold text-xl">
                                    {player.score} pts
                                </div>
                                <div className="text-gray-500 text-xs">
                                    {player.gamesPlayed} games
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
```

**Acceptance Criteria**:
- [ ] Players sorted by score (highest first)
- [ ] Top 3 ranks have special colors
- [ ] Current player highlighted
- [ ] Responsive design (mobile + desktop)
- [ ] Pixel art styling matches theme

---

### Task 2: Integrate Leaderboard into Lobby (30 mins)
**File**: `app/src/app/[roomId]/page.tsx`

**Subtasks**:
1. Import/create Leaderboard component
2. Add to lobby phase UI
3. Position above timer configuration
4. Ensure real-time updates via WebSocket

**Code Changes**:
```typescript
{roomState?.status === 'lobby' && (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
        <h2 className="text-4xl text-gray-400 mb-8 font-bold">Waiting in Lobby</h2>
        
        {/* Leaderboard */}
        <Leaderboard 
            players={roomState.players} 
            currentDeviceId={deviceId} 
        />
        
        {/* Timer Configuration (existing) */}
        {isAdmin && (
            <div className="mb-12 bg-gray-900 p-6 rounded-lg border-2 border-gray-700 w-full max-w-md text-left">
                {/* ... existing timer config UI ... */}
            </div>
        )}
        
        {/* ... rest of lobby UI ... */}
    </div>
)}
```

**Acceptance Criteria**:
- [ ] Leaderboard displays in lobby
- [ ] Updates when players join/leave
- [ ] Updates when scores change
- [ ] Doesn't break existing lobby UI

---

### Task 3: Add Score Changes to Results Screen (45 mins)
**File**: `app/src/app/[roomId]/page.tsx`

**Subtasks**:
1. Update results screen to show score changes
2. Display +X points next to each player
3. Animate score increases (optional polish)
4. Show new total scores

**Code Changes**:
```typescript
{/* In Game Completed section, after Role Reveals */}
{roomState.votes && roomState.votes.length > 0 && (
    <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-300 mb-4">Voting Results</h3>
        {/* ... existing voting results ... */}
    </div>
)}

{/* Score Changes */}
{message.scoreChanges && (
    <div className="mb-6">
        <h3 className="text-2xl font-bold text-green-400 mb-4">
            📊 SCORE CHANGES
        </h3>
        <div className="bg-gray-900 p-6 rounded border-2 border-gray-700">
            {roomState.players
                .map(player => {
                    const scoreChange = message.scoreChanges[player.id] || 0;
                    return (
                        <div key={player.id} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
                            <div className="flex items-center gap-2">
                                <span className="font-bold">{player.name}</span>
                                {player.deviceId === deviceId && <span className="text-blue-400">(You)</span>}
                            </div>
                            {scoreChange > 0 && (
                                <span className="text-green-400 font-bold">
                                    +{scoreChange} pts
                                </span>
                            )}
                            {scoreChange === 0 && (
                                <span className="text-gray-500">
                                    +0 pts
                                </span>
                            )}
                        </div>
                    );
                })
            }
        </div>
    </div>
)}
```

**Acceptance Criteria**:
- [ ] Score changes displayed in results
- [ ] Shows +X pts for each player
- [ ] Green color for positive changes
- [ ] Current player highlighted

---

### Task 4: Add Score Reset Button (Admin Only) (30 mins)
**File**: `app/src/app/[roomId]/page.tsx`

**Subtasks**:
1. Add reset scores button in lobby (admin only)
2. Add confirmation dialog
3. Send `reset_scores` WebSocket event
4. Handle `scores_reset` event

**Code Changes**:
```typescript
{/* In lobby, after timer config */}
{isAdmin && (
    <div className="mt-4">
        <button
            onClick={() => {
                if (confirm('Reset all player scores to 0? This cannot be undone.')) {
                    wsRef.current?.send(JSON.stringify({ type: 'reset_scores' }));
                }
            }}
            className="bg-red-900 hover:bg-red-800 text-white text-sm font-bold py-2 px-4 rounded border-b-4 border-red-950 active:border-b-0 active:translate-y-1 transition-all"
        >
            🔄 RESET ALL SCORES
        </button>
    </div>
)}
```

**WebSocket Handler Update**:
```typescript
ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (
        message.type === 'room_state_update' ||
        message.type === 'game_started' ||
        message.type === 'scores_reset' || // NEW
        // ... other types
    ) {
        setRoomState(message.room);
    }
};
```

**Acceptance Criteria**:
- [ ] Button only visible to admin
- [ ] Confirmation dialog prevents accidents
- [ ] Scores reset to 0 for all players
- [ ] Leaderboard updates immediately

---

### Task 5: Update WebSocket Message Handler (15 mins)
**File**: `app/src/app/[roomId]/page.tsx`

**Subtasks**:
1. Handle `roles_revealed` event with score changes
2. Store score changes in state (optional)
3. Ensure room state updates trigger re-render

**Code Changes**:
```typescript
ws.onmessage = (event) => {
    try {
        const message = JSON.parse(event.data);
        if (
            message.type === 'room_state_update' ||
            message.type === 'game_started' ||
            message.type === 'round_ended' ||
            message.type === 'voting_started' ||
            message.type === 'vote_tallied' ||
            message.type === 'roles_revealed' || // Includes scoreChanges
            message.type === 'scores_reset'
        ) {
            setRoomState(message.room);
            // Optionally store scoreChanges separately for animation
        }
    } catch (e) {
        console.error('Failed to parse WS message', e);
    }
};
```

**Acceptance Criteria**:
- [ ] Score updates received via WebSocket
- [ ] Leaderboard re-renders with new scores
- [ ] No console errors

---

### Task 6: Testing & Polish (60 mins)

**Test Scenarios**:
```bash
# Test 1: Leaderboard display
1. Create room with 3+ players
2. Verify leaderboard shows all players
3. Verify sorting by score
4. Verify current player highlighted

# Test 2: Score accumulation
1. Play 3 rounds
2. Verify scores accumulate correctly
3. Verify leaderboard updates after each round
4. Verify rank changes if applicable

# Test 3: Score reset
1. Admin clicks reset scores
2. Confirm dialog appears
3. Verify all scores reset to 0
4. Verify leaderboard updates

# Test 4: Results screen
1. Complete a game
2. Verify score changes shown
3. Verify +X pts displayed correctly
4. Verify new totals correct

# Test 5: Edge cases
1. Player with 0 games played
2. Player reconnects after game
3. Verify scores persist correctly
```

**Polish Tasks**:
- [ ] Add score increase animation (CSS transition)
- [ ] Add trophy icons for top 3
- [ ] Add win rate percentage (optional)
- [ ] Ensure mobile responsiveness
- [ ] Match pixel art theme perfectly

**Acceptance Criteria**:
- [ ] All test scenarios pass
- [ ] UI matches pixel art theme
- [ ] Responsive on mobile + desktop
- [ ] No TypeScript errors

---

## 📊 Summary

| Task | File | Time | Priority |
|------|------|------|----------|
| 1. Create Leaderboard Component | `app/src/app/[roomId]/page.tsx` | 60m | P0 |
| 2. Integrate into Lobby | `app/src/app/[roomId]/page.tsx` | 30m | P0 |
| 3. Add to Results Screen | `app/src/app/[roomId]/page.tsx` | 45m | P0 |
| 4. Score Reset Button | `app/src/app/[roomId]/page.tsx` | 30m | P1 |
| 5. WebSocket Handler | `app/src/app/[roomId]/page.tsx` | 15m | P0 |
| 6. Testing & Polish | Manual testing | 60m | P0 |
| **Total** | | **4h** | |

---

## 🚀 Execution Order
1. ✅ Task 5: WebSocket handler (infrastructure)
2. ✅ Task 1: Leaderboard component (core UI)
3. ✅ Task 2: Integrate into lobby (integration)
4. ✅ Task 3: Results screen (end-game display)
5. ✅ Task 4: Score reset (admin feature)
6. ✅ Task 6: Full testing & polish

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Leaderboard re-render issues | Scores don't update | Ensure proper React state management |
| Mobile layout broken | Poor UX on phones | Test on multiple screen sizes |
| Score reset accidents | Lost progress | Confirmation dialog, admin-only |
| Ties in rankings | Confusing display | Show tied ranks (e.g., #2, #2, #4) |

---

## 📝 Notes
- Keep pixel art theme consistent
- Use TailwindCSS for all styling
- Consider extracting Leaderboard to separate component if it grows
- Add optional animations for better UX
- Consider showing "Games Won" and "Win Rate" in future
