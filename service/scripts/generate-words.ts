/**
 * Word Generator Script
 * 
 * Generates random words using Gemini AI and adds them to the database
 * via the addWord API endpoint.
 * 
 * Usage: bun run scripts/generate-words.ts [count] [language]
 * 
 * Examples:
 *   bun run scripts/generate-words.ts 50 english
 *   bun run scripts/generate-words.ts 50 thai
 *   bun run scripts/generate-words.ts 100 all
 */

import { $ } from 'bun';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

interface WordData {
    word: string;
    difficulty: 'easy' | 'medium' | 'hard';
    language: 'english' | 'thai';
}

// Prompt templates for Gemini AI
const PROMPTS = {
    english: {
        easy: `Generate 20 common English nouns that are simple and everyday words. Examples: cat, dog, house, apple. Return ONLY the words, one per line, no numbers or explanations.`,
        medium: `Generate 20 English nouns that are more specific or abstract. Examples: telescope, freedom, jazz, mountain. Return ONLY the words, one per line, no numbers or explanations.`,
        hard: `Generate 20 complex, technical, or obscure English nouns. Examples: quantum, algorithm, renaissance, photosynthesis. Return ONLY the words, one per line, no numbers or explanations.`
    },
    thai: {
        easy: `สร้างคำนามภาษาไทยง่ายๆ 20 คำที่เป็นคำสามัญในชีวิตประจำวัน ตัวอย่าง: แมว, หมา, บ้าน, แอปเปิ้ล ส่งมาเฉพาะคำเท่านั้น บรรทัดละคำ ไม่มีตัวเลขหรือคำอธิบาย`,
        medium: `สร้างคำนามภาษาไทย 20 คำที่มีความเฉพาะเจาะจงหรือนามธรรมมากขึ้น ตัวอย่าง: กล้องโทรทรรศน์, อิสรภาพ, แจ๊ส, ภูเขา ส่งมาเฉพาะคำเท่านั้น บรรทัดละคำ ไม่มีตัวเลขหรือคำอธิบาย`,
        hard: `สร้างคำนามภาษาไทยที่ซับซ้อน เทคนิค หรือหายาก 20 คำ ตัวอย่าง: ควอนตัม, อัลกอริทึม, เรอเนสซองส์, การสังเคราะห์แสง ส่งมาเฉพาะคำเท่านั้น บรรทัดละคำ ไม่มีตัวเลขหรือคำอธิบาย`
    }
};

/**
 * Call Gemini AI API to generate words
 */
async function callGeminiAI(prompt: string): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.8,
                    maxOutputTokens: 2048,
                }
            })
        }
    );

    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

/**
 * Parse words from AI response
 */
function parseWords(text: string): string[] {
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.match(/^\d+[\.\)]/)) // Remove numbered lists
        .map(line => line.replace(/^\d+[\.\)]\s*/, '')) // Remove leading numbers
        .filter(word => word.length >= 2); // Filter very short words
}

/**
 * Add word to database via API
 */
async function addWordToDatabase(word: string, difficulty: string, language: string): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/words`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                word,
                difficulty,
                language,
                wordType: 'noun'
            })
        });

        if (response.ok) {
            return true;
        }

        const error = await response.json();
        if (response.status === 409) {
            console.log(`  ⚠️  Word "${word}" already exists`);
            return false;
        }

        console.error(`  ❌ Failed to add "${word}": ${error.error || response.statusText}`);
        return false;
    } catch (error) {
        console.error(`  ❌ Error adding "${word}": ${error}`);
        return false;
    }
}

/**
 * Generate and add words for a specific difficulty and language
 */
async function generateWordsForDifficulty(
    difficulty: 'easy' | 'medium' | 'hard',
    language: 'english' | 'thai',
    targetCount: number = 20
): Promise<number> {
    console.log(`\n📝 Generating ${difficulty} ${language} words...`);
    
    const prompt = PROMPTS[language][difficulty];
    let addedCount = 0;
    let attempts = 0;
    const maxAttempts = 3;

    while (addedCount < targetCount && attempts < maxAttempts) {
        attempts++;
        console.log(`  Attempt ${attempts}/${maxAttempts}...`);
        
        try {
            const response = await callGeminiAI(prompt);
            const words = parseWords(response);
            
            console.log(`  Generated ${words.length} words`);
            
            for (const word of words) {
                if (addedCount >= targetCount) break;
                
                const success = await addWordToDatabase(word, difficulty, language);
                if (success) {
                    addedCount++;
                    console.log(`  ✅ Added: ${word}`);
                }
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } catch (error) {
            console.error(`  ❌ Error generating words: ${error}`);
            if (attempts >= maxAttempts) {
                console.error(`  ❌ Max attempts reached for ${difficulty} ${language}`);
            }
        }
    }

    console.log(`  📊 Added ${addedCount}/${targetCount} ${difficulty} ${language} words`);
    return addedCount;
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);
    const targetCount = parseInt(args[0]) || 20;
    const languageArg = args[1] || 'all';

    console.log('🚀 Word Generator Script');
    console.log('========================');
    console.log(`Target: ${targetCount} words per difficulty`);
    console.log(`Language: ${languageArg}`);
    console.log(`API URL: ${API_BASE_URL}`);

    if (!GEMINI_API_KEY) {
        console.error('\n❌ Error: GEMINI_API_KEY environment variable is required');
        console.error('Set it with: export GEMINI_API_KEY=your_key_here');
        process.exit(1);
    }

    // Test API connection
    try {
        const response = await fetch(`${API_BASE_URL}/api/words/stats`);
        if (!response.ok) {
            throw new Error(`API not responding: ${response.status}`);
        }
        const stats = await response.json();
        console.log(`\n✅ Connected to API`);
        console.log(`   Current word count: ${stats.total}`);
    } catch (error) {
        console.error(`\n❌ Cannot connect to API at ${API_BASE_URL}`);
        console.error(`   Make sure the backend is running`);
        process.exit(1);
    }

    const languages: ('english' | 'thai')[] = languageArg === 'all' 
        ? ['english', 'thai'] 
        : [languageArg as 'english' | 'thai'];

    const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];

    let totalAdded = 0;

    for (const language of languages) {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`🌐 Generating ${language.toUpperCase()} words`);
        console.log('='.repeat(50));

        for (const difficulty of difficulties) {
            const added = await generateWordsForDifficulty(difficulty, language, targetCount);
            totalAdded += added;
            
            // Delay between difficulties
            if (difficulty !== 'hard') {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Generation Complete!');
    console.log('='.repeat(50));
    console.log(`Total words added: ${totalAdded}`);
    
    // Show final stats
    try {
        const response = await fetch(`${API_BASE_URL}/api/words/stats`);
        const stats = await response.json();
        console.log(`\n📊 Final Word Bank Statistics:`);
        console.log(`   Total: ${stats.total}`);
        console.log(`   English: ${stats.byLanguage.english}`);
        console.log(`   Thai: ${stats.byLanguage.thai}`);
        console.log(`   Easy: ${stats.byDifficulty.easy}`);
        console.log(`   Medium: ${stats.byDifficulty.medium}`);
        console.log(`   Hard: ${stats.byDifficulty.hard}`);
    } catch (error) {
        console.error(`\n⚠️  Could not fetch final stats: ${error}`);
    }
}

// Run the script
main().catch(console.error);
