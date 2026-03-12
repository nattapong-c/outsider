# Phase 3: Word Management System - Backend

## 🎯 Goal
Implement a comprehensive word management system with difficulty levels, allowing admins to select word difficulty before each game round.

## 🚀 Features

### 1. Word Difficulty & Language System
*   **Three Difficulty Levels:**
    *   **Easy**: Common, everyday nouns (e.g., "Cat", "House", "Apple" / "แมว", "บ้าน", "แอปเปิ้ล")
    *   **Medium**: More specific or abstract nouns (e.g., "Telescope", "Freedom", "Jazz" / "กล้องโทรทรรศน์", "อิสรภาพ", "แจ๊ส")
    *   **Hard**: Complex, obscure, or technical nouns (e.g., "Quantum", "Algorithm", "Renaissance" / "ควอนตัม", "อัลกอริทึม", "เรอเนสซองส์")
*   **Language Support:**
    *   **English**: All English nouns
    *   **Thai**: All Thai nouns (ภาษาไทย)
    *   Admin selects language before each game
    *   System filters words by selected language
*   **Word Type Restriction:**
    *   **Nouns Only**: All words must be nouns (people, places, things, concepts)
    *   No verbs, adjectives, or adverbs
    *   Proper nouns allowed (names, places)
*   **Difficulty Selection:**
    *   Admin selects both difficulty AND language before starting game
    *   Default to "Medium" difficulty and "English" language
    *   Selection persists for current round only
*   **Word Selection Logic:**
    *   System randomly selects word from chosen difficulty AND language
    *   Word is revealed to Host and Insider at game start
    *   Word is hidden from Commons

### 2. Word Bank Management
*   **Pre-populated Word Lists:**
    *   Initial seed of 50+ words per difficulty per language (300+ total)
    *   English: 150+ words (50 per difficulty)
    *   Thai: 150+ words (50 per difficulty)
    *   Words categorized by difficulty and language in database
    *   Each word has metadata (difficulty, language, word type)
*   **Word Structure:**
    ```typescript
    {
        word: string,                    // The actual word
        difficulty: 'easy' | 'medium' | 'hard',
        language: 'english' | 'thai',    // Language of word
        wordType: 'noun',                // Always 'noun'
        category?: string,               // Optional category/tag
        createdAt: Date,
        createdBy?: string               // Admin who added (if custom)
    }
    ```
*   **Word Retrieval:**
    *   Endpoint to get random word by difficulty AND language
    *   Endpoint to get all words (filter by language)
    *   Endpoint to add new word (validate noun type)
    *   Endpoint to delete word
    *   Endpoint to get statistics by language

### 3. Admin Word Management API
*   **REST Endpoints:**
    *   `GET /api/words/random?difficulty=medium&language=thai` - Get random word by difficulty AND language
    *   `GET /api/words?language=english` - Get all words (filter by language, paginated)
    *   `POST /api/words` - Add new word (validate noun type, language)
    *   `DELETE /api/words/:id` - Delete word
    *   `GET /api/words/stats` - Get word bank statistics (by language & difficulty)
*   **WebSocket Integration:**
    *   Word selected automatically when game starts
    *   Based on difficulty AND language selected by admin
    *   Word sent to Host and Insider only

### 4. Game Integration
*   **Difficulty Selection in Lobby:**
    *   Admin selects difficulty before starting game
    *   Sent via `start_game` event with `difficulty` parameter
    *   Backend validates difficulty and selects appropriate word
*   **Word Assignment:**
    *   Word selected randomly from difficulty category
    *   Stored in room's `secretWord` field
    *   Revealed to Host and Insider via `game_started` event
*   **Fallback Logic:**
    *   If no words in selected difficulty, use Medium as fallback
    *   Log warning when fallback occurs

## 🛠 Technical Implementation

### Database Schema (MongoDB)

```typescript
// New Word Model
import mongoose, { Schema } from 'mongoose';

export interface IWord {
    word: string;
    difficulty: 'easy' | 'medium' | 'hard';
    language: 'english' | 'thai';
    wordType: 'noun';
    category?: string;
    createdAt: Date;
    createdBy?: string;
}

const wordSchema = new Schema<IWord>({
    word: { 
        type: String, 
        required: true, 
        trim: true,
        minlength: 2,
        maxlength: 100
    },
    difficulty: { 
        type: String, 
        enum: ['easy', 'medium', 'hard'], 
        required: true,
        index: true 
    },
    language: { 
        type: String, 
        enum: ['english', 'thai'], 
        required: true,
        index: true,
        default: 'english'
    },
    wordType: { 
        type: String, 
        enum: ['noun'], 
        required: true,
        default: 'noun'
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

// Compound index for efficient filtering
wordSchema.index({ difficulty: 1, language: 1, createdAt: 1 });

export const WordModel = mongoose.model<IWord>('Word', wordSchema);
```

### Update Room Schema

```typescript
// Add to TimerConfigSchema in room.ts
export const TimerConfigSchema = t.Object({
    quiz: t.Number(),
    discussion: t.Number(),
    votingMode: t.Union([t.Literal('auto'), t.Literal('manual')]),
    difficulty: t.Union([t.Literal('easy'), t.Literal('medium'), t.Literal('hard')]) // NEW
});
```

### Backend Service Layer

```typescript
// service/src/services/word-service.ts
import { WordModel } from '../models/word';

export const DIFFICULTY_WEIGHTS = {
    easy: 1,
    medium: 2,
    hard: 3
} as const;

export async function getRandomWord(
    difficulty: 'easy' | 'medium' | 'hard',
    language: 'english' | 'thai' = 'english'
): Promise<string> {
    // Get words for difficulty AND language
    const words = await WordModel.find({ difficulty, language }).lean();
    
    if (words.length === 0) {
        // Fallback to same difficulty, different language
        console.warn(`No words found for ${difficulty}/${language}, trying fallback`);
        const fallbackLang = language === 'english' ? 'thai' : 'english';
        const fallbackWords = await WordModel.find({ difficulty, language: fallbackLang }).lean();
        
        if (fallbackWords.length === 0) {
            // Ultimate fallback to medium difficulty
            const mediumWords = await WordModel.find({ difficulty: 'medium', language }).lean();
            if (mediumWords.length === 0) {
                return language === 'thai' ? 'ช้าง' : 'Elephant';
            }
            return mediumWords[Math.floor(Math.random() * mediumWords.length)].word;
        }
        return fallbackWords[Math.floor(Math.random() * fallbackWords.length)].word;
    }
    
    // Random selection
    return words[Math.floor(Math.random() * words.length)].word;
}

export async function getAllWords(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [words, total] = await Promise.all([
        WordModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        WordModel.countDocuments()
    ]);
    
    return {
        words,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    };
}

export async function addWord(word: string, difficulty: 'easy' | 'medium' | 'hard', category?: string, createdBy?: string) {
    const existing = await WordModel.findOne({ 
        word: { $regex: new RegExp(`^${word}$`, 'i') } 
    });
    
    if (existing) {
        throw new Error('Word already exists in bank');
    }
    
    const newWord = new WordModel({
        word: word.trim(),
        difficulty,
        category,
        createdBy,
        createdAt: new Date()
    });
    
    await newWord.save();
    return newWord;
}

export async function deleteWord(wordId: string) {
    const result = await WordModel.findByIdAndDelete(wordId);
    if (!result) {
        throw new Error('Word not found');
    }
    return result;
}

export async function getWordStats() {
    const stats = await WordModel.aggregate([
        {
            $group: {
                _id: '$difficulty',
                count: { $sum: 1 }
            }
        }
    ]);
    
    const total = await WordModel.countDocuments();
    
    return {
        total,
        byDifficulty: {
            easy: stats.find(s => s._id === 'easy')?.count || 0,
            medium: stats.find(s => s._id === 'medium')?.count || 0,
            hard: stats.find(s => s._id === 'hard')?.count || 0
        }
    };
}
```

### Update Game Start Handler

```typescript
// In ws-controller.ts, start_game handler
if (parsedMessage.type === 'start_game') {
    // ... existing validation ...
    
    // Get difficulty from message (default to medium)
    const difficulty = parsedMessage.difficulty || 'medium';
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        logger.warn({ roomId, difficulty }, 'Invalid difficulty, using medium');
    }
    
    // Select random word based on difficulty
    const secretWord = await getRandomWord(difficulty as 'easy' | 'medium' | 'hard');
    
    room.secretWord = secretWord;
    room.timerConfig.difficulty = difficulty; // Store selected difficulty
    
    // ... rest of game start logic ...
}
```

### REST API Endpoints

```typescript
// service/src/controllers/word-controller.ts
import { Elysia, t } from 'elysia';
import { WordModel } from '../models/word';
import { getRandomWord, getAllWords, addWord, deleteWord, getWordStats } from '../services/word-service';

export const wordRoutes = new Elysia({ prefix: '/api/words' })
    // Get random word by difficulty AND language
    .get('/random', async ({ query, set }) => {
        const difficulty = query.difficulty || 'medium';
        const language = query.language || 'english';

        if (!['easy', 'medium', 'hard'].includes(difficulty)) {
            set.status = 400;
            return { error: 'Invalid difficulty. Must be easy, medium, or hard' };
        }
        if (!['english', 'thai'].includes(language)) {
            set.status = 400;
            return { error: 'Invalid language. Must be english or thai' };
        }

        try {
            const word = await getRandomWord(
                difficulty as 'easy' | 'medium' | 'hard',
                language as 'english' | 'thai'
            );
            return { word, difficulty, language };
        } catch (error) {
            set.status = 500;
            return { error: 'Failed to get random word' };
        }
    }, {
        query: t.Object({
            difficulty: t.Optional(t.String()),
            language: t.Optional(t.String())
        })
    })

    // Get all words (paginated, filter by language)
    .get('/', async ({ query, set }) => {
        const page = parseInt(query.page || '1');
        const limit = parseInt(query.limit || '50');
        const language = query.language;

        try {
            const result = await getAllWords(page, limit, language as 'english' | 'thai' | undefined);
            return result;
        } catch (error) {
            set.status = 500;
            return { error: 'Failed to get words' };
        }
    }, {
        query: t.Object({
            page: t.Optional(t.String()),
            limit: t.Optional(t.String()),
            language: t.Optional(t.String())
        })
    })
    
    // Get word stats
    .get('/stats', async ({ set }) => {
        try {
            return await getWordStats();
        } catch (error) {
            set.status = 500;
            return { error: 'Failed to get stats' };
        }
    })
    
    // Add new word
    .post('/', async ({ body, set }) => {
        const { word, difficulty, category, createdBy } = body;
        
        if (!word || !difficulty) {
            set.status = 400;
            return { error: 'Word and difficulty are required' };
        }
        
        if (!['easy', 'medium', 'hard'].includes(difficulty)) {
            set.status = 400;
            return { error: 'Invalid difficulty' };
        }
        
        try {
            const newWord = await addWord(word, difficulty as 'easy' | 'medium' | 'hard', category, createdBy);
            set.status = 201;
            return { success: true, word: newWord };
        } catch (error: any) {
            if (error.message === 'Word already exists in bank') {
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
    
    // Delete word
    .delete('/:id', async ({ params, set }) => {
        const { id } = params;
        
        try {
            await deleteWord(id);
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
        params: t.Object({
            id: t.String()
        })
    });
```

### Seed Initial Word Bank

```typescript
// service/src/lib/seed-words.ts
import { WordModel } from '../models/word';

const INITIAL_WORDS = {
    english: {
        easy: [
            'Cat', 'Dog', 'House', 'Apple', 'Book', 'Chair', 'Table', 'Phone',
            'Water', 'Bread', 'Milk', 'Tree', 'Flower', 'Car', 'Bike', 'Ball',
            'Fish', 'Bird', 'Door', 'Window', 'Pen', 'Paper', 'Shoe', 'Shirt',
            'Hat', 'Cup', 'Plate', 'Spoon', 'Fork', 'Knife', 'Bed', 'Lamp',
            'Clock', 'Mirror', 'Towel', 'Soap', 'Brush', 'Comb', 'Key', 'Lock'
        ],
        medium: [
            'Telescope', 'Freedom', 'Jazz', 'Guitar', 'Mountain', 'Ocean',
            'Desert', 'Forest', 'Castle', 'Pirate', 'Astronaut', 'Robot',
            'Volcano', 'Earthquake', 'Hurricane', 'Lightning', 'Thunder',
            'Rainbow', 'Sunset', 'Sunrise', 'Midnight', 'Noon', 'Dawn',
            'Dusk', 'Spring', 'Summer', 'Autumn', 'Winter', 'Holiday',
            'Festival', 'Museum', 'Theater', 'Library', 'Hospital', 'School',
            'University', 'Market', 'Restaurant', 'Hotel', 'Airport', 'Station'
        ],
        hard: [
            'Quantum', 'Renaissance', 'Algorithm', 'Philosophy', 'Metaphor',
            'Paradox', 'Hypothesis', 'Catalyst', 'Metabolism', 'Photosynthesis',
            'Gravity', 'Relativity', 'Electricity', 'Magnetism', 'Radiation',
            'Evolution', 'Mutation', 'Chromosome', 'Virus', 'Bacteria',
            'Microorganism', 'Ecosystem', 'Biodiversity', 'Climate', 'Geology',
            'Astronomy', 'Psychology', 'Sociology', 'Economics', 'Literature',
            'Architecture', 'Engineering', 'Mathematics', 'Chemistry', 'Physics'
        ]
    },
    thai: {
        easy: [
            'แมว', 'หมา', 'บ้าน', 'แอปเปิ้ล', 'หนังสือ', 'เก้าอี้', 'โต๊ะ', 'โทรศัพท์',
            'น้ำ', 'ขนมปัง', 'นม', 'ต้นไม้', 'ดอกไม้', 'รถ', 'จักรยาน', 'บอล',
            'ปลา', 'นก', 'ประตู', 'หน้าต่าง', 'ปากกา', 'กระดาษ', 'รองเท้า', 'เสื้อ',
            'หมวก', 'ถ้วย', 'จาน', 'ช้อน', 'ส้อม', 'มีด', 'เตียง', 'โคมไฟ',
            'นาฬิกา', 'กระจก', 'ผ้าเช็ดตัว', 'สบู่', 'แปรง', 'หวี', 'กุญแจ', 'ลูกกุญแจ'
        ],
        medium: [
            'กล้องโทรทรรศน์', 'อิสรภาพ', 'แจ๊ส', 'กีตาร์', 'ภูเขา', 'มหาสมุทร',
            'ทะเลทราย', 'ป่าไม้', 'ปราสาท', 'โจรสลัด', 'นักบินอวกาศ', 'หุ่นยนต์',
            'ภูเขาไฟ', 'แผ่นดินไหว', 'พายุไต้ฝุ่น', 'ฟ้าแลบ', 'ฟ้าร้อง',
            'รุ้งกินน้ำ', 'พระอาทิตย์ตก', 'พระอาทิตย์ขึ้น', 'เที่ยงคืน', 'เที่ยงวัน', 'รุ่งเช้า',
            'พลบค่ำ', 'ฤดูใบไม้ผลิ', 'ฤดูร้อน', 'ฤดูใบไม้ร่วง', 'ฤดูหนาว', 'วันหยุด',
            'เทศกาล', 'พิพิธภัณฑ์', 'โรงละคร', 'ห้องสมุด', 'โรงพยาบาล', 'โรงเรียน',
            'มหาวิทยาลัย', 'ตลาด', 'ร้านอาหาร', 'โรงแรม', 'สนามบิน', 'สถานี'
        ],
        hard: [
            'ควอนตัม', 'เรอเนสซองส์', 'อัลกอริทึม', 'ปรัชญา', 'อุปมา',
            'ปฏิทรรศน์', 'สมมติฐาน', 'ตัวเร่งปฏิกิริยา', 'เมแทบอลิซึม', 'การสังเคราะห์แสง',
            'แรงโน้มถ่วง', 'สัมพัทธภาพ', 'ไฟฟ้า', 'แม่เหล็ก', 'รังสี',
            'วิวัฒนาการ', 'การกลายพันธุ์', 'โครโมโซม', 'ไวรัส', 'แบคทีเรีย',
            'จุลินทรีย์', 'ระบบนิเวศ', 'ความหลากหลายทางชีวภาพ', 'ภูมิอากาศ', 'ธรณีวิทยา',
            'ดาราศาสตร์', 'จิตวิทยา', 'สังคมวิทยา', 'เศรษฐศาสตร์', 'วรรณกรรม',
            'สถาปัตยกรรม', 'วิศวกรรม', 'คณิตศาสตร์', 'เคมี', 'ฟิสิกส์'
        ]
    }
};

export async function seedWordBank() {
    console.log('Seeding word bank...');
    
    let totalAdded = 0;
    
    // Seed English words
    for (const [difficulty, words] of Object.entries(INITIAL_WORDS.english)) {
        for (const word of words) {
            const exists = await WordModel.findOne({ 
                word: { $regex: new RegExp(`^${word}$`, 'i') },
                language: 'english'
            });
            
            if (!exists) {
                await WordModel.create({
                    word,
                    difficulty: difficulty as any,
                    language: 'english',
                    wordType: 'noun',
                    createdAt: new Date()
                });
                totalAdded++;
            }
        }
    }
    
    // Seed Thai words
    for (const [difficulty, words] of Object.entries(INITIAL_WORDS.thai)) {
        for (const word of words) {
            const exists = await WordModel.findOne({ 
                word: word, // Thai script exact match
                language: 'thai'
            });
            
            if (!exists) {
                await WordModel.create({
                    word,
                    difficulty: difficulty as any,
                    language: 'thai',
                    wordType: 'noun',
                    createdAt: new Date()
                });
                totalAdded++;
            }
        }
    }
    
    console.log(`Added ${totalAdded} new words to word bank`);
    console.log(`- English: ${INITIAL_WORDS.english.easy.length + INITIAL_WORDS.english.medium.length + INITIAL_WORDS.english.hard.length} words`);
    console.log(`- Thai: ${INITIAL_WORDS.thai.easy.length + INITIAL_WORDS.thai.medium.length + INITIAL_WORDS.thai.hard.length} words`);
}
```

### Update Main Entry Point

```typescript
// service/src/index.ts
import { seedWordBank } from './lib/seed-words';

async function main() {
    // ... existing setup ...
    
    // Seed word bank on startup
    await seedWordBank();
    
    // ... start server ...
}

main();
```

## ✅ Acceptance Criteria

### Word Management
- [ ] Three difficulty levels implemented (easy, medium, hard)
- [ ] Two languages supported (English, Thai)
- [ ] 300+ words seeded (150 per language, 50 per difficulty)
- [ ] All words are nouns only
- [ ] Random word selection works correctly
- [ ] Fallback to same difficulty, different language if empty
- [ ] Ultimate fallback to "Elephant" or "ช้าง"

### API Endpoints
- [ ] `GET /api/words/random` returns random word by difficulty AND language
- [ ] `GET /api/words` returns paginated word list (filter by language)
- [ ] `POST /api/words` adds new word with validation (noun type, language)
- [ ] `DELETE /api/words/:id` deletes word
- [ ] `GET /api/words/stats` returns word bank statistics by language

### Game Integration
- [ ] Admin can select difficulty AND language before game start
- [ ] Word selected from correct difficulty AND language category
- [ ] Difficulty and language stored in room config
- [ ] Fallback logic works when category empty

### Data Persistence
- [ ] Words stored in MongoDB with language field
- [ ] Word schema includes all required fields (difficulty, language, wordType)
- [ ] Compound indexes created for performance
- [ ] Seed script runs on startup
- [ ] Thai words seeded correctly (UTF-8 support)

## 📊 Word Bank Statistics

| Difficulty | English Words | Thai Words | Total | Example Words (EN / TH) |
|------------|---------------|------------|-------|-------------------------|
| Easy | 50 | 50 | 100 | Cat / แมว, House / บ้าน |
| Medium | 50 | 50 | 100 | Telescope / กล้องโทรทรรศน์ |
| Hard | 50 | 50 | 100 | Quantum / ควอนตัม |
| **Total** | **150** | **150** | **300** | - |

## 🌟 Word Type Distribution

| Word Type | Count | Percentage |
|-----------|-------|------------|
| Nouns (People) | 60 | 20% |
| Nouns (Places) | 60 | 20% |
| Nouns (Things) | 120 | 40% |
| Nouns (Concepts) | 60 | 20% |
| **Total** | **300** | **100%** |

## 🚀 Future Enhancements (Phase 4+)

- Custom word lists per room
- Word categories/themes (animals, technology, nature)
- Word hints (first letter, number of letters)
- Seasonal word packs (Halloween, Christmas, etc.)
- Community-submitted words (with moderation)
