# Phase 2: Showdown & Winning Conditions - Frontend

## 🎯 Goal
Develop the user interface and client-side logic to support the Showdown discussion, voting process, and display of final game results.

## 🚀 Features

### 1. Voting Mode Configuration (Lobby Phase)
*   **Timer Configuration Panel** (Admin-only):
    *   Replace `autoTransition` checkbox with `votingMode` selector
    *   **Dropdown Options**:
        - `Auto (Timer)`: Voting starts automatically when discussion timer ends
        - `Manual (Host Control)`: Host must click button to start voting
    *   Update config via `update_timer_config` WebSocket event
    *   Persist selection in room state

### 2. Discussion Phase UI (`showdown_discussion`)
*   **Phase Indicator**:
    *   Display purple-themed header: "🎯 SHOWDOWN PHASE"
    *   Show discussion timer countdown
    *   Display instruction: "Discuss and analyze: Who is the Insider?"

*   **Host Controls** (manual mode only):
    *   Show prominent button: "🗳️ START VOTING PHASE"
    *   Button only visible when `votingMode === 'manual'`
    *   Sends `start_voting` WebSocket event
    *   Disabled until discussion timer ends (optional validation)

*   **Waiting State** (auto mode):
    *   Display message: "Voting will start automatically when timer ends"
    *   Show countdown timer prominently

### 3. Voting Phase UI (`showdown_voting`)
*   **Phase Indicator**:
    *   Display red-themed header: "🗳️ VOTING PHASE"
    *   Instruction: "Vote for who you think is the Insider!"

*   **Vote Count Progress**:
    *   Display: "X / Y votes submitted"
    *   Visual progress bar showing vote completion percentage
    *   Updates in real-time via `vote_tallied` events

*   **Voting Interface** (Commons & Insider only):
    *   **Player Cards Grid**:
        - Show all eligible players (exclude host, exclude self)
        - Each card: Player name + vote button
    *   **Vote States**:
        - **Not Voted**: Clickable button, hover effect (red highlight)
        - **Voted for Player**: Highlighted green with "✓ Selected"
        - **Already Voted (different target)**: Disabled, grayed out, "Vote Submitted"
    *   **Validation Feedback**:
        - Prevent self-voting (filter out self from list)
        - Prevent voting for host (filter out host from list)
        - Allow vote changes (re-click to change target)

*   **Host View** (voting phase):
    *   Display: "Waiting for all players to vote..."
    *   Show vote count progress
    *   **Reveal Roles Button**:
        - Enabled when all eligible players have voted
        - Disabled otherwise with tooltip/explanation
        - Sends `reveal_roles` event

### 4. Game Results UI (`completed`)
*   **Winner Announcement Banner**:
    *   **Commons Win**: Green theme, "🎉 COMMONS WIN! 🎉"
    *   **Insider Win**: Red theme, "👤 INSIDER WINS! 👤"
    *   Large, centered, prominent display

*   **Win Condition Breakdown**:
    *   Two-column grid:
        - "Word Guessed": ✅ YES / ❌ NO
        - "Insider Identified": ✅ YES / ❌ NO
    *   Color-coded results (green for success, red for failure)

*   **Player Role Reveals**:
    *   Grid of player cards showing actual roles
    *   **Role Colors**:
        - Host: Yellow/Gold border and text
        - Insider: Red border and text
        - Common: Blue border and text
    *   Show player name, admin crown, "(You)" indicator

*   **Voting Results Breakdown**:
    *   List format: "Player A voted for Player B"
    *   **Accuracy Indicators**:
        - ✅ Correct (voted for Insider)
        - ❌ Wrong (voted for Common)
    *   Scrollable list if many players

*   **Play Again Control** (Admin only):
    *   Button: "🔄 PLAY AGAIN (Reset to Lobby)"
    *   Sends `end_round` event
    *   Resets game to lobby state

### 5. Real-time WebSocket Integration
*   **Event Handlers**:
    ```typescript
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        switch (message.type) {
            case 'voting_started':
                setRoomState(message.room)
                // Navigate to voting UI
                break
            case 'vote_tallied':
                setRoomState(message.room)
                // Update vote count display
                break
            case 'roles_revealed':
                setRoomState(message.room)
                // Show results screen
                break
        }
    }
    ```

## 🛠 Technical Considerations

### State Management
- Track voting mode in local state (synced with room state)
- Track vote submission status (hasVoted, votedFor)
- Use `useCountdown` hook for discussion timer

### Component Structure
```
RoomPage
├── LobbyPhase (existing)
├── QuizPhase (existing)
├── ShowdownDiscussion (NEW)
│   ├── PhaseHeader
│   ├── HostManualStartButton
│   └── AutoTransitionMessage
├── ShowdownVoting (NEW)
│   ├── VoteCountProgress
│   ├── VotingCards (Commons/Insider)
│   ├── HostWaitingView
│   └── RevealRolesButton
└── GameCompleted (NEW)
    ├── WinnerBanner
    ├── WinConditionBreakdown
    ├── RoleRevealGrid
    ├── VotingResultsList
    └── PlayAgainButton
```

### Type Safety (Eden Inference)
```typescript
// Infer types from backend schemas
type RoomStatus = typeof RoomSchema.static.status
// 'lobby' | 'playing' | 'showdown_discussion' | 'showdown_voting' | 'completed'

type VoteType = typeof VoteSchema.static
// { voterId: string, targetId: string }

type GameResultType = typeof GameResultSchema.static
// { winner: 'commons' | 'insider', insiderIdentified: boolean, wordGuessed: boolean }
```

### Styling (TailwindCSS + Pixel Art Theme)
- **Discussion Phase**: Purple accents (`border-purple-600`, `bg-purple-900/30`)
- **Voting Phase**: Red accents (`border-red-600`, `bg-red-900/30`)
- **Results**: 
  - Commons win: Green (`border-green-500`, `bg-green-900/40`)
  - Insider win: Red (`border-red-500`, `bg-red-900/40`)
- Maintain pixel art aesthetic: bold borders, shadow effects, monospace font

### Conditional Rendering Logic
```typescript
// Show voting UI only for eligible players
{currentPlayer?.inGameRole !== 'host' && <VotingCards />}

// Show reveal button only for host
{currentPlayer?.inGameRole === 'host' && <RevealRolesButton />}

// Show play again only for admin
{isAdmin && <PlayAgainButton />}
```

## ✅ Acceptance Criteria
- [ ] Voting mode selector works in lobby
- [ ] Discussion phase shows correct UI for auto/manual modes
- [ ] Host can manually start voting (manual mode)
- [ ] Voting UI prevents self-voting and host-voting
- [ ] Vote count updates in real-time
- [ ] Vote progress bar displays correctly
- [ ] Host reveal button enabled only when all votes cast
- [ ] Results screen shows winner, roles, and voting breakdown
- [ ] Admin can reset to lobby with "Play Again"
- [ ] All UI follows pixel art theme
- [ ] Responsive design (mobile + desktop)
