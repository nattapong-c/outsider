# Phase 3: Word Management System - Backend Implementation Plan

## 📋 Overview
**Goal**: Implement comprehensive word management with difficulty levels  
**Estimated Time**: 3-4 hours  
**Priority**: High  
**Dependencies**: Phase 2 completion (voting, game results)

---

## 🎯 Task Breakdown

### Task 1: Create Word Model (30 mins)
**File**: `service/src/models/word.ts` (NEW)

**Subtasks**:
1. Create Mongoose schema for words
2. Add difficulty enum (easy, medium, hard)
3. Add indexes for performance
4. Add validation (word length, uniqueness)
5. Export types for Elysia schemas

**Code**:
```typescript
import mongoose, { Schema } from 'mongoose';
import { t } from 'elysia';

// Elysia schema for validation
export const WordSchema = t.Object({
    id: t.String(),
    word: t.String(),
    difficulty: t.Union([t.Literal('easy'), t.Literal('medium'), t.Literal('hard')]),
    category: t.Optional(t.String()),
    createdAt: t.Date(),
    createdBy: t.Optional(t.String())
});

export type WordType = typeof WordSchema.static;

// Mongoose schema
const wordSchema = new Schema<WordType>({
    word: { 
        type: String, 
        required: true, 
        trim: true,
        minlength: 3,
        maxlength: 50,
        unique: true
    },
    difficulty: { 
        type: String, 
        enum: ['easy', 'medium', 'hard'], 
        required: true,
        index: true 
    },
    category: { 
        type: String, 
        trim: true 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    createdBy: { 
        type: String 
    }
});

// Index for efficient queries
wordSchema.index({ difficulty: 1, createdAt: 1 });

export const WordModel = mongoose.model<WordType>('Word', wordSchema);
```

**Acceptance Criteria**:
- [ ] TypeScript compiles without errors
- [ ] MongoDB collection created
- [ ] Indexes applied
- [ ] Validation works

---

### Task 2: Create Word Service (45 mins)
**File**: `service/src/services/word-service.ts` (NEW)

**Subtasks**:
1. Create `getRandomWord()` function
2. Create `getAllWords()` function (paginated)
3. Create `addWord()` function
4. Create `deleteWord()` function
5. Create `getWordStats()` function
6. Add fallback logic

**Code**:
```typescript
import { WordModel } from '../models/word';

export async function getRandomWord(difficulty: 'easy' | 'medium' | 'hard'): Promise<string> {
    const words = await WordModel.find({ difficulty }).lean();
    
    if (words.length === 0) {
        console.warn(`No words found for ${difficulty}, falling back to medium`);
        const fallbackWords = await WordModel.find({ difficulty: 'medium' }).lean();
        if (fallbackWords.length === 0) {
            return 'Elephant'; // Ultimate fallback
        }
        return fallbackWords[Math.floor(Math.random() * fallbackWords.length)].word;
    }
    
    return words[Math.floor(Math.random() * words.length)].word;
}

export async function getAllWords(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [words, total] = await Promise.all([
        WordModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        WordModel.countDocuments()
    ]);
    
    return { words, total, page, totalPages: Math.ceil(total / limit) };
}

export async function addWord(word: string, difficulty: 'easy' | 'medium' | 'hard', category?: string, createdBy?: string) {
    const exists = await WordModel.findOne({ word: { $regex: new RegExp(`^${word}$`, 'i') } });
    if (exists) throw new Error('Word already exists');
    
    return await WordModel.create({ word: word.trim(), difficulty, category, createdBy });
}

export async function deleteWord(wordId: string) {
    const result = await WordModel.findByIdAndDelete(wordId);
    if (!result) throw new Error('Word not found');
    return result;
}

export async function getWordStats() {
    const stats = await WordModel.aggregate([
        { $group: { _id: '$difficulty', count: { $sum: 1 } } }
    ]);
    
    return {
        total: await WordModel.countDocuments(),
        byDifficulty: {
            easy: stats.find(s => s._id === 'easy')?.count || 0,
            medium: stats.find(s => s._id === 'medium')?.count || 0,
            hard: stats.find(s => s._id === 'hard')?.count || 0
        }
    };
}
```

**Acceptance Criteria**:
- [ ] All functions work correctly
- [ ] Fallback logic tested
- [ ] Pagination works
- [ ] Error handling in place

---

### Task 3: Create Word Controller (45 mins)
**File**: `service/src/controllers/word-controller.ts` (NEW)

**Subtasks**:
1. Create REST endpoints
2. Add validation
3. Add error handling
4. Add logging

**Code**:
```typescript
import { Elysia, t } from 'elysia';
import { getRandomWord, getAllWords, addWord, deleteWord, getWordStats } from '../services/word-service';

export const wordRoutes = new Elysia({ prefix: '/api/words' })
    .get('/random', async ({ query, set }) => {
        const difficulty = query.difficulty || 'medium';
        if (!['easy', 'medium', 'hard'].includes(difficulty)) {
            set.status = 400;
            return { error: 'Invalid difficulty' };
        }
        try {
            const word = await getRandomWord(difficulty as any);
            return { word, difficulty };
        } catch (error) {
            set.status = 500;
            return { error: 'Failed to get word' };
        }
    }, {
        query: t.Object({ difficulty: t.Optional(t.String()) })
    })
    
    .get('/', async ({ query, set }) => {
        const page = parseInt(query.page || '1');
        const limit = parseInt(query.limit || '50');
        try {
            return await getAllWords(page, limit);
        } catch (error) {
            set.status = 500;
            return { error: 'Failed to get words' };
        }
    }, {
        query: t.Object({
            page: t.Optional(t.String()),
            limit: t.Optional(t.String())
        })
    })
    
    .get('/stats', async ({ set }) => {
        try {
            return await getWordStats();
        } catch (error) {
            set.status = 500;
            return { error: 'Failed to get stats' };
        }
    })
    
    .post('/', async ({ body, set }) => {
        const { word, difficulty, category, createdBy } = body;
        if (!word || !difficulty) {
            set.status = 400;
            return { error: 'Word and difficulty required' };
        }
        if (!['easy', 'medium', 'hard'].includes(difficulty)) {
            set.status = 400;
            return { error: 'Invalid difficulty' };
        }
        try {
            const newWord = await addWord(word, difficulty as any, category, createdBy);
            set.status = 201;
            return { success: true, word: newWord };
        } catch (error: any) {
            if (error.message === 'Word already exists') {
                set.status = 409;
                return { error: error.message };
            }
            set.status = 500;
            return { error: 'Failed to add word' };
        }
    }, {
        body: t.Object({
            word: t.String(),
            difficulty: t.String(),
            category: t.Optional(t.String()),
            createdBy: t.Optional(t.String())
        })
    })
    
    .delete('/:id', async ({ params, set }) => {
        try {
            await deleteWord(params.id);
            return { success: true };
        } catch (error: any) {
            if (error.message === 'Word not found') {
                set.status = 404;
                return { error: error.message };
            }
            set.status = 500;
            return { error: 'Failed to delete word' };
        }
    }, {
        params: t.Object({ id: t.String() })
    });
```

**Acceptance Criteria**:
- [ ] All endpoints respond correctly
- [ ] Validation works
- [ ] Error handling comprehensive
- [ ] Type safety with Eden

---

### Task 4: Create Seed Script (30 mins)
**File**: `service/src/lib/seed-words.ts` (NEW)

**Subtasks**:
1. Create initial word list (90+ words)
2. Seed on application startup
3. Prevent duplicates
4. Log seeding results

**Code**:
```typescript
import { WordModel } from '../models/word';

const INITIAL_WORDS = {
    easy: ['Cat', 'Dog', 'House', 'Apple', 'Book', 'Chair', 'Table', 'Phone', 'Water', 'Bread', 'Milk', 'Tree', 'Flower', 'Car', 'Bike', 'Ball', 'Fish', 'Bird', 'Door', 'Window', 'Pen', 'Paper', 'Shoe', 'Shirt', 'Hat', 'Cup', 'Plate', 'Spoon', 'Fork', 'Knife'],
    medium: ['Telescope', 'Freedom', 'Jazz', 'Guitar', 'Mountain', 'Ocean', 'Desert', 'Forest', 'Castle', 'Pirate', 'Astronaut', 'Robot', 'Volcano', 'Earthquake', 'Hurricane', 'Lightning', 'Thunder', 'Rainbow', 'Sunset', 'Sunrise', 'Midnight', 'Noon', 'Dawn', 'Dusk', 'Spring', 'Summer', 'Autumn', 'Winter', 'Holiday', 'Festival'],
    hard: ['Quantum', 'Renaissance', 'Algorithm', 'Philosophy', 'Metaphor', 'Paradox', 'Hypothesis', 'Catalyst', 'Metabolism', 'Photosynthesis', 'Gravity', 'Relativity', 'Electricity', 'Magnetism', 'Radiation', 'Evolution', 'Mutation', 'Chromosome', 'DNA', 'Virus', 'Bacteria', 'Microorganism', 'Ecosystem', 'Biodiversity', 'Climate', 'Geology', 'Astronomy', 'Psychology', 'Sociology', 'Economics']
};

export async function seedWordBank() {
    console.log('Seeding word bank...');
    let totalAdded = 0;
    
    for (const [difficulty, words] of Object.entries(INITIAL_WORDS)) {
        for (const word of words) {
            const exists = await WordModel.findOne({ word: { $regex: new RegExp(`^${word}$`, 'i') } });
            if (!exists) {
                await WordModel.create({ word, difficulty: difficulty as any, createdAt: new Date() });
                totalAdded++;
            }
        }
    }
    
    console.log(`Added ${totalAdded} new words to word bank`);
}
```

**Acceptance Criteria**:
- [ ] 90+ words seeded
- [ ] No duplicates created
- [ ] Runs on startup
- [ ] Logs results

---

### Task 5: Update Game Start Handler (30 mins)
**File**: `service/src/controllers/ws-controller.ts`

**Subtasks**:
1. Import word service
2. Update `start_game` handler
3. Add difficulty parameter
4. Select word based on difficulty
5. Store difficulty in room config

**Code Changes**:
```typescript
import { getRandomWord } from '../services/word-service';

// In start_game handler:
if (parsedMessage.type === 'start_game') {
    // ... existing validation ...
    
    // Get difficulty (default to medium)
    const difficulty = parsedMessage.difficulty || 'medium';
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        logger.warn({ roomId, difficulty }, 'Invalid difficulty, using medium');
    }
    
    // Select word based on difficulty
    const secretWord = await getRandomWord(difficulty as 'easy' | 'medium' | 'hard');
    
    room.secretWord = secretWord;
    room.timerConfig.difficulty = difficulty;
    
    // ... rest of game start logic ...
}
```

**Acceptance Criteria**:
- [ ] Difficulty parameter accepted
- [ ] Word selected from correct category
- [ ] Fallback works if category empty
- [ ] Difficulty stored in room

---

### Task 6: Update Room Schema (15 mins)
**File**: `service/src/models/room.ts`

**Subtasks**:
1. Add difficulty to `TimerConfigSchema`
2. Update Mongoose schema
3. Set default value

**Code Changes**:
```typescript
export const TimerConfigSchema = t.Object({
    quiz: t.Number(),
    discussion: t.Number(),
    votingMode: t.Union([t.Literal('auto'), t.Literal('manual')]),
    difficulty: t.Union([t.Literal('easy'), t.Literal('medium'), t.Literal('hard')]) // NEW
});

// In Mongoose schema:
const timerConfigMongooseSchema = new Schema({
    quiz: { type: Number, required: true, default: 180 },
    discussion: { type: Number, required: true, default: 180 },
    votingMode: { type: String, enum: ['auto', 'manual'], required: true, default: 'auto' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true, default: 'medium' }
}, { _id: false });
```

**Acceptance Criteria**:
- [ ] TypeScript compiles
- [ ] Eden infers types correctly
- [ ] Default value set
- [ ] Validation works

---

### Task 7: Register Routes & Seed (15 mins)
**File**: `service/src/index.ts`

**Subtasks**:
1. Import word routes
2. Register with Elysia app
3. Import seed function
4. Call on startup

**Code Changes**:
```typescript
import { wordRoutes } from './controllers/word-controller';
import { seedWordBank } from './lib/seed-words';

const app = new Elysia()
    // ... existing plugins ...
    .use(wordRoutes)
    // ... rest of routes ...

async function main() {
    await seedWordBank(); // Seed on startup
    app.listen(port);
}
```

**Acceptance Criteria**:
- [ ] Routes registered
- [ ] Seed runs on startup
- [ ] No startup errors
- [ ] Word bank populated

---

### Task 8: Testing (45 mins)

**Test Scenarios**:
```bash
# Test 1: Get random word
curl http://localhost:3001/api/words/random?difficulty=easy
# Should return random easy word

# Test 2: Get all words
curl http://localhost:3001/api/words?page=1&limit=10
# Should return paginated list

# Test 3: Get stats
curl http://localhost:3001/api/words/stats
# Should return word counts by difficulty

# Test 4: Add word
curl -X POST http://localhost:3001/api/words \
  -H "Content-Type: application/json" \
  -d '{"word":"TestWord","difficulty":"medium"}'
# Should add new word

# Test 5: Delete word
curl -X DELETE http://localhost:3001/api/words/:id
# Should delete word

# Test 6: Start game with difficulty
# Via WebSocket: {"type":"start_game","hostPlayerId":"xxx","difficulty":"hard"}
# Should select hard word
```

**Acceptance Criteria**:
- [ ] All endpoints tested
- [ ] Word selection works
- [ ] Fallback tested
- [ ] No errors in logs

---

## 📊 Summary

| Task | File | Time | Priority |
|------|------|------|----------|
| 1. Create Word Model | `service/src/models/word.ts` | 30m | P0 |
| 2. Create Word Service | `service/src/services/word-service.ts` | 45m | P0 |
| 3. Create Word Controller | `service/src/controllers/word-controller.ts` | 45m | P0 |
| 4. Create Seed Script | `service/src/lib/seed-words.ts` | 30m | P0 |
| 5. Update Game Start | `service/src/controllers/ws-controller.ts` | 30m | P0 |
| 6. Update Room Schema | `service/src/models/room.ts` | 15m | P0 |
| 7. Register Routes | `service/src/index.ts` | 15m | P0 |
| 8. Testing | Manual + curl | 45m | P0 |
| **Total** | | **4h 15m** | |

---

## 🚀 Execution Order
1. ✅ Task 1: Word Model (foundation)
2. ✅ Task 2: Word Service (business logic)
3. ✅ Task 6: Room Schema (unblocks game integration)
4. ✅ Task 4: Seed Script (populates data)
5. ✅ Task 3: Word Controller (API endpoints)
6. ✅ Task 7: Register Routes (make endpoints available)
7. ✅ Task 5: Game Start Handler (integration)
8. ✅ Task 8: Full Testing

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Empty word bank | Game can't start | Fallback to hardcoded word |
| Duplicate words | Confusion | Unique index + validation |
| Slow queries | Poor UX | Indexes on difficulty |
| Invalid difficulty | Wrong words | Validation at API level |

---

## 📝 Notes
- Seed 90+ words initially (30 per difficulty)
- Use Eden Treaty for type-safe API calls
- Log word selection for debugging
- Consider adding word categories in Phase 4
