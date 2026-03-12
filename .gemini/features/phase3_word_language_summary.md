# Phase 3: Word Management with Language Support - Summary

## 📋 Overview
**Feature**: Word difficulty AND language selection system  
**Languages**: English 🇬🇧 & Thai 🇹🇭  
**Status**: Ready for implementation  
**Estimated Time**: 7-7.5 hours (Backend: 4h 15m, Frontend: 3h)

---

## 🎯 Key Features

### 1. Dual Language Support
| Language | Code | Words | Example |
|----------|------|-------|---------|
| **English** | `en` | 150 words | Cat, Telescope, Quantum |
| **Thai** | `th` | 150 words | แมว, กล้องโทรทรรศน์, ควอนตัม |

### 2. Three Difficulty Levels (Per Language)
| Difficulty | English Words | Thai Words | Total |
|------------|---------------|------------|-------|
| **Easy** | 50 | 50 | 100 |
| **Medium** | 50 | 50 | 100 |
| **Hard** | 50 | 50 | 100 |
| **Total** | **150** | **150** | **300** |

### 3. Word Type Restriction
- ✅ **Nouns Only** (people, places, things, concepts)
- ❌ No verbs, adjectives, or adverbs
- ✅ Proper nouns allowed

### 4. Admin Controls
- Select language (English/Thai)
- Select difficulty (Easy/Medium/Hard)
- Both selections per round
- Reset after each game

---

## 📂 Files to Create/Modify

### Backend
| File | Action | Purpose |
|------|--------|---------|
| `service/src/models/word.ts` | Create | Word schema with language field |
| `service/src/services/word-service.ts` | Update | Add language parameter to functions |
| `service/src/controllers/word-controller.ts` | Update | Add language to API endpoints |
| `service/src/lib/seed-words.ts` | Update | Seed 300 words (150 EN + 150 TH) |
| `service/src/controllers/ws-controller.ts` | Update | Accept language parameter |
| `service/src/models/room.ts` | Update | Add language to TimerConfig |

### Frontend
| File | Action | Purpose |
|------|--------|---------|
| `app/src/app/[roomId]/page.tsx` | Modify | Add language selector UI |

### Documentation
| File | Status | Purpose |
|------|--------|---------|
| `.gemini/features/phase3_enhancements_backend.md` | ✅ Updated | Complete backend spec |
| `.gemini/tasks/phase3_word_language_frontend.md` | ✅ Created | Frontend implementation |

---

## 🚀 Implementation Steps

### Backend (4h 15m)

1. **Update Word Model** (30m)
   - Add `language` field (`english` | `thai`)
   - Add `wordType` field (always `noun`)
   - Create compound indexes

2. **Update Word Service** (45m)
   - Modify `getRandomWord()` to accept language
   - Update `getAllWords()` with language filter
   - Add language validation

3. **Update Word Controller** (45m)
   - Add language parameter to endpoints
   - Update validation logic
   - Return language in responses

4. **Update Seed Script** (45m)
   - Add 150 Thai words
   - Seed both languages
   - Prevent duplicates

5. **Update Game Start Handler** (30m)
   - Accept language parameter
   - Select word from correct category
   - Store in room config

6. **Update Room Schema** (15m)
   - Add language to TimerConfig
   - Set default values

7. **Testing** (45m)
   - Test both languages
   - Verify word selection
   - Test fallback logic

### Frontend (3h)

1. **Add State Management** (20m)
   - `selectedLanguage` state
   - `selectedDifficulty` state
   - Reset logic

2. **Create Language Selector** (45m)
   - 2-button UI (EN/TH)
   - Flag icons
   - Color coding

3. **Update Difficulty Selector** (30m)
   - Refactor existing UI
   - Responsive grid
   - New styling

4. **Integrate with Game Start** (15m)
   - Update payload
   - Send both parameters

5. **Display During Game** (30m)
   - Add to game header
   - Combined badges
   - Color-coded

6. **Testing & Polish** (40m)
   - Test all combinations
   - Thai text rendering
   - Responsive design

---

## ✅ Acceptance Criteria

### Backend
- [ ] Word model has language field
- [ ] Service functions filter by language
- [ ] API endpoints accept language parameter
- [ ] 300 words seeded (150 per language)
- [ ] All words are nouns
- [ ] Game start accepts language
- [ ] Word selected correctly
- [ ] Fallback logic works

### Frontend
- [ ] Language selector displays
- [ ] 2 language options (EN/TH)
- [ ] 3 difficulty options
- [ ] Selection sent to backend
- [ ] Language shown during game
- [ ] Thai text renders correctly
- [ ] Responsive design
- [ ] Matches pixel art theme

---

## 🎨 UI Design

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
├─────────────────────────────────────────┤
│  Word Difficulty                        │
│  ┌────────┐ ┌────────┐ ┌────────┐      │
│  │ 🟢 Easy│ │ 🟡 Med │ │ 🔴 Hard│      │
│  └────────┘ └────────┘ └────────┘      │
├─────────────────────────────────────────┤
│  Current: 🇬🇧 EN - Medium              │
└─────────────────────────────────────────┘
```

### Game Header (All Players)
```
┌─────────────────────────────────────────┐
│  OUTSIDER  ⏱ 3:45  🇹🇭 TH  🟡 Medium   │
└─────────────────────────────────────────┘
```

---

## 📊 Word Bank Statistics

### By Language
```
English: 150 words (50%)
  - Easy:   50 words
  - Medium: 50 words
  - Hard:   50 words

Thai:      150 words (50%)
  - Easy:   50 words
  - Medium: 50 words
  - Hard:   50 words

Total:     300 words
```

### By Word Type
```
Nouns (People):    60 words (20%)
Nouns (Places):    60 words (20%)
Nouns (Things):   120 words (40%)
Nouns (Concepts):  60 words (20%)
```

---

## 🌐 Language Support Features

### English Words
- Common English nouns
- Easy to pronounce
- Culturally neutral
- Examples: Cat, House, Freedom, Quantum

### Thai Words
- Common Thai nouns (คำนาม)
- Proper UTF-8 encoding
- Native Thai script
- Examples: แมว, บ้าน, อิสรภาพ, ควอนตัม

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Empty word bank | Game can't start | Fallback to Elephant/ช้าง |
| Thai text encoding | Display issues | UTF-8 throughout stack |
| Font support | Thai not rendering | Use system fonts |
| Slow queries | Poor UX | Compound indexes |
| Wrong language | Confusion | Validate at API level |

---

## 🎯 Success Metrics

- ✅ Admin can select language easily
- ✅ Admin can select difficulty easily
- ✅ Word selected from correct category
- ✅ Language visible to all players
- ✅ Thai text renders perfectly
- ✅ No breaking changes to existing flow
- ✅ 300 words available at launch
- ✅ API responds < 100ms
- ✅ UI matches pixel art theme

---

## 📝 API Examples

### Get Random Word
```bash
# English, Medium
curl "http://localhost:3001/api/words/random?difficulty=medium&language=english"
# Response: {"word":"Telescope","difficulty":"medium","language":"english"}

# Thai, Hard
curl "http://localhost:3001/api/words/random?difficulty=hard&language=thai"
# Response: {"word":"ควอนตัม","difficulty":"hard","language":"thai"}
```

### Get All Words
```bash
# Filter by Thai language
curl "http://localhost:3001/api/words?language=thai&limit=10"
# Response: {"words":[...], "total":150, "page":1}
```

### Start Game with Language
```typescript
ws.send(JSON.stringify({
    type: 'start_game',
    hostPlayerId: 'xxx',
    difficulty: 'hard',
    language: 'thai'  // NEW parameter
}));
```

---

## 🚀 Future Enhancements (Phase 4+)

- More languages (Chinese, Japanese, Spanish)
- Custom word lists per room
- Word categories (animals, technology, nature)
- Word hints (first letter, number of letters)
- Seasonal word packs
- Community-submitted words

---

**Ready to implement!** 🚀
