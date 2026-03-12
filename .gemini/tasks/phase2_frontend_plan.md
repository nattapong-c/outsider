# Phase 2 Frontend Implementation Plan - Showdown & Voting

## 📋 Overview
**Goal**: Implement frontend UI for showdown phase with configurable voting modes  
**Estimated Time**: 5-7 hours  
**Priority**: High  
**Dependencies**: Phase 1 completion, Phase 2 backend API

---

## 🎯 Task Breakdown

### Task 1: Update Timer Config State & UI (30 mins)
**File**: `app/src/app/[roomId]/page.tsx`

**Subtasks**:
1. Update `localTimerConfig` state type
2. Replace `autoTransition` checkbox with `votingMode` dropdown
3. Update WebSocket event payload
4. Add type definitions for voting mode

**Code Changes**:
```typescript
// Update state
const [localTimerConfig, setLocalTimerConfig] = useState({ 
    quiz: 180, 
    discussion: 180, 
    votingMode: 'auto' as 'auto' | 'manual' 
})

// Update timer config UI section
<div className="flex justify-between items-center pt-2">
    <label className="text-gray-300">Voting Mode</label>
    <select
        value={localTimerConfig.votingMode}
        onChange={(e) => {
            const newConfig = { 
                ...localTimerConfig, 
                votingMode: e.target.value as 'auto' | 'manual' 
            }
            setLocalTimerConfig(newConfig)
            wsRef.current?.send(JSON.stringify({ 
                type: 'update_timer_config', 
                config: newConfig 
            }))
        }}
        className="p-2 bg-gray-800 border border-gray-600 rounded text-white"
    >
        <option value="auto">Auto (Timer)</option>
        <option value="manual">Manual (Host Control)</option>
    </select>
</div>
```

**Acceptance Criteria**:
- [ ] Dropdown shows both options
- [ ] Selection persists in room state
- [ ] Backend receives correct payload
- [ ] UI reflects current voting mode

---

### Task 2: Create Showdown Discussion Component (45 mins)
**File**: `app/src/app/[roomId]/page.tsx`

**Subtasks**:
1. Add conditional rendering for `showdown_discussion` status
2. Create phase header (purple theme)
3. Display discussion timer
4. Add host-only manual start button (manual mode)
5. Add auto-transition message (auto mode)

**Code Changes**:
```typescript
{roomState?.status === 'showdown_discussion' && (
    <div className="flex-1 flex flex-col">
        {/* Phase Header */}
        <div className="bg-purple-900/30 border-4 border-purple-600 p-6 rounded-lg mb-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-2">
                🎯 SHOWDOWN PHASE
            </h2>
            <p className="text-gray-300">
                Discuss and analyze: Who is the Insider? The word has been guessed!
            </p>
        </div>

        {/* Host Controls - Manual Mode Only */}
        {currentPlayer?.inGameRole === 'host' && roomState.timerConfig.votingMode === 'manual' && (
            <div className="mb-6">
                <button
                    onClick={() => wsRef.current?.send(JSON.stringify({ type: 'start_voting' }))}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-8 rounded border-b-4 border-purple-800 hover:border-purple-700 active:border-b-0 active:translate-y-1 transition-all text-xl w-full"
                >
                    🗳️ START VOTING PHASE
                </button>
            </div>
        )}

        {/* Waiting State - Auto Mode */}
        <div className="flex-1 flex items-center justify-center border-4 border-dashed border-purple-700 rounded-lg p-8">
            <p className="text-purple-300 text-xl text-center">
                {roomState.timerConfig.votingMode === 'auto' 
                    ? `Voting will start automatically when timer ends`
                    : `Waiting for Host to start voting...`
                }
            </p>
        </div>
    </div>
)}
```

**Acceptance Criteria**:
- [ ] Phase renders only in showdown_discussion
- [ ] Purple theme applied correctly
- [ ] Timer displays countdown
- [ ] Host sees manual start button (manual mode only)
- [ ] Auto mode shows waiting message
- [ ] Button sends correct WebSocket event

---

### Task 3: Create Voting Phase Component (90 mins)
**File**: `app/src/app/[roomId]/page.tsx`

**Subtasks**:
1. Add conditional rendering for `showdown_voting` status
2. Create phase header (red theme)
3. Implement vote count progress bar
4. Create voting cards grid (Commons/Insider only)
5. Implement vote state management (hasVoted, votedFor)
6. Add host waiting view
7. Add reveal roles button (host only)

**Code Changes**:
```typescript
{roomState?.status === 'showdown_voting' && (
    <div className="flex-1 flex flex-col">
        {/* Phase Header */}
        <div className="bg-red-900/30 border-4 border-red-600 p-6 rounded-lg mb-6">
            <h2 className="text-2xl font-bold text-red-400 mb-2">
                🗳️ VOTING PHASE
            </h2>
            <p className="text-gray-300">
                Vote for who you think is the Insider!
            </p>
        </div>

        {/* Vote Count Progress */}
        <div className="mb-6 bg-gray-900 p-4 rounded border-2 border-gray-700">
            <p className="text-gray-400 text-sm mb-2">Votes Submitted</p>
            <div className="text-3xl font-bold text-white">
                {roomState.votes?.length || 0} / {roomState.players?.filter((p: any) => p.inGameRole !== 'host').length}
            </div>
            <div className="w-full bg-gray-700 rounded-full h-4 mt-2">
                <div 
                    className="bg-red-600 h-4 rounded-full transition-all"
                    style={{ 
                        width: `${((roomState.votes?.length || 0) / Math.max(1, roomState.players?.filter((p: any) => p.inGameRole !== 'host').length)) * 100}%` 
                    }}
                ></div>
            </div>
        </div>

        {/* Voting Cards - Commons & Insider Only */}
        {currentPlayer?.inGameRole !== 'host' && (
            <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-300 mb-4">Cast Your Vote</h3>
                <div className="grid grid-cols-2 gap-4">
                    {roomState.players
                        .filter((p: any) => p.deviceId !== deviceId && p.inGameRole !== 'host')
                        .map((player: any) => {
                            const hasVoted = roomState.votes?.some((v: any) => v.voterId === currentPlayer.id)
                            const votedForMe = roomState.votes?.some((v: any) => 
                                v.targetId === player.id && v.voterId === currentPlayer.id
                            )
                            
                            return (
                                <button
                                    key={player.id}
                                    onClick={() => {
                                        if (!hasVoted || votedForMe) {
                                            wsRef.current?.send(JSON.stringify({ 
                                                type: 'submit_vote', 
                                                targetId: player.id 
                                            }))
                                        }
                                    }}
                                    disabled={hasVoted && !votedForMe}
                                    className={`p-4 rounded border-4 transition-all ${
                                        votedForMe
                                            ? 'bg-red-600 border-red-400 text-white font-bold'
                                            : hasVoted
                                            ? 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'
                                            : 'bg-gray-800 border-gray-600 hover:bg-red-900/50 hover:border-red-600 text-white'
                                    }`}
                                >
                                    <div className="text-lg">{player.name}</div>
                                    {votedForMe && <div className="text-sm">✓ Selected</div>}
                                    {hasVoted && !votedForMe && <div className="text-sm">Vote Submitted</div>}
                                </button>
                            )
                        })
                    }
                </div>
            </div>
        )}

        {/* Host View */}
        {currentPlayer?.inGameRole === 'host' && (
            <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-400 text-xl">
                    Waiting for all players to vote...
                </p>
            </div>
        )}

        {/* Reveal Roles Button - Host Only */}
        {currentPlayer?.inGameRole === 'host' && (
            <div className="mt-6">
                <button
                    onClick={() => wsRef.current?.send(JSON.stringify({ type: 'reveal_roles' }))}
                    disabled={roomState.votes?.length < roomState.players?.filter((p: any) => p.inGameRole !== 'host').length}
                    className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded border-b-4 border-yellow-800 hover:border-yellow-700 active:border-b-0 active:translate-y-1 transition-all text-xl disabled:border-gray-600"
                >
                    🔓 REVEAL ROLES & RESULTS
                </button>
                <p className="text-gray-500 text-sm mt-2 text-center">
                    All players must vote before revealing
                </p>
            </div>
        )}
    </div>
)}
```

**Acceptance Criteria**:
- [ ] Phase renders only in showdown_voting
- [ ] Red theme applied correctly
- [ ] Vote count displays accurately
- [ ] Progress bar fills correctly
- [ ] Voting cards exclude host and self
- [ ] Vote states render correctly (not voted, selected, submitted)
- [ ] Vote changes allowed
- [ ] Host sees waiting view
- [ ] Reveal button disabled until all votes cast
- [ ] WebSocket events sent correctly

---

### Task 4: Create Game Results Component (60 mins)
**File**: `app/src/app/[roomId]/page.tsx`

**Subtasks**:
1. Add conditional rendering for `completed` status
2. Create winner announcement banner
3. Display win condition breakdown
4. Create role reveal grid
5. Display voting results list
6. Add play again button (admin only)

**Code Changes**:
```typescript
{roomState?.status === 'completed' && roomState.gameResult && (
    <div className="flex-1 flex flex-col">
        {/* Winner Announcement */}
        <div className={`p-8 rounded-lg border-4 mb-6 ${
            roomState.gameResult.winner === 'commons'
                ? 'bg-green-900/40 border-green-500'
                : 'bg-red-900/40 border-red-500'
        }`}>
            <h2 className={`text-4xl font-bold mb-4 text-center ${
                roomState.gameResult.winner === 'commons' ? 'text-green-400' : 'text-red-400'
            }`}>
                {roomState.gameResult.winner === 'commons' ? '🎉 COMMONS WIN! 🎉' : '👤 INSIDER WINS! 👤'}
            </h2>
            <div className="grid grid-cols-2 gap-4 text-center text-xl">
                <div className="bg-gray-900 p-4 rounded">
                    <p className="text-gray-400 text-sm">Word Guessed</p>
                    <p className={roomState.gameResult.wordGuessed ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                        {roomState.gameResult.wordGuessed ? '✅ YES' : '❌ NO'}
                    </p>
                </div>
                <div className="bg-gray-900 p-4 rounded">
                    <p className="text-gray-400 text-sm">Insider Identified</p>
                    <p className={roomState.gameResult.insiderIdentified ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                        {roomState.gameResult.insiderIdentified ? '✅ YES' : '❌ NO'}
                    </p>
                </div>
            </div>
        </div>

        {/* Role Reveals */}
        <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-300 mb-4">Player Roles</h3>
            <div className="grid grid-cols-2 gap-4">
                {roomState.players.map((player: any) => (
                    <div
                        key={player.id}
                        className={`p-4 rounded border-4 ${
                            player.inGameRole === 'host'
                                ? 'bg-yellow-900/30 border-yellow-600'
                                : player.inGameRole === 'insider'
                                ? 'bg-red-900/30 border-red-600'
                                : 'bg-blue-900/30 border-blue-600'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            {player.isAdmin && <span>👑</span>}
                            <span className="font-bold text-lg">{player.name}</span>
                            {player.deviceId === deviceId && <span className="text-blue-400">(You)</span>}
                        </div>
                        <div className={`text-xl mt-2 font-bold ${
                            player.inGameRole === 'host' ? 'text-yellow-400' :
                            player.inGameRole === 'insider' ? 'text-red-400' : 'text-blue-400'
                        }`}>
                            {player.inGameRole?.toUpperCase()}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Voting Results */}
        {roomState.votes && roomState.votes.length > 0 && (
            <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-300 mb-4">Voting Results</h3>
                <div className="bg-gray-900 p-6 rounded border-2 border-gray-700">
                    {roomState.players
                        .filter((p: any) => p.inGameRole !== 'host')
                        .map((voter: any) => {
                            const vote = roomState.votes.find((v: any) => v.voterId === voter.id)
                            const target = roomState.players.find((p: any) => p.id === vote?.targetId)
                            
                            return (
                                <div key={voter.id} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold">{voter.name}</span>
                                        <span className="text-gray-500">voted for</span>
                                        <span className={`font-bold ${
                                            target?.inGameRole === 'insider' ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                            {target?.name || 'Unknown'}
                                        </span>
                                    </div>
                                    {vote && target && (
                                        <span className={target.inGameRole === 'insider' ? 'text-green-400' : 'text-red-400'}>
                                            {target.inGameRole === 'insider' ? '✅ Correct' : '❌ Wrong'}
                                        </span>
                                    )}
                                </div>
                            )
                        })
                    }
                </div>
            </div>
        )}

        {/* Play Again - Admin Only */}
        {isAdmin && (
            <div className="mt-6">
                <button
                    onClick={() => wsRef.current?.send(JSON.stringify({ type: 'end_round' }))}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded border-b-4 border-blue-800 hover:border-blue-700 active:border-b-0 active:translate-y-1 transition-all text-xl"
                >
                    🔄 PLAY AGAIN (Reset to Lobby)
                </button>
            </div>
        )}
    </div>
)}
```

**Acceptance Criteria**:
- [ ] Phase renders only in completed status
- [ ] Winner banner shows correct theme (green/red)
- [ ] Win conditions display accurately
- [ ] Role grid shows all players with correct colors
- [ ] Voting results list displays all votes
- [ ] Vote accuracy indicators correct (green for insider, red for common)
- [ ] Play again button visible only to admin
- [ ] Button resets to lobby correctly

---

### Task 5: Update WebSocket Message Handler (30 mins)
**File**: `app/src/app/[roomId]/page.tsx`

**Subtasks**:
1. Add handlers for new event types
2. Update `ws.onmessage` to handle:
   - `voting_started`
   - `vote_tallied`
   - `roles_revealed`
3. Ensure state updates trigger re-renders

**Code Changes**:
```typescript
ws.onmessage = (event) => {
    try {
        const message = JSON.parse(event.data)
        switch (message.type) {
            case 'room_state_update':
            case 'game_started':
            case 'round_ended':
            case 'voting_started':  // NEW
            case 'vote_tallied':    // NEW
            case 'roles_revealed':  // NEW
                setRoomState(message.room)
                break
        }
    } catch (e) {
        console.error('Failed to parse WS message', e)
    }
}
```

**Acceptance Criteria**:
- [ ] All new event types handled
- [ ] State updates trigger UI re-renders
- [ ] No console errors
- [ ] Vote count updates in real-time

---

### Task 6: Add Type Definitions (15 mins)
**File**: `app/src/app/[roomId]/page.tsx` or `app/src/types/game.ts` (if exists)

**Subtasks**:
1. Add type for Vote
2. Add type for GameResult
3. Update RoomState type with new fields
4. Ensure TypeScript compilation succeeds

**Code Changes**:
```typescript
type Vote = {
    voterId: string
    targetId: string
}

type GameResult = {
    winner: 'commons' | 'insider'
    insiderIdentified: boolean
    wordGuessed: boolean
}

type RoomStatus = 
    | 'lobby'
    | 'playing'
    | 'showdown_discussion'
    | 'showdown_voting'
    | 'completed'

type VotingMode = 'auto' | 'manual'
```

**Acceptance Criteria**:
- [ ] No TypeScript errors
- [ ] Types match backend schemas
- [ ] Eden Treaty infers correctly

---

### Task 7: Testing & Polish (60 mins)

**Subtasks**:
1. Test voting mode selection in lobby
2. Test discussion phase (auto vs manual)
3. Test voting flow:
   - Vote submission
   - Vote changes
   - Vote count updates
   - Reveal button state
4. Test results screen:
   - Winner display
   - Role reveals
   - Voting breakdown
5. Test edge cases:
   - Player disconnects
   - Host leaves
   - Not all votes cast
6. Polish UI:
   - Responsive design
   - Loading states
   - Error messages
   - Pixel art styling consistency

**Test Scenarios**:
```typescript
// Auto mode flow
1. Set votingMode='auto' in lobby
2. Start game
3. Verify discussion timer counts down
4. Verify auto-transition to voting
5. Cast vote, verify progress bar updates
6. Host reveals, verify results screen

// Manual mode flow
1. Set votingMode='manual' in lobby
2. Start game
3. Verify host sees "Start Voting" button
4. Host clicks button
5. Verify voting phase starts
6. Cast vote, verify progress bar updates
7. Host reveals, verify results screen

// Vote validation
1. Try to vote for self (should be filtered out)
2. Try to vote for host (should be filtered out)
3. Cast vote, verify can change vote
4. Verify vote count updates for all players
```

**Acceptance Criteria**:
- [ ] All flows work smoothly
- [ ] No console errors
- [ ] UI responsive on mobile + desktop
- [ ] Pixel art theme consistent
- [ ] Loading states appropriate
- [ ] Error messages clear

---

## 📊 Summary

| Task | File | Time | Priority |
|------|------|------|----------|
| 1. Timer Config Update | `app/src/app/[roomId]/page.tsx` | 30m | P0 |
| 2. Discussion Phase UI | `app/src/app/[roomId]/page.tsx` | 45m | P0 |
| 3. Voting Phase UI | `app/src/app/[roomId]/page.tsx` | 90m | P0 |
| 4. Results Screen UI | `app/src/app/[roomId]/page.tsx` | 60m | P0 |
| 5. WebSocket Handler | `app/src/app/[roomId]/page.tsx` | 30m | P0 |
| 6. Type Definitions | `app/src/app/[roomId]/page.tsx` | 15m | P1 |
| 7. Testing & Polish | Manual testing | 60m | P0 |
| **Total** | | **5h 30m** | |

---

## 🚀 Execution Order
1. ✅ Task 6: Type definitions (foundation, unblocks other tasks)
2. ✅ Task 1: Timer config update (configuration)
3. ✅ Task 5: WebSocket handler (infrastructure)
4. ✅ Task 2: Discussion phase UI (first phase)
5. ✅ Task 3: Voting phase UI (core mechanic)
6. ✅ Task 4: Results screen UI (end game)
7. ✅ Task 7: Full testing & polish

---

## 🎨 UI Component Hierarchy

```
RoomPage
├── Header (existing)
├── PlayerList Sidebar (existing)
└── GameArea
    ├── LobbyPhase (existing)
    ├── QuizPhase (existing)
    ├── ShowdownDiscussion (NEW - Task 2)
    │   ├── PhaseHeader (purple)
    │   ├── HostManualStartButton
    │   └── AutoTransitionMessage
    ├── ShowdownVoting (NEW - Task 3)
    │   ├── PhaseHeader (red)
    │   ├── VoteCountProgress
    │   ├── VotingCards (Commons/Insider)
    │   ├── HostWaitingView
    │   └── RevealRolesButton
    └── GameCompleted (NEW - Task 4)
        ├── WinnerBanner
        ├── WinConditionBreakdown
        ├── RoleRevealGrid
        ├── VotingResultsList
        └── PlayAgainButton
```

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| State sync issues | Vote count out of sync | Use server-authoritative state from room |
| WebSocket disconnect | Vote not submitted | Add retry logic, show confirmation |
| Type mismatch | Eden inference fails | Ensure backend schemas exported correctly |
| Responsive issues | Mobile UI broken | Test on multiple screen sizes |
| Theme inconsistency | Pixel art style broken | Reuse existing button/card components |

---

## 📝 Notes
- Maintain pixel art aesthetic throughout (bold borders, shadows, monospace)
- Use color coding consistently (purple=discussion, red=voting, green=win, red=lose)
- Keep conditional rendering logic clear and maintainable
- Consider extracting components to separate files if page.tsx becomes too large
- Add loading spinners for async operations (vote submission, reveal)
