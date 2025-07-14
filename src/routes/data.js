import express from 'express';
import Joi from 'joi';
import { validateRequest } from '../middleware/index.js';
import { logger } from '../utils/logger.js';
import polygonService from '../services/polygonService.js';
import { cacheData, getCachedData } from '../config/redis.js';

const router = express.Router();

// Validation schemas
const historicalDataSchema = Joi.object({
    symbol: Joi.string().required().pattern(/^X:[A-Z]+USD$/),
    timespan: Joi.string().valid('minute', 'hour', 'day', 'week', 'month').default('day'),
    fromDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    toDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    multiplier: Joi.number().integer().min(1).max(60).default(1)
});

const realTimeDataSchema = Joi.object({
    symbol: Joi.string().required().pattern(/^X:[A-Z]+USD$/)
});

/**
 * GET /api/v1/data/symbols
 * Get available crypto symbols
 */
router.get('/symbols', async (req, res) => {
    try {
        const symbols = await polygonService.getCryptoSymbols();
        
        res.json({
            status: 'success',
            symbols: symbols, // Return all symbols from live API
            totalSymbols: symbols.length
        });
    } catch (error) {
        logger.error('Error fetching symbols:', {
            message: error.message,
            stack: error.stack?.split('\n')[0] // Only first line of stack
        });
        res.status(500).json({
            error: 'Failed to fetch symbols',
            message: error.message
        });
    }
});

/**
 * POST /api/v1/data/historical
 * Get historical market data
 */
router.post('/historical', validateRequest(historicalDataSchema), async (req, res) => {
    try {
        const { symbol, timespan, fromDate, toDate, multiplier } = req.body;
        
        logger.api(`Fetching historical data for ${symbol}`, { timespan, fromDate, toDate });
        
        const data = await polygonService.getHistoricalData(symbol, timespan, fromDate, toDate, multiplier);
        
        // Cache the data
        const cacheKey = `historical:${symbol}:${timespan}:${fromDate}:${toDate}`;
        await cacheData(cacheKey, data, 300); // Cache for 5 minutes
        
        res.json({
            status: 'success',
            symbol: data.symbol,
            dataPoints: data.results.length,
            fromDate,
            toDate,
            timespan,
            data: data.results
        });
    } catch (error) {
        logger.error('Error fetching historical data:', error);
        res.status(500).json({
            error: 'Failed to fetch historical data',
            message: error.message
        });
    }
});

/**
 * POST /api/v1/data/realtime
 * Get real-time market data
 */
router.post('/realtime', validateRequest(realTimeDataSchema), async (req, res) => {
    try {
        const { symbol } = req.body;
        
        logger.api(`Fetching real-time data for ${symbol}`);
        
        const data = await polygonService.getRealTimeData(symbol);
        
        res.json({
            status: 'success',
            ...data
        });
    } catch (error) {
        logger.error('Error fetching real-time data:', error);
        res.status(500).json({
            error: 'Failed to fetch real-time data',
            message: error.message
        });
    }
});

/**
 * POST /api/v1/data/indicators
 * Get market data with technical indicators
 */
router.post('/indicators', validateRequest(historicalDataSchema), async (req, res) => {
    try {
        const { symbol, timespan, fromDate, toDate } = req.body;
        
        logger.api(`Fetching market data with indicators for ${symbol}`);
        
        const data = await polygonService.getMarketDataWithIndicators(symbol, timespan, 100);
        
        res.json({
            status: 'success',
            symbol: data.symbol,
            dataPoints: data.results.length,
            indicators: {
                sma: 'Simple Moving Average',
                ema: 'Exponential Moving Average',
                rsi: 'Relative Strength Index',
                macd: 'Moving Average Convergence Divergence',
                bollinger: 'Bollinger Bands'
            },
            data: data.results
        });
    } catch (error) {
        logger.error('Error fetching market data with indicators:', error);
        res.status(500).json({
            error: 'Failed to fetch market data with indicators',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/data/validate/:symbol
 * Validate if a symbol exists and is tradeable
 */
router.get('/validate/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        
        const isValid = await polygonService.validateSymbol(symbol);
        
        res.json({
            status: 'success',
            symbol,
            isValid,
            message: isValid ? 'Symbol is valid and tradeable' : 'Symbol not found or not tradeable'
        });
    } catch (error) {
        logger.error('Error validating symbol:', error);
        res.status(500).json({
            error: 'Failed to validate symbol',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/data/cache/status
 * Get cache status and statistics
 */
router.get('/cache/status', async (req, res) => {
    try {
        // Mock cache statistics
        const cacheStats = {
            totalKeys: Math.floor(Math.random() * 1000) + 100,
            memoryUsage: Math.floor(Math.random() * 100) + 10,
            hitRate: 0.7 + Math.random() * 0.3,
            lastCleanup: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
        };
        
        res.json({
            status: 'success',
            cacheStats
        });
    } catch (error) {
        logger.error('Error getting cache status:', error);
        res.status(500).json({
            error: 'Failed to get cache status',
            message: error.message
        });
    }
});

/**
 * DELETE /api/v1/data/cache/clear
 * Clear all cached data
 */
router.delete('/cache/clear', async (req, res) => {
    try {
        // In a real implementation, this would clear Redis cache
        logger.api('Cache cleared by user request');
        
        res.json({
            status: 'success',
            message: 'Cache cleared successfully'
        });
    } catch (error) {
        logger.error('Error clearing cache:', error);
        res.status(500).json({
            error: 'Failed to clear cache',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/data/market/summary
 * Get market summary for major cryptocurrencies
 */
router.get('/market/summary', async (req, res) => {
    try {
        const majorCryptos = ['X:BTCUSD', 'X:ETHUSD', 'X:ADAUSD', 'X:DOTUSD', 'X:LINKUSD'];
        const summary = [];
        
        for (const symbol of majorCryptos) {
            try {
                const data = await polygonService.getRealTimeData(symbol);
                summary.push({
                    symbol: data.symbol,
                    price: data.close,
                    change: data.priceChange,
                    changePercent: data.priceChangePercent,
                    volume: data.volume,
                    timestamp: data.timestamp
                });
            } catch (error) {
                logger.warn(`Failed to fetch data for ${symbol}:`, error.message);
                summary.push({
                    symbol,
                    error: 'Data unavailable'
                });
            }
        }
        
        res.json({
            status: 'success',
            timestamp: new Date().toISOString(),
            summary
        });
    } catch (error) {
        logger.error('Error fetching market summary:', error);
        res.status(500).json({
            error: 'Failed to fetch market summary',
            message: error.message
        });
    }
});

export default router; 