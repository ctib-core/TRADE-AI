import express from 'express';
import Joi from 'joi';
import { validateRequest } from '../middleware/index.js';
import { logger } from '../utils/logger.js';
import marketDataService from '../services/marketDataService.js';
import { cacheData, getCachedData } from '../config/redis.js';

const router = express.Router();

// Validation schemas
const symbolFilterSchema = Joi.object({
    market: Joi.string().valid('crypto', 'stocks', 'forex', 'all').default('all'),
    active: Joi.boolean().default(true),
    search: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(1000).default(100),
    offset: Joi.number().integer().min(0).default(0)
});

const symbolDetailsSchema = Joi.object({
    symbol: Joi.string().required(),
    market: Joi.string().valid('crypto', 'stocks', 'forex').required()
});

/**
 * GET /api/v1/symbols
 * Get all available symbols with filtering and pagination
 */
router.get('/', validateRequest(symbolFilterSchema), async (req, res) => {
    try {
        const { market, active, search, limit, offset } = req.query;
        
        logger.api(`Fetching symbols for market: ${market}`, { limit, offset });
        
        let symbols = [];
        
        if (market === 'all' || market === 'crypto') {
            const cryptoSymbols = await marketDataService.getAllCryptoSymbols();
            symbols.push(...cryptoSymbols.map(s => ({ ...s, market: 'crypto' })));
        }
        
        if (market === 'all' || market === 'stocks') {
            const stockSymbols = await marketDataService.getAllStockSymbols();
            symbols.push(...stockSymbols.map(s => ({ ...s, market: 'stocks' })));
        }
        
        if (market === 'all' || market === 'forex') {
            const forexSymbols = await marketDataService.getAllForexSymbols();
            symbols.push(...forexSymbols.map(s => ({ ...s, market: 'forex' })));
        }
        
        // Filter by active status
        if (active !== undefined) {
            symbols = symbols.filter(s => s.active === active);
        }
        
        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            symbols = symbols.filter(s => 
                s.ticker?.toLowerCase().includes(searchLower) ||
                s.name?.toLowerCase().includes(searchLower) ||
                s.market?.toLowerCase().includes(searchLower)
            );
        }
        
        // Pagination
        const totalCount = symbols.length;
        const paginatedSymbols = symbols.slice(offset, offset + limit);
        
        // Cache the results
        const cacheKey = `symbols:${market}:${active}:${search}:${limit}:${offset}`;
        await cacheData(cacheKey, {
            symbols: paginatedSymbols,
            totalCount,
            pagination: { limit, offset, totalCount }
        }, 3600); // Cache for 1 hour
        
        res.json({
            status: 'success',
            symbols: paginatedSymbols,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            },
            filters: {
                market,
                active,
                search
            }
        });
        
    } catch (error) {
        logger.error('Error fetching symbols:', error);
        res.status(500).json({
            error: 'Failed to fetch symbols',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/symbols/crypto
 * Get all crypto symbols
 */
router.get('/crypto', async (req, res) => {
    try {
        const { search, limit = 100, offset = 0 } = req.query;
        
        logger.api('Fetching crypto symbols');
        
        let symbols = await marketDataService.getAllCryptoSymbols();
        
        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            symbols = symbols.filter(s => 
                s.ticker?.toLowerCase().includes(searchLower) ||
                s.name?.toLowerCase().includes(searchLower)
            );
        }
        
        // Pagination
        const totalCount = symbols.length;
        const paginatedSymbols = symbols.slice(offset, offset + parseInt(limit));
        
        res.json({
            status: 'success',
            market: 'crypto',
            symbols: paginatedSymbols,
            totalCount,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
        
    } catch (error) {
        logger.error('Error fetching crypto symbols:', error);
        res.status(500).json({
            error: 'Failed to fetch crypto symbols',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/symbols/stocks
 * Get all stock symbols
 */
router.get('/stocks', async (req, res) => {
    try {
        const { search, limit = 100, offset = 0 } = req.query;
        
        logger.api('Fetching stock symbols');
        
        let symbols = await marketDataService.getAllStockSymbols();
        
        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            symbols = symbols.filter(s => 
                s.ticker?.toLowerCase().includes(searchLower) ||
                s.name?.toLowerCase().includes(searchLower)
            );
        }
        
        // Pagination
        const totalCount = symbols.length;
        const paginatedSymbols = symbols.slice(offset, offset + parseInt(limit));
        
        res.json({
            status: 'success',
            market: 'stocks',
            symbols: paginatedSymbols,
            totalCount,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
        
    } catch (error) {
        logger.error('Error fetching stock symbols:', error);
        res.status(500).json({
            error: 'Failed to fetch stock symbols',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/symbols/forex
 * Get all forex symbols
 */
router.get('/forex', async (req, res) => {
    try {
        const { search, limit = 100, offset = 0 } = req.query;
        
        logger.api('Fetching forex symbols');
        
        let symbols = await marketDataService.getAllForexSymbols();
        
        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            symbols = symbols.filter(s => 
                s.ticker?.toLowerCase().includes(searchLower) ||
                s.name?.toLowerCase().includes(searchLower)
            );
        }
        
        // Pagination
        const totalCount = symbols.length;
        const paginatedSymbols = symbols.slice(offset, offset + parseInt(limit));
        
        res.json({
            status: 'success',
            market: 'forex',
            symbols: paginatedSymbols,
            totalCount,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
        
    } catch (error) {
        logger.error('Error fetching forex symbols:', error);
        res.status(500).json({
            error: 'Failed to fetch forex symbols',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/symbols/popular
 * Get popular/major symbols for each market
 */
router.get('/popular', async (req, res) => {
    try {
        logger.api('Fetching popular symbols');
        
        const popularSymbols = {
            crypto: [
                { ticker: 'X:BTCUSD', name: 'Bitcoin', market: 'crypto' },
                { ticker: 'X:ETHUSD', name: 'Ethereum', market: 'crypto' },
                { ticker: 'X:ADAUSD', name: 'Cardano', market: 'crypto' },
                { ticker: 'X:DOTUSD', name: 'Polkadot', market: 'crypto' },
                { ticker: 'X:LINKUSD', name: 'Chainlink', market: 'crypto' },
                { ticker: 'X:LTCUSD', name: 'Litecoin', market: 'crypto' },
                { ticker: 'X:BCHUSD', name: 'Bitcoin Cash', market: 'crypto' },
                { ticker: 'X:XRPUSD', name: 'Ripple', market: 'crypto' }
            ],
            stocks: [
                { ticker: 'AAPL', name: 'Apple Inc.', market: 'stocks' },
                { ticker: 'MSFT', name: 'Microsoft Corporation', market: 'stocks' },
                { ticker: 'GOOGL', name: 'Alphabet Inc.', market: 'stocks' },
                { ticker: 'AMZN', name: 'Amazon.com Inc.', market: 'stocks' },
                { ticker: 'TSLA', name: 'Tesla Inc.', market: 'stocks' },
                { ticker: 'META', name: 'Meta Platforms Inc.', market: 'stocks' },
                { ticker: 'NVDA', name: 'NVIDIA Corporation', market: 'stocks' },
                { ticker: 'JPM', name: 'JPMorgan Chase & Co.', market: 'stocks' }
            ],
            forex: [
                { ticker: 'C:EURUSD', name: 'EUR/USD', market: 'forex' },
                { ticker: 'C:GBPUSD', name: 'GBP/USD', market: 'forex' },
                { ticker: 'C:USDJPY', name: 'USD/JPY', market: 'forex' },
                { ticker: 'C:USDCHF', name: 'USD/CHF', market: 'forex' },
                { ticker: 'C:AUDUSD', name: 'AUD/USD', market: 'forex' },
                { ticker: 'C:USDCAD', name: 'USD/CAD', market: 'forex' },
                { ticker: 'C:NZDUSD', name: 'NZD/USD', market: 'forex' },
                { ticker: 'C:EURGBP', name: 'EUR/GBP', market: 'forex' }
            ]
        };
        
        res.json({
            status: 'success',
            popularSymbols,
            totalCount: {
                crypto: popularSymbols.crypto.length,
                stocks: popularSymbols.stocks.length,
                forex: popularSymbols.forex.length
            }
        });
        
    } catch (error) {
        logger.error('Error fetching popular symbols:', error);
        res.status(500).json({
            error: 'Failed to fetch popular symbols',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/symbols/:symbol
 * Get detailed information about a specific symbol
 */
router.get('/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        
        logger.api(`Fetching details for symbol: ${symbol}`);
        
        // Determine market from symbol
        let market = 'unknown';
        if (symbol.startsWith('X:')) {
            market = 'crypto';
        } else if (symbol.startsWith('C:')) {
            market = 'forex';
        } else {
            market = 'stocks';
        }
        
        // Get symbol details from appropriate market
        let symbolDetails = null;
        
        try {
            if (market === 'crypto') {
                const cryptoSymbols = await marketDataService.getAllCryptoSymbols();
                symbolDetails = cryptoSymbols.find(s => s.ticker === symbol);
            } else if (market === 'stocks') {
                const stockSymbols = await marketDataService.getAllStockSymbols();
                symbolDetails = stockSymbols.find(s => s.ticker === symbol);
            } else if (market === 'forex') {
                const forexSymbols = await marketDataService.getAllForexSymbols();
                symbolDetails = forexSymbols.find(s => s.ticker === symbol);
            }
        } catch (error) {
            logger.warn(`Symbol not found in ${market} market: ${symbol}`);
        }
        
        if (!symbolDetails) {
            return res.status(404).json({
                error: 'Symbol not found',
                message: `Symbol ${symbol} not found in any market`
            });
        }
        
        // Get real-time data for the symbol
        let realTimeData = null;
        try {
            realTimeData = await marketDataService.getRealTimeOHLCV(symbol);
        } catch (error) {
            logger.warn(`Real-time data not available for ${symbol}:`, error.message);
        }
        
        res.json({
            status: 'success',
            symbol: symbolDetails,
            market: market,
            realTimeData: realTimeData,
            lastUpdated: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Error fetching symbol details:', error);
        res.status(500).json({
            error: 'Failed to fetch symbol details',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/symbols/search/:query
 * Search symbols by name or ticker
 */
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const { market = 'all', limit = 50 } = req.query;
        
        logger.api(`Searching symbols with query: ${query}`, { market, limit });
        
        const searchResults = {
            crypto: [],
            stocks: [],
            forex: []
        };
        
        const searchLower = query.toLowerCase();
        
        // Search in crypto
        if (market === 'all' || market === 'crypto') {
            const cryptoSymbols = await marketDataService.getAllCryptoSymbols();
            searchResults.crypto = cryptoSymbols.filter(s => 
                s.ticker?.toLowerCase().includes(searchLower) ||
                s.name?.toLowerCase().includes(searchLower)
            ).slice(0, limit);
        }
        
        // Search in stocks
        if (market === 'all' || market === 'stocks') {
            const stockSymbols = await marketDataService.getAllStockSymbols();
            searchResults.stocks = stockSymbols.filter(s => 
                s.ticker?.toLowerCase().includes(searchLower) ||
                s.name?.toLowerCase().includes(searchLower)
            ).slice(0, limit);
        }
        
        // Search in forex
        if (market === 'all' || market === 'forex') {
            const forexSymbols = await marketDataService.getAllForexSymbols();
            searchResults.forex = forexSymbols.filter(s => 
                s.ticker?.toLowerCase().includes(searchLower) ||
                s.name?.toLowerCase().includes(searchLower)
            ).slice(0, limit);
        }
        
        const totalResults = searchResults.crypto.length + searchResults.stocks.length + searchResults.forex.length;
        
        res.json({
            status: 'success',
            query: query,
            results: searchResults,
            totalResults,
            pagination: {
                limit: parseInt(limit),
                totalResults
            }
        });
        
    } catch (error) {
        logger.error('Error searching symbols:', error);
        res.status(500).json({
            error: 'Failed to search symbols',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/symbols/stats
 * Get statistics about available symbols
 */
router.get('/stats', async (req, res) => {
    try {
        logger.api('Fetching symbol statistics');
        
        const stats = {
            crypto: { count: 0, active: 0, inactive: 0 },
            stocks: { count: 0, active: 0, inactive: 0 },
            forex: { count: 0, active: 0, inactive: 0 },
            total: { count: 0, active: 0, inactive: 0 }
        };
        
        try {
            const cryptoSymbols = await marketDataService.getAllCryptoSymbols();
            stats.crypto.count = cryptoSymbols.length;
            stats.crypto.active = cryptoSymbols.filter(s => s.active).length;
            stats.crypto.inactive = cryptoSymbols.filter(s => !s.active).length;
        } catch (error) {
            logger.warn('Failed to get crypto stats:', error.message);
        }
        
        try {
            const stockSymbols = await marketDataService.getAllStockSymbols();
            stats.stocks.count = stockSymbols.length;
            stats.stocks.active = stockSymbols.filter(s => s.active).length;
            stats.stocks.inactive = stockSymbols.filter(s => !s.active).length;
        } catch (error) {
            logger.warn('Failed to get stock stats:', error.message);
        }
        
        try {
            const forexSymbols = await marketDataService.getAllForexSymbols();
            stats.forex.count = forexSymbols.length;
            stats.forex.active = forexSymbols.filter(s => s.active).length;
            stats.forex.inactive = forexSymbols.filter(s => !s.active).length;
        } catch (error) {
            logger.warn('Failed to get forex stats:', error.message);
        }
        
        // Calculate totals
        stats.total.count = stats.crypto.count + stats.stocks.count + stats.forex.count;
        stats.total.active = stats.crypto.active + stats.stocks.active + stats.forex.active;
        stats.total.inactive = stats.crypto.inactive + stats.stocks.inactive + stats.forex.inactive;
        
        res.json({
            status: 'success',
            stats: stats,
            lastUpdated: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Error fetching symbol statistics:', error);
        res.status(500).json({
            error: 'Failed to fetch symbol statistics',
            message: error.message
        });
    }
});

export default router; 