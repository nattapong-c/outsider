# Phase 3: Word Management System - Frontend

## 🎯 Goal
Implement UI for difficulty selection and word management integration in the game lobby.

## 🚀 Features

### 1. Difficulty Selection UI
*   **Difficulty Selector:**
    *   Dropdown or button group in lobby (admin only)
    *   Three options: Easy, Medium, Hard
    *   Visual indicators for each difficulty (color-coded)
    *   Default to Medium
*   **Difficulty Descriptions:**
    *   Easy: "Common, everyday words"
    *   Medium: "More specific or abstract words"
    *   Hard: "Complex, obscure, or technical words"
*   **Selection Persistence:**
    *   Difficulty selected per round
    *   Resets to default after each game
    *   Sent to backend when starting game

### 2. Integration with Game Start
*   **Send Difficulty with start_game:**
    ```typescript
    ws.send(JSON.stringify({
        type: 'start_game',
        hostPlayerId: selectedHostId,
        difficulty: 'medium' // Selected difficulty
    }));
    ```
*   **Display Selected Difficulty:**
    *   Show in lobby UI
    *   Show in game status header
    *   Visible to all players

### 3. Visual Design
*   **Color Coding:**
    *   Easy: Green (#22c55e)
    *   Medium: Yellow/Orange (#f59e0b)
    *   Hard: Red (#ef4444)
*   **Icons:**
    *   Easy: 🟢 or ⭐
    *   Medium: 🟡 or ⭐⭐
    *   Hard: 🔴 or ⭐⭐⭐
*   **Pixel Art Styling:**
    *   Match existing theme
    *   Bold borders
    *   Clear visual hierarchy

## 🛠 Implementation

### Update Lobby UI

```typescript
// In app/src/app/[roomId]/page.tsx

// Add to state
const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

// Add difficulty selector UI in lobby
{isAdmin && (
    <div className="mb-12 bg-gray-900 p-6 rounded-lg border-2 border-gray-700 w-full max-w-md text-left">
        <h3 className="text-xl text-blue-400 mb-4 font-bold border-b-2 border-gray-800 pb-2">
            Game Settings
        </h3>

        {/* Difficulty Selection */}
        <div className="flex flex-col gap-4 mb-4">
            <label className="text-gray-300">Word Difficulty</label>
            <div className="grid grid-cols-3 gap-3">
                <button
                    onClick={() => setSelectedDifficulty('easy')}
                    className={`py-3 px-4 rounded border-4 transition-all ${
                        selectedDifficulty === 'easy'
                            ? 'bg-green-600 border-green-400 text-white font-bold shadow-[2px_2px_0px_#14532d]'
                            : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
                    }`}
                >
                    <div className="text-sm">🟢 Easy</div>
                    <div className="text-xs mt-1">Common words</div>
                </button>
                <button
                    onClick={() => setSelectedDifficulty('medium')}
                    className={`py-3 px-4 rounded border-4 transition-all ${
                        selectedDifficulty === 'medium'
                            ? 'bg-yellow-600 border-yellow-400 text-white font-bold shadow-[2px_2px_0px_#78350f]'
                            : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
                    }`}
                >
                    <div className="text-sm">🟡 Medium</div>
                    <div className="text-xs mt-1">Specific words</div>
                </button>
                <button
                    onClick={() => setSelectedDifficulty('hard')}
                    className={`py-3 px-4 rounded border-4 transition-all ${
                        selectedDifficulty === 'hard'
                            ? 'bg-red-600 border-red-400 text-white font-bold shadow-[2px_2px_0px_#7f1d1d]'
                            : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
                    }`}
                >
                    <div className="text-sm">🔴 Hard</div>
                    <div className="text-xs mt-1">Complex words</div>
                </button>
            </div>
        </div>

        {/* Timer Configuration (existing) */}
        {/* ... existing timer config UI ... */}
    </div>
)}

// Update start_game handler
<button
    onClick={() => wsRef.current?.send(JSON.stringify({ 
        type: 'start_game', 
        hostPlayerId: selectedHostId,
        difficulty: selectedDifficulty // Include difficulty
    }))}
    // ... rest of button props
>
    START GAME
</button>
```

### Display Difficulty During Game

```typescript
// In game header section
<div className="flex items-center gap-4">
    {roomState?.phaseEndTime && (
        <div className="px-4 py-2 rounded border-2 font-bold text-xl">
            ⏱ {formatTime(remainingTime)}
        </div>
    )}
    
    {/* Display selected difficulty */}
    {roomState?.timerConfig?.difficulty && (
        <div className={`px-4 py-2 rounded border-2 font-bold text-sm ${
            roomState.timerConfig.difficulty === 'easy'
                ? 'bg-green-900/40 border-green-500 text-green-400'
                : roomState.timerConfig.difficulty === 'medium'
                ? 'bg-yellow-900/40 border-yellow-500 text-yellow-400'
                : 'bg-red-900/40 border-red-500 text-red-400'
        }`}>
            {roomState.timerConfig.difficulty === 'easy' && '🟢 Easy'}
            {roomState.timerConfig.difficulty === 'medium' && '🟡 Medium'}
            {roomState.timerConfig.difficulty === 'hard' && '🔴 Hard'}
        </div>
    )}
</div>
```

### Reset Difficulty After Game

```typescript
// In end_round handler or when status changes to lobby
useEffect(() => {
    if (roomState?.status === 'lobby') {
        setSelectedDifficulty('medium'); // Reset to default
    }
}, [roomState?.status]);
```

## 📊 UI Mockups

### Lobby Phase (Admin View)
```
┌─────────────────────────────────────────┐
│  Game Settings                          │
├─────────────────────────────────────────┤
│  Word Difficulty                        │
│  ┌────────┐ ┌────────┐ ┌────────┐      │
│  │ 🟢 Easy│ │ 🟡 Med │ │ 🔴 Hard│      │
│  │ Common │ │Specific│ │Complex │      │
│  └────────┘ └────────┘ └────────┘      │
│  [Selected: Medium]                     │
├─────────────────────────────────────────┤
│  Timer Configuration                    │
│  Quiz Phase: [180] seconds              │
│  Discussion: [180] seconds              │
│  Auto Voting: [✓]                       │
└─────────────────────────────────────────┘
```

### Game Header (All Players)
```
┌─────────────────────────────────────────┐
│  OUTSIDER    ⏱ 3:45  🟡 Medium  Room: ABC123  │
└─────────────────────────────────────────┘
```

## ✅ Acceptance Criteria

### Difficulty Selection
- [ ] Three difficulty options displayed
- [ ] Visual distinction (colors, icons)
- [ ] Default to Medium
- [ ] Admin can change before each game
- [ ] Selection sent to backend

### Game Integration
- [ ] Difficulty included in start_game event
- [ ] Difficulty displayed during game
- [ ] Color-coded by difficulty
- [ ] Resets to default after game

### UI/UX
- [ ] Matches pixel art theme
- [ ] Responsive design
- [ ] Clear visual hierarchy
- [ ] Intuitive for first-time users

### Error Handling
- [ ] Fallback if difficulty not sent
- [ ] Display error if word selection fails
- [ ] Handle missing difficulty gracefully

## 🚀 Implementation Steps

1. **Add State Management** (15 mins)
   - Add `selectedDifficulty` state
   - Add reset logic

2. **Create Difficulty Selector** (45 mins)
   - Build button group UI
   - Add color coding
   - Add icons and descriptions

3. **Integrate with Game Start** (15 mins)
   - Update start_game payload
   - Send difficulty to backend

4. **Display During Game** (30 mins)
   - Add to game header
   - Color-code by difficulty
   - Ensure visibility

5. **Testing & Polish** (30 mins)
   - Test all difficulty levels
   - Verify color contrast
   - Test responsive design
   - Match pixel art theme

**Total Time: ~2.5 hours**

## 📝 Notes

- Keep difficulty selection simple and intuitive
- Use consistent color coding throughout
- Ensure accessibility (color contrast, readable text)
- Consider adding tooltip explanations
- Match existing pixel art styling perfectly
