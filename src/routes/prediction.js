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
 * GET /api/v1/prediction/test-train/:symbol
 * Test model training and saving for a specific symbol
 */
router.get('/test-train/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        
        logger.info(`Testing model training for ${symbol}`);
        
        // Create a new engine instance
        const engine = new CryptoPredictionEngine({ symbol });
        
        logger.info(`Engine created, starting training...`);
        
        // Train the model
        try {
            engine.initializeModels();
            await engine.trainModels();
            await engine.saveModels();
            
            // Store the engine in the global map
            predictionEngines.set(symbol, engine);
            logger.info(`✅ Model trained and saved for ${symbol}`);
            
            res.json({
                status: 'success',
                symbol,
                isTrained: engine.isTrained,
                hasLSTM: !!engine.models.lstm,
                hasRandomForest: !!engine.models.randomForest,
                config: engine.config,
                lastTraining: engine.lastTraining,
                message: 'Model trained and saved successfully'
            });
        } catch (trainError) {
            logger.error(`❌ Model training failed for ${symbol}:`, trainError);
            
            res.json({
                status: 'error',
                symbol,
                error: trainError.message,
                isTrained: engine.isTrained
            });
        }
    } catch (error) {
        logger.error('Test train error:', error);
        res.status(500).json({
            error: 'Test failed',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/prediction/test-load/:symbol
 * Test model loading for a specific symbol
 */
router.get('/test-load/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        
        logger.info(`Testing model loading for ${symbol}`);
        
        // Create a new engine instance
        const engine = new CryptoPredictionEngine({ symbol });
        
        logger.info(`Engine created, isTrained: ${engine.isTrained}`);
        
        // Try to load models
        try {
            await engine.loadModels();
            logger.info(`✅ Model loading successful for ${symbol}`);
            
            // Store the engine in the global map
            predictionEngines.set(symbol, engine);
            logger.info(`✅ Engine stored in global map for ${symbol}`);
            
            res.json({
                status: 'success',
                symbol,
                isTrained: engine.isTrained,
                hasLSTM: !!engine.models.lstm,
                hasRandomForest: !!engine.models.randomForest,
                config: engine.config,
                lastTraining: engine.lastTraining
            });
        } catch (loadError) {
            logger.error(`❌ Model loading failed for ${symbol}:`, loadError);
            
            res.json({
                status: 'error',
                symbol,
                error: loadError.message,
                isTrained: engine.isTrained
            });
        }
    } catch (error) {
        logger.error('Test load error:', error);
        res.status(500).json({
            error: 'Test failed',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/prediction/models/list
 * List all available models in the models directory
 */
router.get('/models/list', async (req, res) => {
    try {
        const fs = await import('fs');
        const path = await import('path');
        
        const modelsDir = './models';
        const models = [];
        
        if (fs.existsSync(modelsDir)) {
            const modelDirs = fs.readdirSync(modelsDir);
            
            for (const modelDir of modelDirs) {
                const modelPath = path.join(modelsDir, modelDir);
                const stats = fs.statSync(modelPath);
                
                if (stats.isDirectory()) {
                    const files = fs.readdirSync(modelPath);
                    const hasMetadata = files.includes('metadata.json');
                    const hasNeuralNetwork = files.includes('neural_network.json');
                    const hasStatus = files.includes('model_status.json');
                    
                    models.push({
                        symbol: modelDir,
                        path: modelPath,
                        files: files,
                        hasMetadata,
                        hasNeuralNetwork,
                        hasStatus,
                        isComplete: hasMetadata && hasNeuralNetwork && hasStatus,
                        lastModified: stats.mtime
                    });
                }
            }
        }
        
        res.json({
            status: 'success',
            modelsDirectory: modelsDir,
            exists: fs.existsSync(modelsDir),
            models: models,
            totalModels: models.length
        });
    } catch (error) {
        logger.error('Error listing models:', error);
        res.status(500).json({
            error: 'Failed to list models',
            message: error.message
        });
    }
});

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
        
        // Get or create prediction engine
        let engine = predictionEngines.get(symbol);
        if (!engine) {
            engine = new CryptoPredictionEngine({ symbol, ...config });
            predictionEngines.set(symbol, engine);
        } else {
            // Update config for existing engine
            Object.assign(engine.config, config);
        }

        // Try to load existing model first
        if (!engine.isTrained) {
            try {
                await engine.loadModels(); // Try to load existing model
                logger.info(`Model loaded from disk for ${symbol}`);
            } catch (e) {
                logger.info(`Could not load model for ${symbol}, training from scratch: ${e.message}`);
                // If loading fails, train from scratch
                engine.initializeModels();
                await engine.trainModels();
                await engine.saveModels();
                engine.lastTraining = new Date().toISOString();
            }
        } else {
            // Force retraining for training endpoint
            engine.initializeModels();
            await engine.trainModels();
            await engine.saveModels();
            engine.lastTraining = new Date().toISOString();
        }

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
        
        logger.info(`Prediction request for ${symbol}`, { config });
        
        // Get or create prediction engine
        let engine = predictionEngines.get(symbol);
        if (!engine) {
            logger.info(`Creating new engine for ${symbol}`);
            engine = new CryptoPredictionEngine({ symbol, ...config });
            predictionEngines.set(symbol, engine);
        } else {
            logger.info(`Using existing engine for ${symbol}`);
            // Update config for existing engine
            Object.assign(engine.config, config);
        }

        logger.info(`Engine isTrained: ${engine.isTrained}`);

        // Try to load existing model first
        if (!engine.isTrained) {
            logger.info(`Attempting to load model from disk for ${symbol}`);
            try {
                await engine.loadModels(); // Try to load existing model
                logger.info(`✅ Model loaded from disk for ${symbol}`);
            } catch (e) {
                logger.info(`❌ Could not load model for ${symbol}, training from scratch: ${e.message}`);
                // If loading fails, train from scratch
                engine.initializeModels();
                await engine.trainModels();
                await engine.saveModels();
                engine.lastTraining = new Date().toISOString();
                logger.info(`✅ Model trained and saved for ${symbol}`);
            }
        } else {
            logger.info(`✅ Engine already trained for ${symbol}`);
        }

        // Run prediction
        logger.info(`Running prediction for ${symbol}`);
        const result = await engine.runPrediction();
        logger.info(`✅ Prediction completed for ${symbol}`);
        
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
 * GET /api/v1/prediction/job/:jobId - check job status/result
 * @deprecated - This endpoint is no longer used since we removed job queuing
 */
router.get('/job/:jobId', async (req, res) => {
    res.status(410).json({
        error: 'Deprecated',
        message: 'Job queuing has been removed. All requests now run synchronously.'
    });
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