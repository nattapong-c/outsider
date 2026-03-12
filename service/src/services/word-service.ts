import { WordModel } from '../models/word';

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

export async function getAllWords(page = 1, limit = 50, language?: 'english' | 'thai') {
    const skip = (page - 1) * limit;
    const query = language ? { language } : {};
    
    const [words, total] = await Promise.all([
        WordModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        WordModel.countDocuments(query)
    ]);
    
    return {
        words,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    };
}

export async function addWord(
    word: string,
    difficulty: 'easy' | 'medium' | 'hard',
    language: 'english' | 'thai' = 'english',
    category?: string,
    createdBy?: string
) {
    const exists = await WordModel.findOne({ 
        word: language === 'thai' ? word : { $regex: new RegExp(`^${word}$`, 'i') },
        language
    });
    
    if (exists) {
        throw new Error('Word already exists in bank');
    }
    
    const newWord = new WordModel({
        word: word.trim(),
        difficulty,
        language,
        wordType: 'noun',
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
                _id: { difficulty: '$difficulty', language: '$language' },
                count: { $sum: 1 }
            }
        }
    ]);
    
    const total = await WordModel.countDocuments();
    
    return {
        total,
        byLanguage: {
            english: stats
                .filter(s => s._id.language === 'english')
                .reduce((sum, s) => sum + s.count, 0),
            thai: stats
                .filter(s => s._id.language === 'thai')
                .reduce((sum, s) => sum + s.count, 0)
        },
        byDifficulty: {
            easy: stats
                .filter(s => s._id.difficulty === 'easy')
                .reduce((sum, s) => sum + s.count, 0),
            medium: stats
                .filter(s => s._id.difficulty === 'medium')
                .reduce((sum, s) => sum + s.count, 0),
            hard: stats
                .filter(s => s._id.difficulty === 'hard')
                .reduce((sum, s) => sum + s.count, 0)
        }
    };
}
