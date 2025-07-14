import express from 'express';
import Joi from 'joi';
import { validateRequest } from '../middleware/index.js';
import { logger } from '../utils/logger.js';
import newsDataService from '../services/newsDataService.js';

const router = express.Router();

// Validation schemas
const newsRequestSchema = Joi.object({
    symbol: Joi.string().required().pattern(/^[A-Z]+$/),
    days: Joi.number().integer().min(1).max(30).default(7)
});

const fundamentalAnalysisSchema = Joi.object({
    symbol: Joi.string().required().pattern(/^[A-Z]+$/),
    technicalData: Joi.object().optional()
});

/**
 * GET /api/v1/news/:symbol
 * Get news articles for a specific cryptocurrency
 */
router.get('/:symbol', validateRequest(newsRequestSchema, 'params'), async (req, res) => {
    try {
        const { symbol } = req.params;
        const { days = 7 } = req.query;
        
        logger.api(`Fetching news for ${symbol}`, { days });
        
        const articles = await newsDataService.getNewsForSymbol(symbol, parseInt(days));
        
        res.json({
            status: 'success',
            symbol,
            days: parseInt(days),
            totalArticles: articles.length,
            articles: articles.slice(0, 20), // Limit to first 20 articles
            sources: articles.map(a => a.source).filter((v, i, a) => a.indexOf(v) === i)
        });
    } catch (error) {
        logger.error('Error fetching news:', error);
        res.status(500).json({
            error: 'Failed to fetch news',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/news/:symbol/sentiment
 * Get sentiment summary for a cryptocurrency
 */
router.get('/:symbol/sentiment', validateRequest(newsRequestSchema, 'params'), async (req, res) => {
    try {
        const { symbol } = req.params;
        const { days = 7 } = req.query;
        
        logger.api(`Fetching sentiment for ${symbol}`, { days });
        
        const sentimentSummary = await newsDataService.getSentimentSummary(symbol, parseInt(days));
        
        res.json({
            status: 'success',
            ...sentimentSummary
        });
    } catch (error) {
        logger.error('Error fetching sentiment:', error);
        res.status(500).json({
            error: 'Failed to fetch sentiment',
            message: error.message
        });
    }
});

/**
 * POST /api/v1/news/fundamental-analysis
 * Get comprehensive fundamental analysis
 */
router.post('/fundamental-analysis', validateRequest(fundamentalAnalysisSchema), async (req, res) => {
    try {
        const { symbol, technicalData } = req.body;
        
        logger.api(`Performing fundamental analysis for ${symbol}`);
        
        const analysis = await newsDataService.getFundamentalAnalysis(symbol, technicalData);
        
        res.json({
            status: 'success',
            ...analysis
        });
    } catch (error) {
        logger.error('Error performing fundamental analysis:', error);
        res.status(500).json({
            error: 'Failed to perform fundamental analysis',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/news/sources/status
 * Get status of news sources
 */
router.get('/sources/status', async (req, res) => {
    try {
        const sources = Object.keys(newsDataService.sources).map(key => ({
            name: newsDataService.sources[key].name,
            key: key,
            hasApiKey: !!newsDataService.sources[key].apiKey,
            url: newsDataService.sources[key].url
        }));
        
        res.json({
            status: 'success',
            sources,
            totalSources: sources.length,
            configuredSources: sources.filter(s => s.hasApiKey).length
        });
    } catch (error) {
        logger.error('Error getting sources status:', error);
        res.status(500).json({
            error: 'Failed to get sources status',
            message: error.message
        });
    }
});

export default router; 