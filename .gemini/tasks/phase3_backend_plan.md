# Phase 3 Backend Implementation Plan - Scoring System

## 📋 Overview
**Goal**: Implement persistent scoring system with player rankings  
**Estimated Time**: 3-4 hours  
**Priority**: High  
**Dependencies**: Phase 2 completion (voting, game results)

---

## 🎯 Task Breakdown

### Task 1: Update Player Schema (30 mins)
**File**: `service/src/models/room.ts`

**Subtasks**:
1. Add score fields to `PlayerSchema`
2. Add score fields to `playerMongooseSchema`
3. Set default values (0 for all counters)
4. Export new types

**Code Changes**:
```typescript
// Elysia Schema
export const PlayerSchema = t.Object({
    id: t.String(),
    name: t.String(),
    deviceId: t.String(),
    isAdmin: t.Boolean(),
    isOnline: t.Boolean(),
    inGameRole: t.Union([t.Literal('host'), t.Literal('insider'), t.Literal('common'), t.Null()]),
    score: t.Number(),
    gamesPlayed: t.Number(),
    gamesWon: t.Number(),
    insiderCaught: t.Number()
});

// Mongoose Schema
const playerMongooseSchema = new Schema<PlayerType>({
    // ... existing fields
    score: { type: Number, required: true, default: 0 },
    gamesPlayed: { type: Number, required: true, default: 0 },
    gamesWon: { type: Number, required: true, default: 0 },
    insiderCaught: { type: Number, required: true, default: 0 }
}, { _id: false });
```

**Acceptance Criteria**:
- [ ] TypeScript compiles without errors
- [ ] Eden Treaty infers new fields
- [ ] MongoDB schema validation works
- [ ] Default values set correctly

---

### Task 2: Create Score Calculation Service (45 mins)
**File**: `service/src/services/score-service.ts` (NEW)

**Subtasks**:
1. Create score calculation logic
2. Export scoring rules as constants
3. Create function to calculate scores per role
4. Handle edge cases

**Code**:
```typescript
// Scoring rules
export const SCORES = {
    COMMON_CORRECT_VOTE: 2,
    COMMON_PARTICIPATION: 1,
    INSIDER_WIN: 3,
    HOST_SUCCESS: 2
} as const;

export function calculatePlayerScores(
    players: PlayerType[],
    votes: VoteType[],
    gameResult: GameResultType
) {
    const insider = players.find(p => p.inGameRole === 'insider');
    const scoreUpdates = new Map<string, number>();

    players.forEach(player => {
        let scoreChange = 0;

        // Skip scoring for host - host is neutral facilitator
        if (player.inGameRole === 'host') {
            scoreUpdates.set(player.id, 0);
            return;
        }

        if (player.inGameRole === 'common') {
            // Common: +1 for word guessed
            if (gameResult.wordGuessed) {
                scoreChange += SCORES.COMMON_PARTICIPATION;
            }
            
            // Common: +2 for correct insider vote
            if (gameResult.insiderIdentified) {
                const playerVote = votes.find(v => v.voterId === player.id);
                if (playerVote && playerVote.targetId === insider?.id) {
                    scoreChange += SCORES.COMMON_CORRECT_VOTE;
                }
            }
        } else if (player.inGameRole === 'insider') {
            // Insider: +3 for win
            if (gameResult.winner === 'insider') {
                scoreChange += SCORES.INSIDER_WIN;
            }
        }

        scoreUpdates.set(player.id, scoreChange);
    });

    return scoreUpdates;
}
```

**Acceptance Criteria**:
- [ ] Scoring rules match specification
- [ ] Handles all roles correctly
- [ ] Returns map of playerId → scoreChange
- [ ] Unit tests pass (if implemented)

---

### Task 3: Update Game Reveal Handler (45 mins)
**File**: `service/src/controllers/ws-controller.ts`

**Subtasks**:
1. Import score service
2. Calculate scores after game result
3. Update player scores in database
4. Increment gamesPlayed and gamesWon
5. Broadcast score update event

**Code Changes**:
```typescript
import { calculatePlayerScores } from '../services/score-service';

// In reveal_roles handler, after calculating gameResult:
room.status = 'completed';
room.gameResult = {
    winner: commonsWin ? 'commons' : 'insider',
    insiderIdentified,
    wordGuessed
};

// Calculate and update scores
const scoreChanges = calculatePlayerScores(room.players, room.votes, room.gameResult);

// Update each player's score
room.players.forEach(player => {
    const scoreChange = scoreChanges.get(player.id) || 0;
    
    // Skip score and games tracking for host
    if (player.inGameRole === 'host') {
        return; // Host doesn't get scores or games counted
    }
    
    player.score += scoreChange;
    player.gamesPlayed += 1;
    
    // Track wins
    if (
        (player.inGameRole === 'common' && commonsWin) ||
        (player.inGameRole === 'insider' && !commonsWin)
    ) {
        player.gamesWon += 1;
    }
    
    // Track insider caught
    if (player.inGameRole === 'insider' && insiderIdentified) {
        player.insiderCaught += 1;
    }
});

await room.save();

// Broadcast with score updates
const revealPayload = JSON.stringify({
    type: 'roles_revealed',
    room: room.toJSON(),
    votes: room.votes,
    result: room.gameResult,
    scoreChanges: Object.fromEntries(scoreChanges)
});
ws.publish(`room:${roomId}`, revealPayload);
```

**Acceptance Criteria**:
- [ ] Scores calculated after game ends
- [ ] All player stats updated correctly
- [ ] Score changes included in broadcast
- [ ] Database persists all changes

---

### Task 4: Add Score Reset Handler (30 mins)
**File**: `service/src/controllers/ws-controller.ts`

**Subtasks**:
1. Add `reset_scores` event handler
2. Validate admin permissions
3. Reset all player scores to 0
4. Broadcast updated room state

**Code**:
```typescript
// Admin Actions section
if (player.isAdmin && parsedMessage.type === 'reset_scores') {
    logger.info({ roomId, deviceId }, 'Admin reset all scores');
    
    room.players.forEach(p => {
        p.score = 0;
        p.gamesPlayed = 0;
        p.gamesWon = 0;
        p.insiderCaught = 0;
    });
    
    await room.save();
    
    const updatePayload = JSON.stringify({ 
        type: 'scores_reset', 
        room: room.toJSON() 
    });
    ws.publish(`room:${roomId}`, updatePayload);
    ws.send(updatePayload);
}
```

**Acceptance Criteria**:
- [ ] Only admin can reset scores
- [ ] All score fields reset to 0
- [ ] Broadcast to all players
- [ ] Database updated

---

### Task 5: Update Room Creation (15 mins)
**File**: `service/src/controllers/room-controller.ts`

**Subtasks**:
1. Update room creation to include score fields
2. Set default values for new players

**Code Changes**:
```typescript
// In room join handler, when creating new player:
const newPlayer: PlayerType = {
    id: crypto.randomUUID(),
    name,
    deviceId,
    isAdmin: room.players.length === 0,
    isOnline: true,
    inGameRole: null,
    score: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    insiderCaught: 0
};
```

**Acceptance Criteria**:
- [ ] New players start with 0 scores
- [ ] Existing players retain scores
- [ ] No breaking changes to join flow

---

### Task 6: Testing & Validation (45 mins)

**Test Scenarios**:
```bash
# Test 1: Commons win
1. Start game, commons guess word
2. All commons vote for insider correctly
3. Verify: Commons +3 (1+2), Insider +0, Host +0 (no scoring)

# Test 2: Insider win (word not guessed)
1. Start game, timer expires
2. Verify: Insider +3, Commons +0, Host +0 (no scoring)

# Test 3: Insider win (wrong vote)
1. Start game, word guessed
2. Commons vote for wrong player
3. Verify: Insider +3, Commons +1 (participation only), Host +0 (no scoring)

# Test 4: Multiple rounds
1. Play 3 rounds with same players
2. Verify scores accumulate correctly
3. Verify gamesPlayed increments only when NOT host
4. Verify host rounds are skipped in gamesPlayed

# Test 5: Score reset
1. Admin resets scores
2. Verify all scores = 0
3. Verify stats reset to 0

# Test 6: Host rotation
1. Player A is host round 1
2. Player B is host round 2
3. Verify: Player A gamesPlayed counts round 2 only
4. Verify: Player B gamesPlayed counts round 1 only
```

**Acceptance Criteria**:
- [ ] All test scenarios pass
- [ ] Scores calculated correctly
- [ ] Database persistence works
- [ ] Broadcast events received

---

## 📊 Summary

| Task | File | Time | Priority |
|------|------|------|----------|
| 1. Update Player Schema | `service/src/models/room.ts` | 30m | P0 |
| 2. Create Score Service | `service/src/services/score-service.ts` | 45m | P0 |
| 3. Update Reveal Handler | `service/src/controllers/ws-controller.ts` | 45m | P0 |
| 4. Add Score Reset | `service/src/controllers/ws-controller.ts` | 30m | P1 |
| 5. Update Room Creation | `service/src/controllers/room-controller.ts` | 15m | P0 |
| 6. Testing | Manual + Bun test | 45m | P0 |
| **Total** | | **3h 30m** | |

---

## 🚀 Execution Order
1. ✅ Task 1: Schema updates (foundation)
2. ✅ Task 5: Room creation (unblocks testing)
3. ✅ Task 2: Score service (core logic)
4. ✅ Task 3: Reveal handler (integration)
5. ✅ Task 4: Score reset (admin feature)
6. ✅ Task 6: Full testing

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Score calculation errors | Wrong scores | Unit test score service thoroughly |
| Database migration | Existing rooms break | Add migration script or handle null values |
| Player reconnection | Score lost on disconnect | Tie scores to deviceId, not session |
| Race conditions | Concurrent score updates | Use atomic MongoDB operations if needed |

---

## 📝 Notes
- Keep scoring rules in constants for easy adjustment
- Log score changes for debugging
- Consider adding score history in Phase 4
- Ensure type safety with Eden Treaty
