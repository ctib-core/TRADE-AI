import axios from 'axios';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';
import { cacheData, getCachedData } from '../config/redis.js';

dotenv.config();

class MarketDataService {
    constructor() {
        this.apiKey = process.env.POLYGON_API_KEY;
        this.baseURL = 'https://api.polygon.io/v3';
        this.cacheTTL = 3600; // 1 hour cache for market data
        
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 60000, // 60 seconds for large data requests
            headers: {
                'Content-Type': 'application/json'
            }
        });

        this.setupErrorHandling();
    }

    setupErrorHandling() {
        this.client.interceptors.response.use(
            response => response,
            error => {
                if (error.response) {
                    const { status, data } = error.response;
                    
                    if (status === 429) {
                        logger.warn('Rate limit reached. Implementing backoff strategy.');
                        // Implement exponential backoff
                        return new Promise(resolve => {
                            setTimeout(() => {
                                resolve(this.client.request(error.config));
                            }, 5000);
                        });
                    }
                    
                    logger.error('Market Data API Error:', {
                        status,
                        message: data.error || data.message || 'Unknown error',
                        endpoint: error.config.url
                    });
                }
                throw error;
            }
        );
    }

    /**
     * Get all available crypto symbols
     */
    async getAllCryptoSymbols() {
        const cacheKey = 'market_data:crypto_symbols';
        
        return this.getCachedData(cacheKey, async () => {
            try {
                logger.info('Fetching all crypto symbols from Polygon.io');
                
                const allSymbols = [];
                let nextUrl = `/reference/tickers?market=crypto&active=true&apiKey=${this.apiKey}&limit=1000`;
                
                while (nextUrl) {
                    const response = await this.client.get(nextUrl);
                    const data = response.data;
                    
                    if (data.results) {
                        allSymbols.push(...data.results);
                    }
                    
                    nextUrl = data.next_url ? `${data.next_url}&apiKey=${this.apiKey}` : null;
                    
                    // Rate limiting - pause between requests
                    if (nextUrl) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }
                
                logger.info(`Fetched ${allSymbols.length} crypto symbols`);
                // Ensure plain JSON
                return JSON.parse(JSON.stringify(allSymbols));
            } catch (error) {
                logger.error('Error fetching crypto symbols:', error);
                throw error;
            }
        });
    }

    /**
     * Get all available stock symbols
     */
    async getAllStockSymbols() {
        const cacheKey = 'market_data:stock_symbols';
        
        return this.getCachedData(cacheKey, async () => {
            try {
                logger.info('Fetching all stock symbols from Polygon.io');
                
                const allSymbols = [];
                let nextUrl = `/reference/tickers?market=stocks&active=true&apiKey=${this.apiKey}&limit=1000`;
                
                while (nextUrl) {
                    const response = await this.client.get(nextUrl);
                    const data = response.data;
                    
                    if (data.results) {
                        allSymbols.push(...data.results);
                    }
                    
                    nextUrl = data.next_url ? `${data.next_url}&apiKey=${this.apiKey}` : null;
                    
                    if (nextUrl) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }
                
                logger.info(`Fetched ${allSymbols.length} stock symbols`);
                // Ensure plain JSON
                return JSON.parse(JSON.stringify(allSymbols));
            } catch (error) {
                logger.error('Error fetching stock symbols:', error);
                throw error;
            }
        });
    }

    /**
     * Get all available forex symbols
     */
    async getAllForexSymbols() {
        const cacheKey = 'market_data:forex_symbols';
        
        return this.getCachedData(cacheKey, async () => {
            try {
                logger.info('Fetching all forex symbols from Polygon.io');
                
                const allSymbols = [];
                let nextUrl = `/reference/tickers?market=fx&active=true&apiKey=${this.apiKey}&limit=1000`;
                
                while (nextUrl) {
                    const response = await this.client.get(nextUrl);
                    const data = response.data;
                    
                    if (data.results) {
                        allSymbols.push(...data.results);
                    }
                    
                    nextUrl = data.next_url ? `${data.next_url}&apiKey=${this.apiKey}` : null;
                    
                    if (nextUrl) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }
                
                logger.info(`Fetched ${allSymbols.length} forex symbols`);
                // Ensure plain JSON
                return JSON.parse(JSON.stringify(allSymbols));
            } catch (error) {
                logger.error('Error fetching forex symbols:', error);
                throw error;
            }
        });
    }

    /**
     * Get comprehensive market data for 15+ years
     */
    async getExtendedHistoricalData(symbol, timespan = 'day', years = 15) {
        const cacheKey = `market_data:extended:${symbol}:${timespan}:${years}`;
        
        return this.getCachedData(cacheKey, async () => {
            try {
                logger.info(`Fetching ${years} years of data for ${symbol}`);
                
                const endDate = new Date();
                const startDate = new Date();
                startDate.setFullYear(endDate.getFullYear() - years);
                
                const allData = [];
                let currentStart = new Date(startDate);
                
                // Fetch data in chunks to handle large datasets
                while (currentStart < endDate) {
                    const currentEnd = new Date(currentStart);
                    currentEnd.setFullYear(currentEnd.getFullYear() + 1);
                    
                    if (currentEnd > endDate) {
                        currentEnd.setTime(endDate.getTime());
                    }
                    
                    const startStr = currentStart.toISOString().split('T')[0];
                    const endStr = currentEnd.toISOString().split('T')[0];
                    
                    logger.info(`Fetching data from ${startStr} to ${endStr} for ${symbol}`);
                    
                    const response = await this.client.get(`/aggs/ticker/${symbol}/range/1/${timespan}/${startStr}/${endStr}`, {
                        params: {
                            adjusted: true,
                            sort: 'asc',
                            limit: 50000,
                            apiKey: this.apiKey
                        }
                    });
                    
                    if (response.data.results) {
                        allData.push(...response.data.results);
                    }
                    
                    currentStart = new Date(currentEnd);
                    currentStart.setDate(currentStart.getDate() + 1);
                    
                    // Rate limiting
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                
                // Remove duplicates and sort
                const uniqueData = this.removeDuplicates(allData);
                const sortedData = uniqueData.sort((a, b) => a.t - b.t);
                
                logger.info(`Fetched ${sortedData.length} data points for ${symbol} over ${years} years`);
                
                return {
                    symbol: symbol,
                    timespan: timespan,
                    dataPoints: sortedData.length,
                    startDate: sortedData[0]?.t,
                    endDate: sortedData[sortedData.length - 1]?.t,
                    results: sortedData
                };
            } catch (error) {
                logger.error(`Error fetching extended data for ${symbol}:`, error);
                throw error;
            }
        });
    }

    /**
     * Get real-time OHLCV data
     */
    async getRealTimeOHLCV(symbol) {
        const cacheKey = `market_data:realtime:${symbol}`;
        
        return this.getCachedData(cacheKey, async () => {
            try {
                const response = await this.client.get(`/aggs/ticker/${symbol}/prev`, {
                    params: {
                        adjusted: true,
                        apiKey: this.apiKey
                    }
                });
                
                if (!response.data.results) {
                    throw new Error('No real-time data available');
                }
                
                const data = response.data.results;
                return {
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
                    priceChangePercent: ((data.c - data.o) / data.o) * 100,
                    // Calculate additional metrics
                    bodySize: Math.abs(data.c - data.o),
                    upperShadow: data.h - Math.max(data.o, data.c),
                    lowerShadow: Math.min(data.o, data.c) - data.l,
                    bodyRatio: Math.abs(data.c - data.o) / (data.h - data.l)
                };
            } catch (error) {
                logger.error('Error fetching real-time data:', error);
                throw error;
            }
        }, 60); // 1 minute cache for real-time data
    }

    /**
     * Get intraday data for detailed analysis
     */
    async getIntradayData(symbol, date, multiplier = 1, timespan = 'minute') {
        const cacheKey = `market_data:intraday:${symbol}:${date}:${multiplier}:${timespan}`;
        
        return this.getCachedData(cacheKey, async () => {
            try {
                const response = await this.client.get(`/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${date}/${date}`, {
                    params: {
                        adjusted: true,
                        sort: 'asc',
                        limit: 50000,
                        apiKey: this.apiKey
                    }
                });
                
                if (!response.data.results) {
                    throw new Error('No intraday data available');
                }
                
                return {
                    symbol: response.data.ticker,
                    date: date,
                    timespan: timespan,
                    multiplier: multiplier,
                    dataPoints: response.data.results.length,
                    results: response.data.results
                };
            } catch (error) {
                logger.error('Error fetching intraday data:', error);
                throw error;
            }
        });
    }

    /**
     * Get market data with comprehensive technical indicators
     */
    async getMarketDataWithIndicators(symbol, timespan = 'day', years = 5) {
        try {
            const data = await this.getExtendedHistoricalData(symbol, timespan, years);
            
            if (!data.results || data.results.length === 0) {
                throw new Error('No data available for technical analysis');
            }
            
            // Add comprehensive technical indicators
            const enhancedData = this.addComprehensiveIndicators(data.results);
            
            return {
                ...data,
                results: enhancedData
            };
        } catch (error) {
            logger.error('Error getting market data with indicators:', error);
            throw error;
        }
    }

    /**
     * Add comprehensive technical indicators to price data
     */
    addComprehensiveIndicators(priceData) {
        if (priceData.length < 50) {
            return priceData;
        }

        return priceData.map((item, index) => {
            const indicators = {};
            
            // Moving Averages
            if (index >= 9) indicators.sma10 = this.calculateSMA(priceData, index, 10);
            if (index >= 19) indicators.sma20 = this.calculateSMA(priceData, index, 20);
            if (index >= 49) indicators.sma50 = this.calculateSMA(priceData, index, 50);
            if (index >= 199) indicators.sma200 = this.calculateSMA(priceData, index, 200);
            
            // Exponential Moving Averages
            if (index >= 9) indicators.ema10 = this.calculateEMA(priceData, index, 10);
            if (index >= 19) indicators.ema20 = this.calculateEMA(priceData, index, 20);
            if (index >= 49) indicators.ema50 = this.calculateEMA(priceData, index, 50);
            
            // RSI
            if (index >= 14) indicators.rsi = this.calculateRSI(priceData, index, 14);
            
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
                indicators.bbWidth = (bb.upper - bb.lower) / bb.middle;
                indicators.bbPosition = (item.c - bb.lower) / (bb.upper - bb.lower);
            }
            
            // Stochastic Oscillator
            if (index >= 14) {
                const stoch = this.calculateStochastic(priceData, index, 14);
                indicators.stochK = stoch.k;
                indicators.stochD = stoch.d;
            }
            
            // Williams %R
            if (index >= 14) indicators.williamsR = this.calculateWilliamsR(priceData, index, 14);
            
            // Average True Range (ATR)
            if (index >= 14) indicators.atr = this.calculateATR(priceData, index, 14);
            
            // Commodity Channel Index (CCI)
            if (index >= 20) indicators.cci = this.calculateCCI(priceData, index, 20);
            
            // Money Flow Index (MFI)
            if (index >= 14) indicators.mfi = this.calculateMFI(priceData, index, 14);
            
            // On Balance Volume (OBV)
            if (index >= 1) indicators.obv = this.calculateOBV(priceData, index);
            
            // Volume indicators
            if (index >= 20) {
                indicators.volumeSMA = this.calculateVolumeSMA(priceData, index, 20);
                indicators.volumeRatio = item.v / indicators.volumeSMA;
            }
            
            // Price action patterns
            indicators.candlePattern = this.identifyCandlePattern(priceData, index);
            indicators.supportResistance = this.calculateSupportResistance(priceData, index);
            
            return {
                ...item,
                indicators
            };
        });
    }

    // Technical indicator calculation methods
    calculateSMA(data, currentIndex, period) {
        const prices = data.slice(currentIndex - period + 1, currentIndex + 1).map(d => d.c);
        return prices.reduce((sum, price) => sum + price, 0) / period;
    }

    calculateEMA(data, currentIndex, period) {
        const multiplier = 2 / (period + 1);
        let ema = data[currentIndex - period + 1].c;
        
        for (let i = currentIndex - period + 2; i <= currentIndex; i++) {
            ema = (data[i].c * multiplier) + (ema * (1 - multiplier));
        }
        
        return ema;
    }

    calculateRSI(data, currentIndex, period) {
        let gains = 0;
        let losses = 0;
        
        for (let i = currentIndex - period + 1; i <= currentIndex; i++) {
            const change = data[i].c - data[i - 1].c;
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

    calculateMACD(data, currentIndex) {
        const ema12 = this.calculateEMA(data, currentIndex, 12);
        const ema26 = this.calculateEMA(data, currentIndex, 26);
        const macd = ema12 - ema26;
        const signal = this.calculateEMA(data, currentIndex, 9);
        const histogram = macd - signal;
        
        return { macd, signal, histogram };
    }

    calculateBollingerBands(data, currentIndex, period) {
        const sma = this.calculateSMA(data, currentIndex, period);
        const prices = data.slice(currentIndex - period + 1, currentIndex + 1).map(d => d.c);
        
        const variance = prices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
        const standardDeviation = Math.sqrt(variance);
        
        return {
            upper: sma + (standardDeviation * 2),
            middle: sma,
            lower: sma - (standardDeviation * 2)
        };
    }

    calculateStochastic(data, currentIndex, period) {
        const high = Math.max(...data.slice(currentIndex - period + 1, currentIndex + 1).map(d => d.h));
        const low = Math.min(...data.slice(currentIndex - period + 1, currentIndex + 1).map(d => d.l));
        const close = data[currentIndex].c;
        
        const k = ((close - low) / (high - low)) * 100;
        const d = this.calculateSMA(data.slice(currentIndex - 2, currentIndex + 1).map(d => ({ c: k })), 2, 3);
        
        return { k, d };
    }

    calculateWilliamsR(data, currentIndex, period) {
        const high = Math.max(...data.slice(currentIndex - period + 1, currentIndex + 1).map(d => d.h));
        const low = Math.min(...data.slice(currentIndex - period + 1, currentIndex + 1).map(d => d.l));
        const close = data[currentIndex].c;
        
        return ((high - close) / (high - low)) * -100;
    }

    calculateATR(data, currentIndex, period) {
        let trSum = 0;
        
        for (let i = currentIndex - period + 1; i <= currentIndex; i++) {
            const high = data[i].h;
            const low = data[i].l;
            const prevClose = data[i - 1].c;
            
            const tr = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            );
            
            trSum += tr;
        }
        
        return trSum / period;
    }

    calculateCCI(data, currentIndex, period) {
        const typicalPrices = data.slice(currentIndex - period + 1, currentIndex + 1).map(d => (d.h + d.l + d.c) / 3);
        const sma = typicalPrices.reduce((sum, price) => sum + price, 0) / period;
        const meanDeviation = typicalPrices.reduce((sum, price) => sum + Math.abs(price - sma), 0) / period;
        
        return (typicalPrices[typicalPrices.length - 1] - sma) / (0.015 * meanDeviation);
    }

    calculateMFI(data, currentIndex, period) {
        let positiveFlow = 0;
        let negativeFlow = 0;
        
        for (let i = currentIndex - period + 1; i <= currentIndex; i++) {
            const typicalPrice = (data[i].h + data[i].l + data[i].c) / 3;
            const prevTypicalPrice = (data[i - 1].h + data[i - 1].l + data[i - 1].c) / 3;
            const moneyFlow = typicalPrice * data[i].v;
            
            if (typicalPrice > prevTypicalPrice) {
                positiveFlow += moneyFlow;
            } else {
                negativeFlow += moneyFlow;
            }
        }
        
        return 100 - (100 / (1 + (positiveFlow / negativeFlow)));
    }

    calculateOBV(data, currentIndex) {
        let obv = 0;
        
        for (let i = 1; i <= currentIndex; i++) {
            if (data[i].c > data[i - 1].c) {
                obv += data[i].v;
            } else if (data[i].c < data[i - 1].c) {
                obv -= data[i].v;
            }
        }
        
        return obv;
    }

    calculateVolumeSMA(data, currentIndex, period) {
        const volumes = data.slice(currentIndex - period + 1, currentIndex + 1).map(d => d.v);
        return volumes.reduce((sum, volume) => sum + volume, 0) / period;
    }

    identifyCandlePattern(data, currentIndex) {
        if (currentIndex < 2) return 'UNKNOWN';
        
        const current = data[currentIndex];
        const prev = data[currentIndex - 1];
        
        const bodySize = Math.abs(current.c - current.o);
        const upperShadow = current.h - Math.max(current.o, current.c);
        const lowerShadow = Math.min(current.o, current.c) - current.l;
        const totalRange = current.h - current.l;
        
        // Doji
        if (bodySize / totalRange < 0.1) return 'DOJI';
        
        // Hammer
        if (lowerShadow > 2 * bodySize && upperShadow < bodySize) return 'HAMMER';
        
        // Shooting Star
        if (upperShadow > 2 * bodySize && lowerShadow < bodySize) return 'SHOOTING_STAR';
        
        // Engulfing
        if (current.c > prev.h && current.o < prev.l) return 'BULLISH_ENGULFING';
        if (current.c < prev.l && current.o > prev.h) return 'BEARISH_ENGULFING';
        
        return 'NORMAL';
    }

    calculateSupportResistance(data, currentIndex) {
        if (currentIndex < 20) return { support: null, resistance: null };
        
        const recentData = data.slice(currentIndex - 20, currentIndex + 1);
        const lows = recentData.map(d => d.l);
        const highs = recentData.map(d => d.h);
        
        const support = Math.min(...lows);
        const resistance = Math.max(...highs);
        
        return { support, resistance };
    }

    removeDuplicates(data) {
        const seen = new Set();
        return data.filter(item => {
            const key = `${item.t}_${item.c}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    async getCachedData(cacheKey, fetchFunction, ttl = 3600) {
        try {
            const cachedData = await getCachedData(cacheKey);
            if (cachedData) {
                logger.debug(`Cache hit for key: ${cacheKey}`);
                return cachedData;
            }

            const freshData = await fetchFunction();
            await cacheData(cacheKey, freshData, ttl);
            logger.debug(`Cached data for key: ${cacheKey}`);
            
            return freshData;
        } catch (error) {
            logger.error(`Cache operation failed for key ${cacheKey}:`, error);
            return await fetchFunction();
        }
    }
}

const marketDataService = new MarketDataService();
export default marketDataService; 