import mongoose, { Schema } from 'mongoose';
import { t } from 'elysia';

// --- Elysia Schemas (for Validation & Eden Treaty) ---
export const PlayerSchema = t.Object({
    id: t.String(),
    name: t.String(),
    deviceId: t.String(),
    isAdmin: t.Boolean(),
    isOnline: t.Boolean(),
    inGameRole: t.Union([t.Literal('host'), t.Literal('insider'), t.Literal('common'), t.Null()])
});

export const VoteSchema = t.Object({
    voterId: t.String(),
    targetId: t.String()
});

export const GameResultSchema = t.Object({
    winner: t.Union([t.Literal('commons'), t.Literal('insider')]),
    insiderIdentified: t.Boolean(),
    wordGuessed: t.Boolean()
});

export const TimerConfigSchema = t.Object({
    quiz: t.Number(),
    discussion: t.Number(),
    votingMode: t.Union([t.Literal('auto'), t.Literal('manual')])
});

export const RoomSchema = t.Object({
    roomId: t.String(),
    status: t.Union([
        t.Literal('lobby'),
        t.Literal('playing'),
        t.Literal('showdown_discussion'),
        t.Literal('showdown_voting'),
        t.Literal('completed')
    ]),
    secretWord: t.String(),
    timerConfig: TimerConfigSchema,
    phaseEndTime: t.Union([t.Number(), t.Null()]),
    players: t.Array(PlayerSchema),
    votes: t.Array(VoteSchema),
    gameResult: t.Union([GameResultSchema, t.Null()])
});

export type PlayerType = typeof PlayerSchema.static;
export type VoteType = typeof VoteSchema.static;
export type GameResultType = typeof GameResultSchema.static;
export type RoomType = typeof RoomSchema.static;

// --- Mongoose Schemas (for MongoDB Persistence) ---
const playerMongooseSchema = new Schema<PlayerType>({
    id: { type: String, required: true },
    name: { type: String, required: true },
    deviceId: { type: String, required: true },
    isAdmin: { type: Boolean, required: true, default: false },
    isOnline: { type: Boolean, required: true, default: true },
    inGameRole: { type: String, enum: ['host', 'insider', 'common', null], default: null }
}, { _id: false });

const voteMongooseSchema = new Schema<VoteType>({
    voterId: { type: String, required: true },
    targetId: { type: String, required: true }
}, { _id: false });

const gameResultMongooseSchema = new Schema<GameResultType>({
    winner: { type: String, enum: ['commons', 'insider'], required: true },
    insiderIdentified: { type: Boolean, required: true },
    wordGuessed: { type: Boolean, required: true }
}, { _id: false });

const timerConfigMongooseSchema = new Schema({
    quiz: { type: Number, required: true, default: 180 },
    discussion: { type: Number, required: true, default: 180 },
    votingMode: { type: String, enum: ['auto', 'manual'], required: true, default: 'auto' }
}, { _id: false });

const roomMongooseSchema = new Schema<RoomType>({
    roomId: { type: String, required: true, unique: true, index: true },
    status: { 
        type: String, 
        enum: ['lobby', 'playing', 'showdown_discussion', 'showdown_voting', 'completed'], 
        required: true, 
        default: 'lobby' 
    },
    secretWord: { type: String, default: '' },
    timerConfig: { 
        type: timerConfigMongooseSchema, 
        default: () => ({ quiz: 180, discussion: 180, votingMode: 'auto' }) 
    },
    phaseEndTime: { type: Number, default: null },
    players: [playerMongooseSchema],
    votes: [voteMongooseSchema],
    gameResult: { type: gameResultMongooseSchema, default: null }
}, { timestamps: true });

export const RoomModel = mongoose.model<RoomType>('Room', roomMongooseSchema);
