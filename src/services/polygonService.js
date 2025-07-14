import axios from 'axios';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';
import { getRedisClient } from '../config/redis.js';

dotenv.config();

class PolygonService {
    constructor() {
        this.apiKey = process.env.POLYGON_API_KEY;
        this.baseURL = 'https://api.polygon.io';
        this.cacheTTL = 300; // 5 minutes cache
        
        if (!this.apiKey) {
            logger.warn('POLYGON_API_KEY not set. Some features may not work.');
        }
        
        // Initialize axios instance
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 30000, // 30 seconds
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Setup error handling
        this.setupErrorHandling();
    }

    setupErrorHandling() {
        this.client.interceptors.response.use(
            response => response,
            error => {
                if (error.response) {
                    const { status, data } = error.response;
                    
                    // Handle rate limiting
                    if (status === 429) {
                        logger.warn('Rate limit reached. Please wait before making more requests.');
                    }
                    
                    // Log API-specific errors without circular references
                    logger.error('Polygon API Error:', {
                        status,
                        message: data?.error || data?.message || 'Unknown error',
                        endpoint: error.config?.url || 'unknown'
                    });
                } else {
                    // Handle network errors
                    logger.error('Polygon API Network Error:', {
                        message: error.message || 'Network error',
                        code: error.code
                    });
                }
                throw error;
            }
        );
    }

    /**
     * Get cached data or fetch from API
     * @param {string} cacheKey - Redis cache key
     * @param {Function} fetchFunction - Function to fetch data if not cached
     * @returns {Promise} Cached or fresh data
     */
    async getCachedData(cacheKey, fetchFunction) {
        try {
            // Try to get from cache first
            const redisClient = getRedisClient();
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                logger.debug(`Cache hit for key: ${cacheKey}`);
                return JSON.parse(cachedData);
            }

            // Fetch fresh data
            const freshData = await fetchFunction();
            
            // Cache the data
            await redisClient.setex(cacheKey, this.cacheTTL, JSON.stringify(freshData));
            logger.debug(`Cached data for key: ${cacheKey}`);
            
            return freshData;
        } catch (error) {
            logger.error(`Cache operation failed for key ${cacheKey}:`, error);
            // Fallback to direct fetch
            return await fetchFunction();
        }
    }

    /**
     * Get historical data for a symbol with enhanced crypto support
     * @param {string} symbol - Trading symbol (e.g., 'X:BTCUSD', 'X:ETHUSD')
     * @param {string} timespan - Time interval (day, minute, hour)
     * @param {string} fromDate - Start date (YYYY-MM-DD)
     * @param {string} toDate - End date (YYYY-MM-DD)
     * @param {number} multiplier - Time multiplier (default: 1)
     * @returns {Promise} Historical data
     */
    async getHistoricalData(symbol, timespan = 'day', fromDate, toDate, multiplier = 1) {
        const cacheKey = `polygon:historical:${symbol}:${timespan}:${fromDate}:${toDate}`;
        
        return this.getCachedData(cacheKey, async () => {
            try {
                if (!this.apiKey) {
                    throw new Error('POLYGON_API_KEY is required to fetch live historical data');
                }

                const endpoint = `/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${fromDate}/${toDate}`;
                
                const response = await this.client.get(endpoint, {
                    params: {
                        adjusted: true,
                        sort: 'asc',
                        limit: 50000,
                        apiKey: this.apiKey
                    }
                });

                if (!response.data.results || response.data.results.length === 0) {
                    throw new Error('No data available for the specified period');
                }

                // Enhanced data transformation for crypto
                const transformedData = response.data.results.map(item => ({
                    timestamp: item.t,
                    date: new Date(item.t).toISOString().split('T')[0],
                    open: item.o,
                    high: item.h,
                    low: item.l,
                    close: item.c,
                    volume: item.v,
                    vwap: item.vw,
                    transactions: item.n,
                    // Calculate additional metrics
                    priceChange: item.c - item.o,
                    priceChangePercent: ((item.c - item.o) / item.o) * 100,
                    volatility: (item.h - item.l) / item.o * 100,
                    volumeWeightedPrice: item.vw
                }));

                logger.info(`Successfully fetched ${transformedData.length} historical data points for ${symbol}`);
                return {
                    symbol: response.data.ticker,
                    results: transformedData,
                    queryCount: response.data.queryCount,
                    resultsCount: response.data.resultsCount
                };
            } catch (error) {
                if (error.response?.status === 404) {
                    throw new Error(`No data found for symbol ${symbol}`);
                }
                
                const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
                logger.error('Error fetching historical data:', {
                    symbol,
                    message: errorMessage,
                    status: error.response?.status
                });
                throw new Error(`Failed to fetch historical data for ${symbol}: ${errorMessage}`);
            }
        });
    }

    /**
     * Get real-time crypto data
     * @param {string} symbol - Crypto symbol (e.g., 'X:BTCUSD')
     * @returns {Promise} Real-time data
     */
    async getRealTimeData(symbol) {
        const cacheKey = `polygon:realtime:${symbol}`;
        
        return this.getCachedData(cacheKey, async () => {
            try {
                if (!this.apiKey) {
                    throw new Error('POLYGON_API_KEY is required to fetch live real-time data');
                }

                const endpoint = `/v2/aggs/ticker/${symbol}/prev`;
                
                const response = await this.client.get(endpoint, {
                    params: {
                        adjusted: true,
                        apiKey: this.apiKey
                    }
                });

                if (!response.data.results) {
                    throw new Error('No real-time data available');
                }

                const data = response.data.results;
                const result = {
                    symbol: response.data.ticker,
                    timestamp: data.t,
                    date: new Date(data.t).toISOString().split('T')[0],
                    open: data.o,
                    high: data.h,
                    low: data.l,
                    close: data.c,
                    volume: data.v,
                    vwap: data.vw,
                    transactions: data.n,
                    priceChange: data.c - data.o,
                    priceChangePercent: ((data.c - data.o) / data.o) * 100
                };

                logger.info(`Successfully fetched real-time data for ${symbol}: $${result.close}`);
                return result;
            } catch (error) {
                const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
                logger.error('Error fetching real-time data:', {
                    symbol,
                    message: errorMessage,
                    status: error.response?.status
                });
                throw new Error(`Failed to fetch real-time data for ${symbol}: ${errorMessage}`);
            }
        });
    }

    /**
     * Get crypto market data with technical indicators
     * @param {string} symbol - Crypto symbol
     * @param {string} timespan - Time interval
     * @param {number} days - Number of days to fetch
     * @returns {Promise} Market data with indicators
     */
    async getMarketDataWithIndicators(symbol, timespan = 'day', days = 100) {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
        
        const data = await this.getHistoricalData(symbol, timespan, startDate, endDate);
        
        // Add technical indicators
        const enhancedData = this.addTechnicalIndicators(data.results);
        
        return {
            ...data,
            results: enhancedData
        };
    }

    /**
     * Add technical indicators to price data
     * @param {Array} priceData - Array of price objects
     * @returns {Array} Price data with technical indicators
     */
    addTechnicalIndicators(priceData) {
        if (priceData.length < 20) {
            return priceData;
        }

        return priceData.map((item, index) => {
            const indicators = {};
            
            // Simple Moving Averages
            if (index >= 9) {
                indicators.sma10 = this.calculateSMA(priceData, index, 10);
            }
            if (index >= 19) {
                indicators.sma20 = this.calculateSMA(priceData, index, 20);
            }
            
            // Exponential Moving Averages
            if (index >= 9) {
                indicators.ema10 = this.calculateEMA(priceData, index, 10);
            }
            if (index >= 19) {
                indicators.ema20 = this.calculateEMA(priceData, index, 20);
            }
            
            // RSI
            if (index >= 14) {
                indicators.rsi = this.calculateRSI(priceData, index, 14);
            }
            
            // MACD
            if (index >= 26) {
                const macd = this.calculateMACD(priceData, index);
                indicators.macd = macd.macd;
                indicators.macdSignal = macd.signal;
                indicators.macdHistogram = macd.histogram;
            }
            
            // Bollinger Bands
            if (index >= 19) {
                const bb = this.calculateBollingerBands(priceData, index, 20);
                indicators.bbUpper = bb.upper;
                indicators.bbMiddle = bb.middle;
                indicators.bbLower = bb.lower;
            }

            return {
                ...item,
                indicators
            };
        });
    }

    /**
     * Calculate Simple Moving Average
     */
    calculateSMA(data, currentIndex, period) {
        const prices = data.slice(currentIndex - period + 1, currentIndex + 1).map(d => d.close);
        return prices.reduce((sum, price) => sum + price, 0) / period;
    }

    /**
     * Calculate Exponential Moving Average
     */
    calculateEMA(data, currentIndex, period) {
        const multiplier = 2 / (period + 1);
        let ema = data[currentIndex - period + 1].close;
        
        for (let i = currentIndex - period + 2; i <= currentIndex; i++) {
            ema = (data[i].close * multiplier) + (ema * (1 - multiplier));
        }
        
        return ema;
    }

    /**
     * Calculate RSI
     */
    calculateRSI(data, currentIndex, period) {
        let gains = 0;
        let losses = 0;
        
        for (let i = currentIndex - period + 1; i <= currentIndex; i++) {
            const change = data[i].close - data[i - 1].close;
            if (change > 0) {
                gains += change;
            } else {
                losses += Math.abs(change);
            }
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgGain / avgLoss;
        
        return 100 - (100 / (1 + rs));
    }

    /**
     * Calculate MACD
     */
    calculateMACD(data, currentIndex) {
        const ema12 = this.calculateEMA(data, currentIndex, 12);
        const ema26 = this.calculateEMA(data, currentIndex, 26);
        const macd = ema12 - ema26;
        const signal = this.calculateEMA(data, currentIndex, 9); // Signal line
        const histogram = macd - signal;
        
        return { macd, signal, histogram };
    }

    /**
     * Calculate Bollinger Bands
     */
    calculateBollingerBands(data, currentIndex, period) {
        const sma = this.calculateSMA(data, currentIndex, period);
        const prices = data.slice(currentIndex - period + 1, currentIndex + 1).map(d => d.close);
        
        const variance = prices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
        const standardDeviation = Math.sqrt(variance);
        
        return {
            upper: sma + (standardDeviation * 2),
            middle: sma,
            lower: sma - (standardDeviation * 2)
        };
    }



    /**
     * Validate if a symbol exists and is tradeable
     * @param {string} symbol - Trading symbol
     * @returns {Promise<boolean>} Whether the symbol is valid
     */
    async validateSymbol(symbol) {
        try {
            if (!this.apiKey) {
                throw new Error('POLYGON_API_KEY is required to validate symbols');
            }

            const endpoint = `/v3/reference/tickers/${symbol}`;
            
            const response = await this.client.get(endpoint, {
                params: {
                    apiKey: this.apiKey
                }
            });

            const isValid = response.data.status === 'OK';
            logger.info(`Symbol validation for ${symbol}: ${isValid ? 'VALID' : 'INVALID'}`);
            return isValid;
        } catch (error) {
            if (error.response?.status === 404) {
                logger.info(`Symbol ${symbol} not found`);
                return false;
            }
            // Handle error without circular reference
            const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
            logger.error('Error validating symbol:', {
                symbol,
                message: errorMessage,
                status: error.response?.status
            });
            throw new Error(`Failed to validate symbol: ${errorMessage}`);
        }
    }

    /**
     * Get available crypto symbols
     * @returns {Promise<Array>} List of available crypto symbols
     */
    async getCryptoSymbols() {
        const cacheKey = 'polygon:crypto_symbols';
        
        return this.getCachedData(cacheKey, async () => {
            try {
                if (!this.apiKey) {
                    throw new Error('POLYGON_API_KEY is required to fetch live crypto data');
                }

                logger.info('Making request to Polygon API for crypto symbols...');
                logger.debug('API Key present:', !!this.apiKey);
                
                const response = await this.client.get('/v3/reference/tickers', {
                    params: {
                        market: 'crypto',
                        active: 'true',
                        order: 'asc',
                        limit: 100,
                        sort: 'ticker',
                        apiKey: this.apiKey
                    }
                });

                logger.info(`Successfully fetched ${response.data.results?.length || 0} crypto symbols from Polygon API`);
                return response.data.results || [];
            } catch (error) {
                // Handle error without circular reference
                const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
                const status = error.response?.status;
                logger.error('Error fetching crypto symbols:', {
                    message: errorMessage,
                    status: status,
                    endpoint: '/v3/reference/tickers'
                });
                throw new Error(`Failed to fetch crypto symbols: ${errorMessage}`);
            }
        });
    }
}

// Create and export a singleton instance
const polygonService = new PolygonService();
export default polygonService; 