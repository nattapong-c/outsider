# Phase 2: Showdown & Winning Conditions - Backend

## 🎯 Goal
Implement the backend logic for the Showdown phase, including discussion timer management, voting mechanisms, and determining final game outcomes based on voting and game state.

## 🚀 Features

### 1. Voting Mode Configuration
*   **Configurable Voting Mode** (set during room creation/lobby phase):
    *   `auto`: Automatically transition to voting phase when discussion timer expires
    *   `manual`: Host must manually trigger the voting phase via `start_voting` event
*   **Timer Config Schema Update**:
    *   Replace `autoTransition` with `votingMode: 'auto' | 'manual'`
    *   Maintain backward compatibility during migration

### 2. Showdown Phase Logic
*   **Discussion Phase (`showdown_discussion`)**:
    *   **Initiate Showdown**: Transition occurs when:
        1.  **Guessed Correctly**: Host triggers `trigger_showdown` event when word is guessed
        2.  **Auto Time's Up**: If `votingMode === 'auto'`, backend auto-transitions when discussion timer expires
        3.  **Manual Time's Up**: If `votingMode === 'manual'`, host must send `start_voting` event
    *   Set game state to `showdown_discussion`
    *   Start discussion timer based on `timerConfig.discussion`
    *   Broadcast `room_state_update` with new phase

*   **Voting Phase (`showdown_voting`)**:
    *   Transition to `showdown_voting` state
    *   Initialize empty `votes` array
    *   Clear `phaseEndTime` (no timer during voting)
    *   Broadcast `voting_started` event

### 3. Voting Mechanism
*   **Vote Submission** (`submit_vote` event):
    *   **Validation Rules**:
        - ❌ Prevent self-voting: `targetId !== voterId`
        - ❌ Host cannot vote: `player.inGameRole !== 'host'`
        - ❌ Cannot vote for host: `target.inGameRole !== 'host'`
        - ✅ Commons and Insider can vote (1 vote per player)
    *   **Vote Storage**:
        - Store as `{ voterId: string, targetId: string }`
        - Allow vote changes before reveal (update existing vote)
    *   **Real-time Updates**:
        - Broadcast `vote_tallied` with vote count and eligible voter count
        - Do NOT reveal individual votes until game end

### 4. Game End Logic
*   **Role Reveal** (`reveal_roles` event - Host only):
    *   **Prerequisites**: Host can only trigger when in `showdown_voting` state
    *   **Calculate Results**:
        ```typescript
        const insider = players.find(p => p.inGameRole === 'insider')
        const insiderVotes = votes.filter(v => v.targetId === insider.id).length
        const totalVotes = votes.length
        const insiderIdentified = insiderVotes > totalVotes / 2
        const commonsWin = wordGuessed && insiderIdentified
        ```
    *   **Win Conditions**:
        - **Commons & Host Win**: Word guessed AND Insider identified (>50% votes)
        - **Insider Wins**: Word NOT guessed OR Insider NOT identified (≤50% votes)
    *   **Update State**:
        - Set status to `completed`
        - Store `gameResult`: `{ winner, insiderIdentified, wordGuessed }`
    *   **Broadcast**: Send `roles_revealed` with full game state, votes, and results

*   **Round Reset** (`end_round` event - Admin only):
    *   Reset status to `lobby`
    *   Clear all player roles (`inGameRole = null`)
    *   Clear `secretWord`, `votes`, `gameResult`, `phaseEndTime`
    *   Broadcast `room_state_update` for lobby state

## 🛠 Technical Considerations

### Schema Updates (Mongoose + Elysia)
```typescript
// Vote schema
export const VoteSchema = t.Object({
    voterId: t.String(),
    targetId: t.String()
})

// Game result schema
export const GameResultSchema = t.Object({
    winner: t.Union([t.Literal('commons'), t.Literal('insider')]),
    insiderIdentified: t.Boolean(),
    wordGuessed: t.Boolean()
})

// Updated Room status enum
status: t.Union([
    t.Literal('lobby'),
    t.Literal('playing'),
    t.Literal('showdown_discussion'),
    t.Literal('showdown_voting'),
    t.Literal('completed')
])
```

### WebSocket Events
| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `start_voting` | Client→Server | `{ type: 'start_voting' }` | Host manually starts voting (manual mode) |
| `submit_vote` | Client→Server | `{ type: 'submit_vote', targetId: string }` | Player casts vote |
| `vote_tallied` | Server→Client | `{ type: 'vote_tallied', voteCount, eligibleVoters }` | Vote count update |
| `voting_started` | Server→Client | `{ type: 'voting_started', room }` | Voting phase begins |
| `reveal_roles` | Client→Server | `{ type: 'reveal_roles' }` | Host reveals all roles |
| `roles_revealed` | Server→Client | `{ type: 'roles_revealed', room, votes, result }` | Game over, all revealed |

### Error Handling
- Return error messages for invalid votes (self-vote, host vote, etc.)
- Validate state transitions (can't vote in wrong phase)
- Prevent duplicate votes from same player (allow updates instead)
- Handle edge cases: player disconnects during voting, host leaves mid-game

### Database Persistence
- Store votes in `votes` array field
- Store final results in `gameResult` field
- Maintain game history for potential Phase 3 features

## ✅ Acceptance Criteria
- [ ] Voting mode (auto/manual) configurable in lobby
- [ ] Auto-transition works when `votingMode === 'auto'`
- [ ] Manual trigger works when `votingMode === 'manual'`
- [ ] Self-voting prevented
- [ ] Host cannot vote and cannot be voted
- [ ] Commons/Insider can vote once
- [ ] Vote tally updates in real-time
- [ ] Host can reveal roles after all votes cast
- [ ] Win conditions calculated correctly
- [ ] Game results broadcast to all players
- [ ] Admin can reset to lobby
