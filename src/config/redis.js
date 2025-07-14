import { createClient } from 'redis';
import { logger } from '../utils/logger.js';

// --- MOCK REDIS FALLBACK ---
const USE_MOCK_REDIS = 'true';
// const USE_MOCK_REDIS = process.env.USE_MOCK_REDIS === 'true';

let redisClient = null;
let mockRedis = null;

if (USE_MOCK_REDIS) {
    logger.warn('Using MOCK Redis client (in-memory, non-persistent)');
    mockRedis = (() => {
        const store = new Map();
        return {
            isReady: true,
            async connect() {},
            async quit() { store.clear(); },
            async ping() { return 'PONG'; },
            async get(key) { return store.has(key) ? store.get(key) : null; },
            async setex(key, ttl, value) { store.set(key, value); },
            async set(key, value) { store.set(key, value); },
            async del(key) { store.delete(key); },
            async keys(pattern) {
                if (pattern === '*') return Array.from(store.keys());
                // Simple pattern support
                return Array.from(store.keys()).filter(k => k.includes(pattern.replace('*', '')));
            }
        };
    })();
    redisClient = mockRedis;
}

export const connectRedis = async () => {
    if (redisClient && redisClient.isReady) {
        logger.info('Redis already connected');
        return redisClient;
    }
    if (USE_MOCK_REDIS) {
        logger.info('Mock Redis ready');
        return redisClient;
    }

    try {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        
        redisClient = createClient({
            url: redisUrl,
            socket: {
                connectTimeout: 10000,
                lazyConnect: true
            }
        });

        // Handle Redis events
        redisClient.on('connect', () => {
            logger.info('✅ Redis connected successfully');
        });

        redisClient.on('ready', () => {
            logger.info('Redis client ready');
        });

        redisClient.on('error', (err) => {
            logger.error('Redis connection error:', err);
        });

        redisClient.on('end', () => {
            logger.warn('Redis connection ended');
        });

        redisClient.on('reconnecting', () => {
            logger.info('Redis reconnecting...');
        });

        await redisClient.connect();
        
        // Test connection
        await redisClient.ping();
        logger.info('Redis ping successful');

        return redisClient;
    } catch (error) {
        logger.error('Failed to connect to Redis:', error);
        throw error;
    }
};

export const disconnectRedis = async () => {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        logger.info('Redis disconnected');
    }
};

export const getRedisClient = () => {
    if (!redisClient || !redisClient.isReady) {
        throw new Error('Redis client not connected');
    }
    return redisClient;
};

// Cache utility functions
export const cacheData = async (key, data, ttl = 300) => {
    try {
        const client = getRedisClient();
        await client.setex(key, ttl, JSON.stringify(data));
        logger.debug(`Cached data for key: ${key}`);
    } catch (error) {
        logger.error(`Failed to cache data for key ${key}:`, error);
    }
};

export const getCachedData = async (key) => {
    try {
        const client = getRedisClient();
        const data = await client.get(key);
        if (data) {
            logger.debug(`Cache hit for key: ${key}`);
            return JSON.parse(data);
        }
        return null;
    } catch (error) {
        logger.error(`Failed to get cached data for key ${key}:`, error);
        return null;
    }
};

export const deleteCachedData = async (key) => {
    try {
        const client = getRedisClient();
        await client.del(key);
        logger.debug(`Deleted cache for key: ${key}`);
    } catch (error) {
        logger.error(`Failed to delete cache for key ${key}:`, error);
    }
};

export const clearCache = async (pattern = '*') => {
    try {
        const client = getRedisClient();
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
            await client.del(keys);
            logger.info(`Cleared ${keys.length} cache entries`);
        }
    } catch (error) {
        logger.error('Failed to clear cache:', error);
    }
}; 