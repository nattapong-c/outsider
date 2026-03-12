# Phase 3: Scoring System - Implementation Summary

## 📋 Overview
**Feature**: Persistent scoring system with player rankings  
**Status**: Ready for implementation  
**Estimated Time**: 7-8 hours total (Backend: 3.5h, Frontend: 4h)

---

## 🎯 Key Features

### 1. Scoring Rules
| Role | Condition | Points |
|------|-----------|--------|
| **Common** | Word guessed | +1 |
| **Common** | Correctly vote for Insider | +2 |
| **Common** | Failed to identify Insider | +0 |
| **Insider** | Insider wins | +3 |
| **Insider** | Insider loses | +0 |
| **Host** | **NO SCORING** | **N/A** |

### 2. Player Stats Tracked
- **Score**: Total cumulative points
- **Games Played**: Total rounds played (excluding rounds as host)
- **Games Won**: Wins as common/insider (excluding host)
- **Insider Caught**: Times caught as insider

### 3. UI Components
- **Leaderboard**: Player rankings in lobby (sorted by score)
- **Results Screen**: Score changes after each game
- **Reset Button**: Admin-only score reset

---

## 📂 Files to Create/Modify

### Backend
| File | Action | Purpose |
|------|--------|---------|
| `service/src/models/room.ts` | Modify | Add score fields to PlayerSchema |
| `service/src/services/score-service.ts` | Create | Score calculation logic |
| `service/src/controllers/ws-controller.ts` | Modify | Update reveal_roles, add reset_scores |
| `service/src/controllers/room-controller.ts` | Modify | Initialize scores for new players |

### Frontend
| File | Action | Purpose |
|------|--------|---------|
| `app/src/app/[roomId]/page.tsx` | Modify | Add leaderboard, score display, reset button |

### Documentation
| File | Status | Purpose |
|------|--------|---------|
| `.gemini/features/phase3_scoring.md` | ✅ Created | Feature specification |
| `.gemini/tasks/phase3_backend_plan.md` | ✅ Created | Backend implementation plan |
| `.gemini/tasks/phase3_frontend_plan.md` | ✅ Created | Frontend implementation plan |

---

## 🚀 Implementation Steps

### Phase 1: Backend (3.5 hours)
1. **Update Player Schema** (30m)
   - Add `score`, `gamesPlayed`, `gamesWon`, `insiderCaught` fields
   - Set default values to 0

2. **Create Score Service** (45m)
   - Implement `calculatePlayerScores()` function
   - Define scoring rules as constants

3. **Update Game Reveal Handler** (45m)
   - Calculate scores after game ends
   - Update all player stats
   - Broadcast `scoreChanges` in payload

4. **Add Score Reset Handler** (30m)
   - Admin-only event handler
   - Reset all scores to 0

5. **Update Room Creation** (15m)
   - Initialize scores for new players

6. **Testing** (45m)
   - Test all scoring scenarios
   - Verify persistence across rounds

### Phase 2: Frontend (4 hours)
1. **Create Leaderboard Component** (60m)
   - Sort players by score
   - Display rank, name, score, games played
   - Gold/Silver/Bronze styling for top 3

2. **Integrate into Lobby** (30m)
   - Add leaderboard to lobby phase
   - Ensure real-time updates

3. **Add to Results Screen** (45m)
   - Show score changes after game
   - Display +X pts for each player

4. **Score Reset Button** (30m)
   - Admin-only button
   - Confirmation dialog

5. **WebSocket Handler** (15m)
   - Handle `roles_revealed` with score changes
   - Handle `scores_reset` event

6. **Testing & Polish** (60m)
   - Test all scenarios
   - Match pixel art theme
   - Responsive design

---

## ✅ Acceptance Criteria

### Backend
- [ ] Scores calculated correctly per role/outcome
- [ ] Scores persist across rounds (accumulate)
- [ ] Player stats updated (gamesPlayed, gamesWon)
- [ ] Score reset works (admin only)
- [ ] WebSocket events broadcast correctly

### Frontend
- [ ] Leaderboard displays in lobby
- [ ] Players sorted by score (descending)
- [ ] Top 3 ranks have special colors
- [ ] Current player highlighted
- [ ] Score changes shown in results
- [ ] Admin can reset scores
- [ ] Responsive design (mobile + desktop)
- [ ] Pixel art theme consistent

---

## 🎨 UI Design

### Leaderboard Styling
```
┌─────────────────────────────────────┐
│  🏆 PLAYER RANKINGS                 │
├─────────────────────────────────────┤
│  #1 🥇 PlayerOne           15 pts   │
│     (3 games)                       │
├─────────────────────────────────────┤
│  #2 🥈 PlayerTwo           12 pts   │
│     (3 games)                       │
├─────────────────────────────────────┤
│  #3 🥉 PlayerThree          8 pts   │
│     (2 games)                       │
├─────────────────────────────────────┤
│  #4 PlayerFour (You)        5 pts   │
│     (2 games)                       │
└─────────────────────────────────────┘
```

### Results Screen Addition
```
┌─────────────────────────────────────┐
│  📊 SCORE CHANGES                   │
├─────────────────────────────────────┤
│  PlayerOne                   +3 pts │
│  PlayerTwo (You)             +2 pts │
│  PlayerThree                 +0 pts │
│  PlayerFour (Host)           --     │
└─────────────────────────────────────┘
```

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Score calculation errors | Wrong scores | Unit test score service |
| Database migration issues | Existing rooms break | Handle null/undefined values |
| Player reconnection | Score lost | Tie scores to deviceId |
| UI not updating | Stale leaderboard | Ensure proper React state |

---

## 📝 Next Steps

1. **Review plans** with team
2. **Start backend implementation** (Task 1-6)
3. **Test backend** thoroughly
4. **Implement frontend** (Task 1-6)
5. **Test full flow** end-to-end
6. **Deploy to staging**
7. **User acceptance testing**

---

## 🎯 Success Metrics

- ✅ Scores calculate correctly 100% of time
- ✅ Leaderboard updates in real-time
- ✅ Scores persist across rounds
- ✅ No breaking changes to existing features
- ✅ UI matches pixel art theme perfectly
- ✅ Mobile responsive

---

**Ready to implement!** 🚀
