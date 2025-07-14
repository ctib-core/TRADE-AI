import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

// --- MOCK MONGODB FALLBACK ---
const USE_MOCK_DB = process.env.USE_MOCK_DB === 'true';
let isConnected = false;
let mockDb = null;

if (USE_MOCK_DB) {
    logger.warn('Using MOCK MongoDB (in-memory, non-persistent)');
    mockDb = {
        isConnected: true,
        connect: async () => { logger.info('Mock DB connected'); isConnected = true; },
        disconnect: async () => { logger.info('Mock DB disconnected'); isConnected = false; },
        connection: { readyState: 1 }
    };
}

export const connectDatabase = async () => {
    if (isConnected) {
        logger.info('Database already connected');
        return;
    }
    if (USE_MOCK_DB) {
        await mockDb.connect();
        return;
    }
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto_prediction';
        
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        isConnected = true;
        logger.info('✅ MongoDB connected successfully');

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error:', err);
            isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
            isConnected = false;
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected');
            isConnected = true;
        });

    } catch (error) {
        logger.error('Failed to connect to MongoDB:', error);
        throw error;
    }
};

export const disconnectDatabase = async () => {
    if (isConnected) {
        await mongoose.disconnect();
        isConnected = false;
        logger.info('MongoDB disconnected');
    }
};

export const getConnectionStatus = () => {
    return {
        isConnected,
        readyState: mongoose.connection.readyState
    };
}; 