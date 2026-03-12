# Phase 2 Backend Implementation Plan - Showdown & Voting

## 📋 Overview
**Goal**: Implement backend logic for showdown phase with configurable voting modes  
**Estimated Time**: 4-6 hours  
**Priority**: High  
**Dependencies**: Phase 1 completion (room management, game start, quiz phase)

---

## 🎯 Task Breakdown

### Task 1: Update Room Schema (30 mins)
**File**: `service/src/models/room.ts`

**Subtasks**:
1. Add `VoteSchema` for vote storage
2. Add `GameResultSchema` for final results
3. Update `RoomSchema.status` enum to include:
   - `'showdown_voting'`
   - `'completed'`
4. Update `TimerConfigSchema`:
   - Replace `autoTransition: boolean` with `votingMode: 'auto' | 'manual'`
5. Add new fields to Mongoose schema:
   - `votes: VoteSchema[]`
   - `gameResult: GameResultSchema | null`

**Code Changes**:
```typescript
// Add new schemas
export const VoteSchema = t.Object({
    voterId: t.String(),
    targetId: t.String()
})

export const GameResultSchema = t.Object({
    winner: t.Union([t.Literal('commons'), t.Literal('insider')]),
    insiderIdentified: t.Boolean(),
    wordGuessed: t.Boolean()
})

// Update TimerConfigSchema
export const TimerConfigSchema = t.Object({
    quiz: t.Number(),
    discussion: t.Number(),
    votingMode: t.Union([t.Literal('auto'), t.Literal('manual')])
})

// Update RoomSchema
export const RoomSchema = t.Object({
    roomId: t.String(),
    status: t.Union([
        t.Literal('lobby'),
        t.Literal('playing'),
        t.Literal('showdown_discussion'),
        t.Literal('showdown_voting'),
        t.Literal('completed')
    ]),
    // ... existing fields
    votes: t.Array(VoteSchema),
    gameResult: t.Union([GameResultSchema, t.Null()])
})

// Update Mongoose schemas accordingly
```

**Acceptance Criteria**:
- [ ] TypeScript compiles without errors
- [ ] Eden Treaty infers correct types
- [ ] MongoDB schema validation works
- [ ] Default values set correctly (`votingMode: 'auto'`, `votes: []`, `gameResult: null`)

---

### Task 2: Update Timer Config Handler (20 mins)
**File**: `service/src/controllers/ws-controller.ts`

**Subtasks**:
1. Update `update_timer_config` handler to accept `votingMode`
2. Deprecate `autoTransition` field (backward compatibility)
3. Validate votingMode values

**Code Changes**:
```typescript
if (parsedMessage.type === 'update_timer_config') {
    if (parsedMessage.config) {
        room.timerConfig = {
            quiz: parsedMessage.config.quiz || 180,
            discussion: parsedMessage.config.discussion || 180,
            votingMode: parsedMessage.config.votingMode || 'auto'
        }
        await room.save()
        // ... broadcast update
    }
}
```

**Acceptance Criteria**:
- [ ] Admin can set votingMode to 'auto' or 'manual'
- [ ] Invalid votingMode values rejected
- [ ] State broadcasts correctly to all clients

---

### Task 3: Implement Auto-Transition Logic (40 mins)
**File**: `service/src/controllers/ws-controller.ts`

**Subtasks**:
1. Update `game_started` handler to check `votingMode`
2. Replace `autoTransition` checks with `votingMode === 'auto'`
3. Update setTimeout callback to transition to `showdown_voting`
4. Handle discussion timer expiry for auto mode

**Code Changes**:
```typescript
// In game_started handler, after setting status to 'playing'
if (room.timerConfig.votingMode === 'auto') {
    // Quiz timer timeout - auto transition to showdown_discussion
    setTimeout(async () => {
        const currentRoom = await RoomModel.findOne({ roomId })
        if (currentRoom && currentRoom.status === 'playing') {
            currentRoom.status = 'showdown_discussion'
            currentRoom.phaseEndTime = Date.now() + (currentRoom.timerConfig.discussion * 1000)
            await currentRoom.save()
            // Broadcast transition
            
            // Set up second timeout for discussion -> voting
            setTimeout(async () => {
                const discussionRoom = await RoomModel.findOne({ roomId })
                if (discussionRoom && discussionRoom.status === 'showdown_discussion') {
                    discussionRoom.status = 'showdown_voting'
                    discussionRoom.phaseEndTime = null
                    discussionRoom.votes = []
                    await discussionRoom.save()
                    ws.publish(`room:${roomId}`, JSON.stringify({ 
                        type: 'voting_started', 
                        room: discussionRoom.toJSON() 
                    }))
                }
            }, room.timerConfig.discussion * 1000)
        }
    }, room.timerConfig.quiz * 1000)
}
```

**Acceptance Criteria**:
- [ ] Auto mode transitions: playing → showdown_discussion → showdown_voting
- [ ] Manual mode stops at showdown_discussion
- [ ] Timers fire at correct intervals
- [ ] State broadcasts to all clients

---

### Task 4: Implement Manual Start Voting Handler (20 mins)
**File**: `service/src/controllers/ws-controller.ts`

**Subtasks**:
1. Add `start_voting` event handler
2. Validate host role
3. Validate current state is `showdown_discussion`
4. Transition to `showdown_voting`
5. Broadcast `voting_started` event

**Code Changes**:
```typescript
// Host Actions section
if (player.inGameRole === 'host') {
    if (parsedMessage.type === 'start_voting' && room.status === 'showdown_discussion') {
        logger.info({ roomId, deviceId }, 'Host manually started voting phase')
        room.status = 'showdown_voting'
        room.phaseEndTime = null
        room.votes = []
        await room.save()
        
        const payload = JSON.stringify({ 
            type: 'voting_started', 
            room: room.toJSON() 
        })
        ws.publish(`room:${roomId}`, payload)
        ws.send(payload)
    }
}
```

**Acceptance Criteria**:
- [ ] Only host can trigger start_voting
- [ ] Only works in showdown_discussion phase
- [ ] Transitions to showdown_voting correctly
- [ ] All clients receive voting_started event

---

### Task 5: Implement Vote Submission Handler (40 mins)
**File**: `service/src/controllers/ws-controller.ts`

**Subtasks**:
1. Add `submit_vote` event handler
2. Implement validation rules:
   - Prevent self-voting
   - Prevent host from voting
   - Prevent voting for host
   - Validate target player exists
3. Store/update vote in database
4. Broadcast vote tally (not individual votes)
5. Send error messages for invalid votes

**Code Changes**:
```typescript
// General player actions (not role-specific)
if (parsedMessage.type === 'submit_vote' && room.status === 'showdown_voting') {
    const { targetId } = parsedMessage
    
    // Validation: Cannot vote self
    if (targetId === player.id) {
        ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Cannot vote for yourself' 
        }))
        return
    }
    
    // Validation: Host cannot vote
    if (player.inGameRole === 'host') {
        ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Host cannot vote' 
        }))
        return
    }
    
    // Validation: Target must exist and not be host
    const targetPlayer = room.players.find(p => p.id === targetId)
    if (!targetPlayer || targetPlayer.inGameRole === 'host') {
        ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Invalid vote target' 
        }))
        return
    }
    
    // Store or update vote
    const existingVote = room.votes.find(v => v.voterId === player.id)
    if (existingVote) {
        existingVote.targetId = targetId // Allow vote change
    } else {
        room.votes.push({ voterId: player.id, targetId })
    }
    
    await room.save()
    
    // Broadcast vote count (not individual votes)
    const eligibleVoters = room.players.filter(p => p.inGameRole !== 'host').length
    const voteCountPayload = JSON.stringify({
        type: 'vote_tallied',
        voteCount: room.votes.length,
        eligibleVoters,
        room: room.toJSON()
    })
    ws.publish(`room:${roomId}`, voteCountPayload)
}
```

**Acceptance Criteria**:
- [ ] Self-voting blocked with error message
- [ ] Host voting blocked with error message
- [ ] Voting for host blocked with error message
- [ ] Vote stored correctly in database
- [ ] Vote updates allowed (not duplicated)
- [ ] Vote tally broadcast to all clients
- [ ] Invalid votes don't modify database

---

### Task 6: Implement Role Reveal Handler (40 mins)
**File**: `service/src/controllers/ws-controller.ts`

**Subtasks**:
1. Add `reveal_roles` event handler
2. Validate host role
3. Validate current state is `showdown_voting`
4. Calculate game results:
   - Find insider
   - Count insider votes
   - Determine if insider identified (>50% votes)
   - Determine winner
5. Update game state to `completed`
6. Store gameResult
7. Broadcast `roles_revealed` with full data

**Code Changes**:
```typescript
// Host Actions
if (player.inGameRole === 'host' && parsedMessage.type === 'reveal_roles') {
    if (room.status === 'showdown_voting') {
        logger.info({ roomId, deviceId }, 'Host revealed roles and ended game')
        
        // Calculate results
        const insider = room.players.find(p => p.inGameRole === 'insider')
        const insiderVotes = room.votes.filter(v => v.targetId === insider?.id).length
        const totalVotes = room.votes.length
        const insiderIdentified = totalVotes > 0 && insiderVotes > totalVotes / 2
        const wordGuessed = true // Already guessed to reach this phase
        const commonsWin = wordGuessed && insiderIdentified
        
        // Update state
        room.status = 'completed'
        room.gameResult = {
            winner: commonsWin ? 'commons' : 'insider',
            insiderIdentified,
            wordGuessed
        }
        
        await room.save()
        
        // Broadcast full reveal
        const revealPayload = JSON.stringify({
            type: 'roles_revealed',
            room: room.toJSON(),
            votes: room.votes,
            result: room.gameResult
        })
        ws.publish(`room:${roomId}`, revealPayload)
    }
}
```

**Acceptance Criteria**:
- [ ] Only host can reveal roles
- [ ] Only works in showdown_voting phase
- [ ] Insider votes counted correctly
- [ ] Win condition calculated correctly (>50% threshold)
- [ ] Game state transitions to completed
- [ ] gameResult stored in database
- [ ] All clients receive roles_revealed with full data

---

### Task 7: Update End Round Handler (15 mins)
**File**: `service/src/controllers/ws-controller.ts`

**Subtasks**:
1. Update existing `end_round` handler
2. Clear new fields: `votes`, `gameResult`
3. Ensure all players' roles cleared
4. Reset status to `lobby`

**Code Changes**:
```typescript
if (player.isAdmin && parsedMessage.type === 'end_round') {
    logger.info({ roomId, deviceId }, 'Admin ended the round')
    room.status = 'lobby'
    room.players.forEach(p => p.inGameRole = null)
    room.secretWord = ''
    room.phaseEndTime = null
    room.votes = []
    room.gameResult = null
    await room.save()
    
    const updatePayload = JSON.stringify({ 
        type: 'room_state_update', 
        room: room.toJSON() 
    })
    ws.publish(`room:${roomId}`, updatePayload)
    ws.send(updatePayload)
}
```

**Acceptance Criteria**:
- [ ] All game state cleared
- [ ] Room returns to lobby state
- [ ] Players ready for new game
- [ ] No leftover vote data

---

### Task 8: Testing & Validation (45 mins)

**Subtasks**:
1. Test voting mode configuration
2. Test auto-transition flow
3. Test manual voting flow
4. Test vote validation (self, host, invalid target)
5. Test vote tallying
6. Test role reveal and win calculation
7. Test edge cases:
   - Player disconnects during voting
   - Host leaves mid-game
   - Not all players vote before reveal

**Test Scenarios**:
```bash
# Auto mode flow
1. Create room, set votingMode='auto'
2. Start game → verify quiz phase
3. Wait quiz timer → verify auto-transition to showdown_discussion
4. Wait discussion timer → verify auto-transition to showdown_voting
5. Submit votes → verify vote_tallied events
6. Host reveals → verify roles_revealed with correct results

# Manual mode flow
1. Create room, set votingMode='manual'
2. Start game → verify quiz phase
3. Host triggers showdown → verify showdown_discussion
4. Host triggers voting → verify showdown_voting
5. Submit votes → verify vote_tallied events
6. Host reveals → verify roles_revealed

# Vote validation
1. Vote for self → verify error
2. Host tries to vote → verify error
3. Vote for host → verify error
4. Valid vote → verify stored correctly
```

**Acceptance Criteria**:
- [ ] All test scenarios pass
- [ ] No console errors
- [ ] Database state correct after each operation
- [ ] WebSocket events broadcast correctly

---

## 📊 Summary

| Task | File | Time | Priority |
|------|------|------|----------|
| 1. Update Room Schema | `service/src/models/room.ts` | 30m | P0 |
| 2. Timer Config Handler | `service/src/controllers/ws-controller.ts` | 20m | P0 |
| 3. Auto-Transition Logic | `service/src/controllers/ws-controller.ts` | 40m | P0 |
| 4. Manual Start Voting | `service/src/controllers/ws-controller.ts` | 20m | P0 |
| 5. Vote Submission | `service/src/controllers/ws-controller.ts` | 40m | P0 |
| 6. Role Reveal | `service/src/controllers/ws-controller.ts` | 40m | P0 |
| 7. End Round Update | `service/src/controllers/ws-controller.ts` | 15m | P1 |
| 8. Testing | Manual + Bun test | 45m | P0 |
| **Total** | | **4h 10m** | |

---

## 🚀 Execution Order
1. ✅ Task 1: Schema updates (foundation)
2. ✅ Task 2: Timer config (configuration)
3. ✅ Task 7: End round update (simple, unblocks testing)
4. ✅ Task 3: Auto-transition (core flow)
5. ✅ Task 4: Manual start (alternative flow)
6. ✅ Task 5: Vote submission (core mechanic)
7. ✅ Task 6: Role reveal (end game)
8. ✅ Task 8: Full testing

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Timer drift | Auto-transition timing off | Use server-side timestamps, not client |
| Concurrent votes | Race conditions in vote counting | Mongoose transactions if needed |
| Host disconnects | Game stuck in voting | Allow admin to force reveal (future) |
| Edge case: 0 votes | Division by zero in win calc | Handle `totalVotes === 0` case |

---

## 📝 Notes
- Maintain backward compatibility during migration (autoTransition → votingMode)
- Log all state transitions for debugging
- Keep error messages user-friendly
- Consider adding vote deadline timer in future (Phase 3)
