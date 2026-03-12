import { Elysia, t } from 'elysia';
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
            const result = await getAllWords(
                page,
                limit,
                language as 'english' | 'thai' | undefined
            );
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
        const { word, difficulty, language, category, createdBy } = body;
        
        if (!word || !difficulty) {
            set.status = 400;
            return { error: 'Word and difficulty are required' };
        }
        
        if (!['easy', 'medium', 'hard'].includes(difficulty)) {
            set.status = 400;
            return { error: 'Invalid difficulty' };
        }
        
        if (!['english', 'thai'].includes(language || 'english')) {
            set.status = 400;
            return { error: 'Invalid language' };
        }
        
        try {
            const newWord = await addWord(
                word,
                difficulty as 'easy' | 'medium' | 'hard',
                (language || 'english') as 'english' | 'thai',
                category,
                createdBy
            );
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
            language: t.Optional(t.String()),
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
