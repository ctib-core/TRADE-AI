import express from 'express';
import predictionRoutes from './prediction.js';
import tradingRoutes from './trading.js';
import dataRoutes from './data.js';
import modelRoutes from './models.js';
import symbolsRoutes from './symbols.js';
import newsRoutes from './news.js';
import { logger } from '../utils/logger.js';

export const setupRoutes = (app) => {
    // API versioning
    const apiRouter = express.Router();
    
    // Health check route
    apiRouter.get('/health', (req, res) => {
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV
        });
    });

    // API documentation route
    apiRouter.get('/docs', (req, res) => {
        res.json({
            name: 'Advanced AI/ML Trading Prediction API',
            version: '2.0.0',
            description: 'Production-ready AI/ML trading prediction server with comprehensive market data, CFD trading signals, and fundamental analysis',
            endpoints: {
                '/api/v1/symbols': 'Market symbols (crypto, stocks, forex)',
                '/api/v1/prediction': 'AI/ML prediction endpoints',
                '/api/v1/trading': 'CFD trading signal endpoints with advanced models',
                '/api/v1/data': 'Market data endpoints',
                '/api/v1/models': 'Model management endpoints',
                '/api/v1/news': 'News sentiment and fundamental analysis'
            },
            features: [
                '15+ years of historical data analysis',
                'TensorFlow.js LSTM with advanced architecture',
                'Ensemble learning (Random Forest, SVM)',
                'Self-learning models with continuous improvement',
                'Fundamental analysis with news sentiment',
                'Comprehensive technical indicators',
                'Real-time market data from Polygon.io',
                'CFD trading with proper lot sizing',
                'Advanced risk management',
                'Limit orders and advanced order types',
                'Production-ready model persistence',
                'WebSocket real-time updates',
                'News sentiment analysis from trusted sources'
            ]
        });
    });

    // Mount route modules
    apiRouter.use('/symbols', symbolsRoutes);
    apiRouter.use('/prediction', predictionRoutes);
    apiRouter.use('/trading', tradingRoutes);
    apiRouter.use('/data', dataRoutes);
    apiRouter.use('/models', modelRoutes);
    apiRouter.use('/news', newsRoutes);

    // Mount API router
    app.use('/api/v1', apiRouter);

    // 404 handler for API routes
    apiRouter.use('*', (req, res) => {
        res.status(404).json({
            error: 'API endpoint not found',
            message: `Route ${req.originalUrl} not found`,
            availableEndpoints: [
                '/api/v1/health',
                '/api/v1/docs',
                '/api/v1/symbols',
                '/api/v1/prediction',
                '/api/v1/trading',
                '/api/v1/data',
                '/api/v1/models',
                '/api/v1/news'
            ]
        });
    });

    logger.info('Routes setup completed');
}; 