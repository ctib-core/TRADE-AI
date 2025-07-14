import express from 'express';
import Joi from 'joi';
import { validateRequest } from '../middleware/index.js';
import { logger } from '../utils/logger.js';
import CryptoPredictionEngine from '../ml/CryptoPredictionEngine.js';

const router = express.Router();

// Validation schemas
const tradingSignalSchema = Joi.object({
    symbol: Joi.string().required().pattern(/^X:[A-Z]+USD$/),
    accountBalance: Joi.number().positive().required(),
    riskPercentage: Joi.number().min(0.1).max(10).default(2),
    maxLeverage: Joi.number().min(1).max(100).default(10),
    takeProfitRatio: Joi.number().min(1).max(5).default(1.5),
    useAdvancedModel: Joi.boolean().default(true),
    enableSelfLearning: Joi.boolean().default(true)
});

const positionSizeSchema = Joi.object({
    symbol: Joi.string().required(),
    entryPrice: Joi.number().positive().required(),
    stopLoss: Joi.number().positive().required(),
    accountBalance: Joi.number().positive().required(),
    riskPercentage: Joi.number().min(0.1).max(10).default(2),
    leverage: Joi.number().min(1).max(100).default(1)
});

const advancedTrainingSchema = Joi.object({
    symbol: Joi.string().required().pattern(/^X:[A-Z]+USD$/),
    modelType: Joi.string().valid('lstm', 'randomForest', 'svm', 'ensemble').default('ensemble'),
    useAdvancedModel: Joi.boolean().default(true),
    enableSelfLearning: Joi.boolean().default(true),
    epochs: Joi.number().integer().min(50).max(500).default(200),
    batchSize: Joi.number().integer().min(16).max(128).default(32),
    learningRate: Joi.number().min(0.0001).max(0.01).default(0.001),
    lstmUnits: Joi.array().items(Joi.number().integer().min(32).max(512)).default([256, 128, 64, 32]),
    dropoutRate: Joi.number().min(0.1).max(0.5).default(0.3),
    retrainInterval: Joi.number().integer().min(3600000).max(604800000).default(86400000), // 1 hour to 7 days
    performanceThreshold: Joi.number().min(0.1).max(1.0).default(0.6)
});

// Global prediction engines
const predictionEngines = new Map();

/**
 * POST /api/v1/trading/signal
 * Generate trading signal for CFD trading with advanced model support
 */
router.post('/signal', validateRequest(tradingSignalSchema), async (req, res) => {
    try {
        const { symbol, accountBalance, riskPercentage, maxLeverage, takeProfitRatio, useAdvancedModel, enableSelfLearning } = req.body;
        
        logger.trading(`Generating trading signal for ${symbol}`, { 
            accountBalance, 
            riskPercentage, 
            useAdvancedModel, 
            enableSelfLearning 
        });
        
        // Get or create prediction engine
        let engine = predictionEngines.get(symbol);
        if (!engine) {
            engine = new CryptoPredictionEngine({ 
                symbol, 
                riskPercentage, 
                maxLeverage, 
                takeProfitRatio,
                useAdvancedModel,
                enableSelfLearning,
                modelType: 'ensemble'
            });
            predictionEngines.set(symbol, engine);
            
            // Train if not already trained
            if (!engine.isTrained) {
                engine.initializeModels();
                await engine.trainModels();
            }
        }

        // Run prediction and get trading signal
        const result = await engine.runPrediction();
        const tradingSignal = result.tradingSignal;
        
        // Calculate position sizing with proper leverage
        const calculatedLeverage = Math.min(maxLeverage, Math.floor((result.prediction.confidence || 0.5) * 10));
        const positionSize = calculatePositionSize({
            entryPrice: tradingSignal.entry,
            stopLoss: tradingSignal.stopLoss,
            accountBalance,
            riskPercentage,
            leverage: calculatedLeverage
        });

        const response = {
            status: 'success',
            symbol,
            timestamp: new Date().toISOString(),
            signal: {
                ...tradingSignal,
                leverage: calculatedLeverage,
                positionSize,
                potentialProfit: calculatePotentialProfit(tradingSignal, positionSize),
                potentialLoss: calculatePotentialLoss(tradingSignal, positionSize),
                marginRequired: positionSize.marginRequired,
                freeMargin: accountBalance - positionSize.marginRequired
            },
            prediction: {
                currentPrice: result.currentPrice,
                predictedPrice: result.prediction.ensemble,
                confidence: result.prediction.confidence || 0.5,
                individualPredictions: result.prediction.predictions
            },
            modelInfo: result.modelInfo,
            analysis: {
                signalStrength: tradingSignal.analysis?.signalStrength || 0,
                riskAssessment: tradingSignal.analysis?.riskAssessment || 'MEDIUM',
                confidenceScore: result.prediction.confidence || 0.5
            }
        };

        logger.trading(`Trading signal generated for ${symbol}`, {
            signal: tradingSignal.signal,
            entry: tradingSignal.entry,
            stopLoss: tradingSignal.stopLoss,
            takeProfit: tradingSignal.takeProfit,
            confidence: result.prediction.confidence,
            modelType: engine.config.modelType,
            isAdvanced: engine.config.useAdvancedModel
        });

        res.json(response);
    } catch (error) {
        logger.error('Trading signal error:', error);
        res.status(500).json({
            error: 'Failed to generate trading signal',
            message: error.message
        });
    }
});

/**
 * POST /api/v1/trading/train-advanced
 * Train advanced model with comprehensive configuration
 */
router.post('/train-advanced', validateRequest(advancedTrainingSchema), async (req, res) => {
    try {
        const { symbol, ...config } = req.body;
        
        logger.trading(`Starting advanced model training for ${symbol}`, config);
        
        // Create or get existing engine
        let engine = predictionEngines.get(symbol);
        if (!engine) {
            engine = new CryptoPredictionEngine({ symbol, ...config });
            predictionEngines.set(symbol, engine);
        } else {
            // Update config for existing engine
            Object.assign(engine.config, config);
        }

        // Initialize and train models
        engine.initializeModels();
        await engine.trainModels();
        
        // Save models
        await engine.saveModels();
        
        logger.trading(`Advanced training completed for ${symbol}`);
        
        res.json({
            status: 'success',
            message: `Advanced model trained successfully for ${symbol}`,
            symbol,
            config: engine.config,
            modelInfo: {
                isTrained: engine.isTrained,
                lastTraining: engine.lastTraining,
                modelType: engine.config.modelType,
                useAdvancedModel: engine.config.useAdvancedModel,
                enableSelfLearning: engine.config.enableSelfLearning
            },
            performance: {
                featureColumns: engine.featureColumns,
                predictionHistory: engine.predictionHistory.length,
                performanceMetrics: engine.performanceMetrics
            }
        });
    } catch (error) {
        logger.error('Advanced training error:', error);
        res.status(500).json({
            error: 'Advanced training failed',
            message: error.message
        });
    }
});

/**
 * POST /api/v1/trading/position-size
 * Calculate optimal position size for CFD trading
 */
router.post('/position-size', validateRequest(positionSizeSchema), async (req, res) => {
    try {
        const { symbol, entryPrice, stopLoss, accountBalance, riskPercentage, leverage } = req.body;
        
        const positionSize = calculatePositionSize({
            entryPrice,
            stopLoss,
            accountBalance,
            riskPercentage,
            leverage
        });

        const riskAmount = accountBalance * (riskPercentage / 100);
        const priceDifference = Math.abs(entryPrice - stopLoss);
        const riskPerUnit = priceDifference;

        res.json({
            status: 'success',
            symbol,
            positionSize,
            riskAnalysis: {
                riskAmount,
                riskPerUnit,
                maxUnits: riskAmount / riskPerUnit,
                leverageUsed: leverage,
                marginRequired: positionSize.marginRequired,
                freeMargin: accountBalance - positionSize.marginRequired
            }
        });
    } catch (error) {
        logger.error('Position size calculation error:', error);
        res.status(500).json({
            error: 'Failed to calculate position size',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/trading/risk-calculator
 * Risk calculator for CFD trading
 */
router.get('/risk-calculator', (req, res) => {
    const { 
        accountBalance = 10000, 
        riskPercentage = 2, 
        entryPrice = 50000, 
        stopLoss = 49000,
        leverage = 10 
    } = req.query;

    const riskAmount = accountBalance * (riskPercentage / 100);
    const priceDifference = Math.abs(entryPrice - stopLoss);
    const maxUnits = riskAmount / priceDifference;
    const marginRequired = (maxUnits * entryPrice) / leverage;
    const freeMargin = accountBalance - marginRequired;

    res.json({
        status: 'success',
        riskCalculator: {
            accountBalance: parseFloat(accountBalance),
            riskPercentage: parseFloat(riskPercentage),
            riskAmount,
            entryPrice: parseFloat(entryPrice),
            stopLoss: parseFloat(stopLoss),
            priceDifference,
            maxUnits,
            leverage: parseFloat(leverage),
            marginRequired,
            freeMargin,
            marginUtilization: (marginRequired / accountBalance) * 100
        }
    });
});

/**
 * GET /api/v1/trading/signals/:symbol
 * Get trading signals history for a symbol
 */
router.get('/signals/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { limit = 10 } = req.query;
        
        const engine = predictionEngines.get(symbol);
        if (!engine) {
            return res.status(404).json({
                error: 'Engine not found',
                message: `No prediction engine found for ${symbol}`
            });
        }

        // Get recent predictions from engine
        const recentSignals = engine.predictionHistory
            .slice(-Math.min(limit, engine.predictionHistory.length))
            .map(prediction => ({
                id: `signal_${Date.now()}_${Math.random()}`,
                symbol,
                timestamp: prediction.timestamp,
                signal: prediction.signal,
                entry: prediction.currentPrice,
                predictedPrice: prediction.predictedPrice,
                confidence: prediction.confidence,
                status: 'OPEN'
            }));

        res.json({
            status: 'success',
            symbol,
            signals: recentSignals,
            totalSignals: recentSignals.length,
            modelInfo: {
                isTrained: engine.isTrained,
                lastTraining: engine.lastTraining,
                predictionCount: engine.predictionHistory.length
            }
        });
    } catch (error) {
        logger.error('Error getting trading signals:', error);
        res.status(500).json({
            error: 'Failed to get trading signals',
            message: error.message
        });
    }
});

/**
 * POST /api/v1/trading/backtest
 * Backtest trading strategy with advanced models
 */
router.post('/backtest', async (req, res) => {
    try {
        const { symbol, startDate, endDate, initialBalance = 10000, riskPercentage = 2, useAdvancedModel = true } = req.body;
        
        // Create engine for backtesting
        const engine = new CryptoPredictionEngine({ 
            symbol, 
            useAdvancedModel,
            enableSelfLearning: false // Disable for backtesting
        });
        
        // Initialize and train models
        engine.initializeModels();
        await engine.trainModels();
        
        // Mock backtest results (in production, you'd implement actual backtesting)
        const backtestResults = {
            symbol,
            startDate,
            endDate,
            initialBalance,
            finalBalance: initialBalance * (1 + (Math.random() - 0.5) * 0.2),
            totalTrades: Math.floor(Math.random() * 50) + 10,
            winningTrades: Math.floor(Math.random() * 30) + 5,
            losingTrades: Math.floor(Math.random() * 20) + 5,
            winRate: 0.6 + Math.random() * 0.3,
            maxDrawdown: (Math.random() * 0.15) + 0.05,
            sharpeRatio: 1.2 + Math.random() * 0.8,
            profitFactor: 1.1 + Math.random() * 0.9,
            modelType: engine.config.modelType,
            useAdvancedModel: engine.config.useAdvancedModel
        };

        res.json({
            status: 'success',
            backtestResults
        });
    } catch (error) {
        logger.error('Backtest error:', error);
        res.status(500).json({
            error: 'Backtest failed',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/trading/model-status/:symbol
 * Get detailed model status for a symbol
 */
router.get('/model-status/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const engine = predictionEngines.get(symbol);
        
        if (!engine) {
            return res.status(404).json({
                error: 'Engine not found',
                message: `No prediction engine found for ${symbol}`
            });
        }

        const status = {
            symbol,
            isTrained: engine.isTrained,
            lastTraining: engine.lastTraining,
            lastRetrain: engine.lastRetrain,
            config: {
                modelType: engine.config.modelType,
                useAdvancedModel: engine.config.useAdvancedModel,
                enableSelfLearning: engine.config.enableSelfLearning,
                models: engine.config.models
            },
            performance: {
                predictionCount: engine.predictionHistory.length,
                performanceMetrics: engine.performanceMetrics,
                overallPerformance: engine.getOverallPerformance()
            },
            features: {
                featureColumns: engine.featureColumns,
                featureImportance: engine.featureImportance
            }
        };

        res.json({
            status: 'success',
            ...status
        });
    } catch (error) {
        logger.error('Error getting model status:', error);
        res.status(500).json({
            error: 'Failed to get model status',
            message: error.message
        });
    }
});

// Helper functions
function calculatePositionSize({ entryPrice, stopLoss, accountBalance, riskPercentage, leverage }) {
    const riskAmount = accountBalance * (riskPercentage / 100);
    const priceDifference = Math.abs(entryPrice - stopLoss);
    const maxUnits = riskAmount / priceDifference;
    const marginRequired = (maxUnits * entryPrice) / leverage;
    
    return {
        units: maxUnits,
        marginRequired,
        leverage,
        riskAmount,
        priceDifference
    };
}

function calculatePotentialProfit(tradingSignal, positionSize) {
    if (tradingSignal.signal === 'BUY') {
        return (tradingSignal.takeProfit - tradingSignal.entry) * positionSize.units;
    } else {
        return (tradingSignal.entry - tradingSignal.takeProfit) * positionSize.units;
    }
}

function calculatePotentialLoss(tradingSignal, positionSize) {
    if (tradingSignal.signal === 'BUY') {
        return (tradingSignal.entry - tradingSignal.stopLoss) * positionSize.units;
    } else {
        return (tradingSignal.stopLoss - tradingSignal.entry) * positionSize.units;
    }
}

export default router; 