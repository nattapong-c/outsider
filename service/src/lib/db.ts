import mongoose from 'mongoose';
import { logger } from './logger';

export const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/outsider';
        await mongoose.connect(mongoURI);
        logger.info('MongoDB connected successfully');
    } catch (error) {
        logger.error({ err: error }, 'MongoDB connection error. Please ensure MongoDB is running.');
        // process.exit(1); // Removed to allow server to start without DB for now
    }
};
