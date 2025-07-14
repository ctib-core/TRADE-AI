import express from 'express';
import Joi from 'joi';
import { validateRequest } from '../middleware/index.js';
import { logger } from '../utils/logger.js';
import CryptoPredictionEngine from '../ml/CryptoPredictionEngine.js';

const router = express.Router();

// Validation schemas
const predictionRequestSchema = Joi.object({
    symbol: Joi.string().required().pattern(/^X:[A-Z]+USD$/),
    lookbackPeriod: Joi.number().integer().min(10).max(200).default(60),
    predictionHorizon: Joi.number().integer().min(1).max(30).default(5),
    models: Joi.array().items(Joi.string().valid('lstm', 'randomForest', 'svm')).default(['lstm', 'randomForest', 'svm']),
    useEnsemble: Joi.boolean().default(true)
});

const trainingRequestSchema = Joi.object({
    symbol: Joi.string().required().pattern(/^X:[A-Z]+USD$/),
    epochs: Joi.number().integer().min(10).max(500).default(100),
    batchSize: Joi.number().integer().min(8).max(128).default(32),
    learningRate: Joi.number().min(0.0001).max(0.1).default(0.001),
    lstmUnits: Joi.array().items(Joi.number().integer().min(16).max(256)).default([128, 64, 32]),
    dropoutRate: Joi.number().min(0.1).max(0.5).default(0.2)
});

// Global prediction engine instances
const predictionEngines = new Map();

/**
 * GET /api/v1/prediction/status
 * Get prediction engine status
 */
router.get('/status', async (req, res) => {
    try {
        const engines = Array.from(predictionEngines.entries()).map(([symbol, engine]) => ({
            symbol,
            isTrained: engine.isTrained,
            config: engine.config,
            lastTraining: engine.lastTraining || null
        }));

        res.json({
            status: 'OK',
            engines,
            totalEngines: engines.length
        });
    } catch (error) {
        logger.error('Error getting prediction status:', error);
        res.status(500).json({
            error: 'Failed to get prediction status',
            message: error.message
        });
    }
});

/**
 * POST /api/v1/prediction/train
 * Train a new prediction model
 */
router.post('/train', validateRequest(trainingRequestSchema), async (req, res) => {
    try {
        const { symbol, ...config } = req.body;
        
        logger.model(`Starting training for ${symbol}`, config);
        
        // Create or get existing engine
        let engine = predictionEngines.get(symbol);
        if (!engine) {
            engine = new CryptoPredictionEngine({ symbol, ...config });
            predictionEngines.set(symbol, engine);
        } else {
            // Update config for existing engine
            Object.assign(engine.config, config);
        }

        // Initialize models
        engine.initializeModels();
        
        // Train models
        await engine.trainModels();
        
        engine.lastTraining = new Date().toISOString();
        
        logger.model(`Training completed for ${symbol}`);
        
        res.json({
            status: 'success',
            message: `Model trained successfully for ${symbol}`,
            symbol,
            config: engine.config,
            trainingCompleted: engine.lastTraining
        });
    } catch (error) {
        logger.error('Training error:', error);
        res.status(500).json({
            error: 'Training failed',
            message: error.message
        });
    }
});

/**
 * POST /api/v1/prediction/predict
 * Make a prediction for a symbol
 */
router.post('/predict', validateRequest(predictionRequestSchema), async (req, res) => {
    try {
        const { symbol, ...config } = req.body;
        
        logger.prediction(`Making prediction for ${symbol}`, config);
        
        // Get or create engine
        let engine = predictionEngines.get(symbol);
        if (!engine) {
            engine = new CryptoPredictionEngine({ symbol, ...config });
            predictionEngines.set(symbol, engine);
            
            // Train if not already trained
            if (!engine.isTrained) {
                engine.initializeModels();
                await engine.trainModels();
                engine.lastTraining = new Date().toISOString();
            }
        }

        // Run prediction
        const result = await engine.runPrediction();
        
        logger.prediction(`Prediction completed for ${symbol}`, {
            currentPrice: result.currentPrice,
            predictedPrice: result.prediction.ensemble,
            signal: result.tradingSignal.signal,
            confidence: result.prediction.confidence
        });
        
        res.json({
            status: 'success',
            ...result
        });
    } catch (error) {
        logger.error('Prediction error:', error);
        res.status(500).json({
            error: 'Prediction failed',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/prediction/:symbol
 * Get latest prediction for a symbol
 */
router.get('/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const engine = predictionEngines.get(symbol);
        
        if (!engine) {
            return res.status(404).json({
                error: 'Model not found',
                message: `No trained model found for ${symbol}`
            });
        }

        if (!engine.isTrained) {
            return res.status(400).json({
                error: 'Model not trained',
                message: `Model for ${symbol} is not trained yet`
            });
        }

        const result = await engine.runPrediction();
        
        res.json({
            status: 'success',
            ...result
        });
    } catch (error) {
        logger.error('Error getting prediction:', error);
        res.status(500).json({
            error: 'Failed to get prediction',
            message: error.message
        });
    }
});

/**
 * DELETE /api/v1/prediction/:symbol
 * Remove a prediction model
 */
router.delete('/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const removed = predictionEngines.delete(symbol);
        
        if (removed) {
            logger.model(`Removed prediction model for ${symbol}`);
            res.json({
                status: 'success',
                message: `Model for ${symbol} removed successfully`
            });
        } else {
            res.status(404).json({
                error: 'Model not found',
                message: `No model found for ${symbol}`
            });
        }
    } catch (error) {
        logger.error('Error removing model:', error);
        res.status(500).json({
            error: 'Failed to remove model',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/prediction/:symbol/analysis
 * Get detailed analysis for a symbol
 */
router.get('/:symbol/analysis', async (req, res) => {
    try {
        const { symbol } = req.params;
        const engine = predictionEngines.get(symbol);
        
        if (!engine || !engine.isTrained) {
            return res.status(404).json({
                error: 'Model not found',
                message: `No trained model found for ${symbol}`
            });
        }

        // Get market data for analysis
        const marketData = await engine.fetchMarketData();
        const latestData = marketData.slice(-10); // Last 10 data points
        
        const analysis = {
            symbol,
            lastUpdate: new Date().toISOString(),
            marketData: {
                dataPoints: marketData.length,
                latestPrice: latestData[latestData.length - 1]?.close,
                priceChange: latestData[latestData.length - 1]?.priceChangePercent,
                volume: latestData[latestData.length - 1]?.volume
            },
            modelInfo: {
                isTrained: engine.isTrained,
                lastTraining: engine.lastTraining,
                config: engine.config,
                featureColumns: engine.featureColumns
            },
            technicalIndicators: latestData[latestData.length - 1]?.indicators || {}
        };

        res.json({
            status: 'success',
            ...analysis
        });
    } catch (error) {
        logger.error('Error getting analysis:', error);
        res.status(500).json({
            error: 'Failed to get analysis',
            message: error.message
        });
    }
});

export default router; 