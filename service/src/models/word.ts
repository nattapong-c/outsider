import mongoose, { Schema } from 'mongoose';
import { t } from 'elysia';

// Elysia schema for validation & Eden Treaty
export const WordSchema = t.Object({
    id: t.String(),
    word: t.String(),
    difficulty: t.Union([t.Literal('easy'), t.Literal('medium'), t.Literal('hard')]),
    language: t.Union([t.Literal('english'), t.Literal('thai')]),
    wordType: t.Literal('noun'),
    category: t.Optional(t.String()),
    createdAt: t.Date(),
    createdBy: t.Optional(t.String())
});

export type WordType = typeof WordSchema.static;

// Mongoose schema for MongoDB
const wordSchema = new Schema<WordType>({
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

export const WordModel = mongoose.model<WordType>('Word', wordSchema);
