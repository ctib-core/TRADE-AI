import express from 'express';
import Joi from 'joi';
import { validateRequest } from '../middleware/index.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Validation schemas
const saveModelSchema = Joi.object({
    symbol: Joi.string().required().pattern(/^X:[A-Z]+USD$/),
    modelName: Joi.string().required(),
    description: Joi.string().optional(),
    version: Joi.string().default('1.0.0')
});

const loadModelSchema = Joi.object({
    symbol: Joi.string().required().pattern(/^X:[A-Z]+USD$/),
    modelName: Joi.string().required()
});

/**
 * GET /api/v1/models
 * List all available models
 */
router.get('/', async (req, res) => {
    try {
        const modelsPath = process.env.MODEL_SAVE_PATH || './models';
        
        if (!fs.existsSync(modelsPath)) {
            return res.json({
                status: 'success',
                models: [],
                message: 'No models directory found'
            });
        }

        const models = [];
        const files = fs.readdirSync(modelsPath);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const modelPath = path.join(modelsPath, file);
                    const stats = fs.statSync(modelPath);
                    const modelData = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
                    
                    models.push({
                        name: file.replace('.json', ''),
                        symbol: modelData.symbol || 'Unknown',
                        version: modelData.version || '1.0.0',
                        description: modelData.description || '',
                        size: stats.size,
                        lastModified: stats.mtime,
                        config: modelData.config || {}
                    });
                } catch (error) {
                    logger.warn(`Failed to read model file ${file}:`, error.message);
                }
            }
        }

        res.json({
            status: 'success',
            models,
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
 * POST /api/v1/models/save
 * Save a trained model
 */
router.post('/save', validateRequest(saveModelSchema), async (req, res) => {
    try {
        const { symbol, modelName, description, version } = req.body;
        
        logger.model(`Saving model ${modelName} for ${symbol}`);
        
        const modelsPath = process.env.MODEL_SAVE_PATH || './models';
        
        // Ensure models directory exists
        if (!fs.existsSync(modelsPath)) {
            fs.mkdirSync(modelsPath, { recursive: true });
        }

        const modelData = {
            symbol,
            modelName,
            description,
            version,
            savedAt: new Date().toISOString(),
            config: {
                // Model configuration would be saved here
                symbol,
                version
            }
        };

        const fileName = `${modelName}_${symbol.replace(':', '_')}.json`;
        const filePath = path.join(modelsPath, fileName);
        
        fs.writeFileSync(filePath, JSON.stringify(modelData, null, 2));
        
        logger.model(`Model saved successfully: ${fileName}`);
        
        res.json({
            status: 'success',
            message: `Model ${modelName} saved successfully`,
            fileName,
            modelData
        });
    } catch (error) {
        logger.error('Error saving model:', error);
        res.status(500).json({
            error: 'Failed to save model',
            message: error.message
        });
    }
});

/**
 * POST /api/v1/models/load
 * Load a saved model
 */
router.post('/load', validateRequest(loadModelSchema), async (req, res) => {
    try {
        const { symbol, modelName } = req.body;
        
        logger.model(`Loading model ${modelName} for ${symbol}`);
        
        const modelsPath = process.env.MODEL_SAVE_PATH || './models';
        const fileName = `${modelName}_${symbol.replace(':', '_')}.json`;
        const filePath = path.join(modelsPath, fileName);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                error: 'Model not found',
                message: `Model ${modelName} for ${symbol} not found`
            });
        }

        const modelData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        logger.model(`Model loaded successfully: ${fileName}`);
        
        res.json({
            status: 'success',
            message: `Model ${modelName} loaded successfully`,
            modelData
        });
    } catch (error) {
        logger.error('Error loading model:', error);
        res.status(500).json({
            error: 'Failed to load model',
            message: error.message
        });
    }
});

/**
 * DELETE /api/v1/models/:modelName
 * Delete a saved model
 */
router.delete('/:modelName', async (req, res) => {
    try {
        const { modelName } = req.params;
        const { symbol } = req.query;
        
        if (!symbol) {
            return res.status(400).json({
                error: 'Symbol required',
                message: 'Symbol parameter is required'
            });
        }
        
        logger.model(`Deleting model ${modelName} for ${symbol}`);
        
        const modelsPath = process.env.MODEL_SAVE_PATH || './models';
        const fileName = `${modelName}_${symbol.replace(':', '_')}.json`;
        const filePath = path.join(modelsPath, fileName);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                error: 'Model not found',
                message: `Model ${modelName} for ${symbol} not found`
            });
        }

        fs.unlinkSync(filePath);
        
        logger.model(`Model deleted successfully: ${fileName}`);
        
        res.json({
            status: 'success',
            message: `Model ${modelName} deleted successfully`
        });
    } catch (error) {
        logger.error('Error deleting model:', error);
        res.status(500).json({
            error: 'Failed to delete model',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/models/status
 * Get model management status
 */
router.get('/status', async (req, res) => {
    try {
        const modelsPath = process.env.MODEL_SAVE_PATH || './models';
        const exists = fs.existsSync(modelsPath);
        
        let stats = null;
        if (exists) {
            const files = fs.readdirSync(modelsPath);
            const modelFiles = files.filter(file => file.endsWith('.json'));
            
            stats = {
                totalModels: modelFiles.length,
                totalSize: modelFiles.reduce((total, file) => {
                    const filePath = path.join(modelsPath, file);
                    return total + fs.statSync(filePath).size;
                }, 0),
                lastModified: exists ? fs.statSync(modelsPath).mtime : null
            };
        }

        res.json({
            status: 'success',
            modelsDirectory: modelsPath,
            exists,
            stats
        });
    } catch (error) {
        logger.error('Error getting model status:', error);
        res.status(500).json({
            error: 'Failed to get model status',
            message: error.message
        });
    }
});

export default router; 