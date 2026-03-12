# Phase 3: Word Management with Language Support - Frontend

## 🎯 Goal
Implement UI for difficulty AND language selection, allowing admins to choose between English and Thai words before each game.

## 🚀 Features

### 1. Language & Difficulty Selection UI
*   **Language Selector:**
    *   Toggle or button group in lobby (admin only)
    *   Two options: English 🇬🇧 and Thai 🇹🇭
    *   Default to English
    *   Visual indicators (flags or icons)
*   **Difficulty Selector:**
    *   Three options: Easy, Medium, Hard
    *   Color-coded (Green/Yellow/Red)
    *   Default to Medium
*   **Combined Selection:**
    *   Admin selects both language AND difficulty
    *   Both persist for current round only
    *   Reset to defaults after each game

### 2. Integration with Game Start
*   **Send Both Parameters:**
    ```typescript
    ws.send(JSON.stringify({
        type: 'start_game',
        hostPlayerId: selectedHostId,
        difficulty: 'medium',  // Selected difficulty
        language: 'thai'       // Selected language
    }));
    ```
*   **Display Selection:**
    *   Show language + difficulty in lobby
    *   Show in game status header during game
    *   Visible to all players

### 3. Visual Design
*   **Language Indicators:**
    *   English: 🇬🇧 or "EN" badge
    *   Thai: 🇹🇭 or "TH" badge
*   **Difficulty Colors:**
    *   Easy: Green (#22c55e)
    *   Medium: Yellow/Orange (#f59e0b)
    *   Hard: Red (#ef4444)
*   **Combined Badge:**
    *   Example: "🇹🇭 Medium" or "EN - Hard"
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
const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'thai'>('english');

// Add language and difficulty selector UI in lobby
{isAdmin && (
    <div className="mb-12 bg-gray-900 p-6 rounded-lg border-2 border-gray-700 w-full max-w-md text-left">
        <h3 className="text-xl text-blue-400 mb-4 font-bold border-b-2 border-gray-800 pb-2">
            Game Settings
        </h3>

        {/* Language Selection */}
        <div className="flex flex-col gap-4 mb-4">
            <label className="text-gray-300">Word Language</label>
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => setSelectedLanguage('english')}
                    className={`py-3 px-4 rounded border-4 transition-all ${
                        selectedLanguage === 'english'
                            ? 'bg-blue-600 border-blue-400 text-white font-bold shadow-[2px_2px_0px_#1e3a8a]'
                            : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
                    }`}
                >
                    <div className="text-lg">🇬🇧 English</div>
                    <div className="text-xs mt-1">Common nouns</div>
                </button>
                <button
                    onClick={() => setSelectedLanguage('thai')}
                    className={`py-3 px-4 rounded border-4 transition-all ${
                        selectedLanguage === 'thai'
                            ? 'bg-red-600 border-red-400 text-white font-bold shadow-[2px_2px_0px_#7f1d1d]'
                            : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
                    }`}
                >
                    <div className="text-lg">🇹🇭 ไทย</div>
                    <div className="text-xs mt-1">คำนามภาษาไทย</div>
                </button>
            </div>
        </div>

        {/* Difficulty Selection */}
        <div className="flex flex-col gap-4 mb-4">
            <label className="text-gray-300">Word Difficulty</label>
            <div className="grid grid-cols-3 gap-3">
                <button
                    onClick={() => setSelectedDifficulty('easy')}
                    className={`py-3 px-2 rounded border-4 transition-all ${
                        selectedDifficulty === 'easy'
                            ? 'bg-green-600 border-green-400 text-white font-bold shadow-[2px_2px_0px_#14532d]'
                            : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
                    }`}
                >
                    <div className="text-sm">🟢 Easy</div>
                    <div className="text-xs mt-1">Common</div>
                </button>
                <button
                    onClick={() => setSelectedDifficulty('medium')}
                    className={`py-3 px-2 rounded border-4 transition-all ${
                        selectedDifficulty === 'medium'
                            ? 'bg-yellow-600 border-yellow-400 text-white font-bold shadow-[2px_2px_0px_#78350f]'
                            : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
                    }`}
                >
                    <div className="text-sm">🟡 Medium</div>
                    <div className="text-xs mt-1">Specific</div>
                </button>
                <button
                    onClick={() => setSelectedDifficulty('hard')}
                    className={`py-3 px-2 rounded border-4 transition-all ${
                        selectedDifficulty === 'hard'
                            ? 'bg-red-600 border-red-400 text-white font-bold shadow-[2px_2px_0px_#7f1d1d]'
                            : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
                    }`}
                >
                    <div className="text-sm">🔴 Hard</div>
                    <div className="text-xs mt-1">Complex</div>
                </button>
            </div>
        </div>

        {/* Display Current Selection */}
        <div className="mt-4 p-3 bg-gray-800 rounded border-2 border-gray-600">
            <p className="text-gray-400 text-sm mb-2">Current Settings:</p>
            <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded font-bold text-sm ${
                    selectedLanguage === 'english'
                        ? 'bg-blue-900 text-blue-400'
                        : 'bg-red-900 text-red-400'
                }`}>
                    {selectedLanguage === 'english' ? '🇬🇧 EN' : '🇹🇭 TH'}
                </span>
                <span className={`px-3 py-1 rounded font-bold text-sm ${
                    selectedDifficulty === 'easy'
                        ? 'bg-green-900 text-green-400'
                        : selectedDifficulty === 'medium'
                        ? 'bg-yellow-900 text-yellow-400'
                        : 'bg-red-900 text-red-400'
                }`}>
                    {selectedDifficulty === 'easy' ? 'Easy' : selectedDifficulty === 'medium' ? 'Medium' : 'Hard'}
                </span>
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
        difficulty: selectedDifficulty, // Include difficulty
        language: selectedLanguage     // Include language
    }))}
    // ... rest of button props
>
    START GAME
</button>
```

### Display Language & Difficulty During Game

```typescript
// In game header section
<div className="flex items-center gap-4">
    {roomState?.phaseEndTime && (
        <div className="px-4 py-2 rounded border-2 font-bold text-xl">
            ⏱ {formatTime(remainingTime)}
        </div>
    )}
    
    {/* Display selected language and difficulty */}
    {roomState?.timerConfig?.difficulty && roomState?.timerConfig?.language && (
        <div className="flex items-center gap-2">
            <div className={`px-3 py-2 rounded border-2 font-bold text-sm ${
                roomState.timerConfig.language === 'english'
                    ? 'bg-blue-900/40 border-blue-500 text-blue-400'
                    : 'bg-red-900/40 border-red-500 text-red-400'
            }`}>
                {roomState.timerConfig.language === 'english' ? '🇬🇧 EN' : '🇹🇭 TH'}
            </div>
            <div className={`px-3 py-2 rounded border-2 font-bold text-sm ${
                roomState.timerConfig.difficulty === 'easy'
                    ? 'bg-green-900/40 border-green-500 text-green-400'
                    : roomState.timerConfig.difficulty === 'medium'
                    ? 'bg-yellow-900/40 border-yellow-500 text-yellow-400'
                    : 'bg-red-900/40 border-red-500 text-red-400'
            }`}>
                {roomState.timerConfig.difficulty === 'easy' ? 'Easy' : 
                 roomState.timerConfig.difficulty === 'medium' ? 'Medium' : 'Hard'}
            </div>
        </div>
    )}
</div>
```

### Reset Settings After Game

```typescript
// In end_round handler or when status changes to lobby
useEffect(() => {
    if (roomState?.status === 'lobby') {
        setSelectedDifficulty('medium'); // Reset to default
        setSelectedLanguage('english');  // Reset to default
    }
}, [roomState?.status]);
```

## 📊 UI Mockups

### Lobby Phase (Admin View)
```
┌─────────────────────────────────────────┐
│  Game Settings                          │
├─────────────────────────────────────────┤
│  Word Language                          │
│  ┌────────────┐ ┌────────────┐         │
│  │ 🇬🇧 English│ │ 🇹🇭 ไทย    │         │
│  │ Common    │ │ คำนาม      │         │
│  └────────────┘ └────────────┘         │
│  [Selected: English]                    │
├─────────────────────────────────────────┤
│  Word Difficulty                        │
│  ┌────────┐ ┌────────┐ ┌────────┐      │
│  │ 🟢 Easy│ │ 🟡 Med │ │ 🔴 Hard│      │
│  │ Common │ │Specific│ │Complex │      │
│  └────────┘ └────────┘ └────────┘      │
│  [Selected: Medium]                     │
├─────────────────────────────────────────┤
│  Current: 🇬🇧 EN - Medium              │
└─────────────────────────────────────────┘
```

### Game Header (All Players)
```
┌─────────────────────────────────────────────────────┐
│  OUTSIDER  ⏱ 3:45  🇹🇭 TH  🟡 Medium  Room: ABC123  │
└─────────────────────────────────────────────────────┘
```

## ✅ Acceptance Criteria

### Language & Difficulty Selection
- [ ] Two language options (English, Thai)
- [ ] Three difficulty options (Easy, Medium, Hard)
- [ ] Visual distinction (flags, colors, icons)
- [ ] Default to English + Medium
- [ ] Admin can change before each game
- [ ] Both selections sent to backend

### Game Integration
- [ ] Language and difficulty included in start_game
- [ ] Both displayed during game
- [ ] Color-coded badges visible
- [ ] Resets to defaults after game

### UI/UX
- [ ] Matches pixel art theme
- [ ] Responsive design (mobile + desktop)
- [ ] Clear visual hierarchy
- [ ] Thai text renders correctly (UTF-8)
- [ ] Accessible color contrast

### Error Handling
- [ ] Fallback if language/difficulty not sent
- [ ] Display error if word selection fails
- [ ] Handle missing parameters gracefully

## 🚀 Implementation Steps

1. **Add State Management** (20 mins)
   - Add `selectedDifficulty` state
   - Add `selectedLanguage` state
   - Add reset logic

2. **Create Language Selector** (45 mins)
   - Build 2-button UI (EN/TH)
   - Add flag icons
   - Add color coding

3. **Update Difficulty Selector** (30 mins)
   - Refactor existing UI
   - Ensure responsive grid
   - Match new styling

4. **Integrate with Game Start** (15 mins)
   - Update start_game payload
   - Send both difficulty and language

5. **Display During Game** (30 mins)
   - Add to game header
   - Create combined badge
   - Ensure visibility

6. **Testing & Polish** (40 mins)
   - Test all combinations
   - Verify Thai text rendering
   - Test responsive design
   - Match pixel art theme

**Total Time: ~3 hours**

## 📝 Notes

- Keep language selection simple and intuitive
- Use flags/icons for quick recognition
- Ensure Thai text renders correctly
- Test UTF-8 encoding throughout stack
- Consider adding language to leaderboard in future
- Match existing pixel art styling perfectly

## 🌐 Language Support Checklist

- [ ] Frontend displays Thai correctly
- [ ] Backend stores Thai words (UTF-8)
- [ ] MongoDB supports Thai characters
- [ ] WebSocket transmits Thai text
- [ ] Fonts support Thai script
- [ ] Mobile rendering tested
- [ ] Copy/paste works with Thai text
