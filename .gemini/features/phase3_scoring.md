# Phase 3: Scoring System & Player Rankings

## 🎯 Goal
Implement a persistent scoring system that tracks individual player performance across multiple rounds, displaying cumulative rankings in the room lobby.

## 🚀 Features

### 1. Scoring Rules
- **Common Players**:
  - +2 points: Correctly identify the Insider (vote for Insider)
  - +1 point: Word was guessed (participation bonus)
  - +0 points: Failed to identify Insider
  
- **Insider**:
  - +3 points: Insider wins (word not guessed OR Insider not identified)
  - +0 points: Insider loses (caught by commons)
  
- **Host**:
  - **NO SCORING**: Host is neutral facilitator
  - Scores are NOT tracked for host role
  - Games played as host are NOT counted

### 2. Score Persistence
- Scores stored per player per room
- Accumulate across multiple rounds/games
- **Skip host rounds**: When player is host, don't increment gamesPlayed
- Reset when room is deleted or admin resets all scores
- Survives player disconnects/reconnects (tied to deviceId)

### 3. Player Rankings Display
- **Lobby Phase**: Show leaderboard with all players sorted by score
- **Display Format**:
  - Rank (#1, #2, #3, etc.)
  - Player name
  - Total score
  - Games played (optional metric)
  - Win rate (optional metric)
- **Visual Styling**: 
  - Gold/Silver/Bronze colors for top 3
  - Pixel art trophy icons
  - Highlight current player's rank

### 4. End-of-Round Score Update
- When game completes (`roles_revealed` event):
  - Calculate scores based on game result and votes
  - Update each player's score in room
  - Broadcast updated rankings to all players
  - Display score changes in results screen

### 5. Score Reset (Admin Only)
- Admin can reset all scores to 0
- Useful for starting fresh tournament
- Confirmation dialog to prevent accidents

## 🛠 Technical Considerations

### Schema Updates (MongoDB + Elysia)
```typescript
// Add to PlayerSchema
export const PlayerSchema = t.Object({
    // ... existing fields
    score: t.Number(),        // Total cumulative score
    gamesPlayed: t.Number(),  // Total games played
    gamesWon: t.Number(),     // Total games won (for win rate)
    insiderCaught: t.Number(), // Times caught as insider (for stats)
})
```

### Backend Considerations
- Calculate scores in `reveal_roles` handler
- Update all players' scores atomically
- Broadcast `score_updated` event with new rankings
- Handle edge cases (player leaves mid-game, reconnects)

### Frontend Considerations
- Add leaderboard component to lobby phase
- Display score changes in results screen
- Show current player's rank prominently
- Animate score increases for better UX

### Type Safety (Eden Treaty)
- Ensure all new fields are in Elysia schemas
- Frontend infers types automatically via Eden
- Validate score calculations on backend only

## ✅ Acceptance Criteria
- [ ] Scores calculated correctly based on role and outcome
- [ ] Scores persist across rounds (accumulate)
- [ ] Leaderboard displays in lobby, sorted by score
- [ ] Score updates broadcast after each game
- [ ] Admin can reset all scores
- [ ] Player rankings survive disconnects/reconnects
- [ ] Results screen shows score changes from last game
- [ ] Visual styling matches pixel art theme
