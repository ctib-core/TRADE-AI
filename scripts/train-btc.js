#!/usr/bin/env node

/**
 * Standalone BTC Model Training Script
 * Usage: node scripts/train-btc.js
 */

import CryptoPredictionEngine from '../src/ml/CryptoPredictionEngine.js';
import { logger } from '../src/utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function trainBTCModel() {
    try {
        console.log('🚀 Starting BTC model training...');
        
        // Check for API key
        if (!process.env.POLYGON_API_KEY) {
            throw new Error('POLYGON_API_KEY environment variable is required');
        }

        // Initialize BTC prediction engine
        const engine = new CryptoPredictionEngine({
            symbol: 'X:BTCUSD',
            epochs: 100,
            batchSize: 32,
            learningRate: 0.001,
            lstmUnits: [128, 64, 32],
            dropoutRate: 0.2,
            useAdvancedModel: true,
            enableSelfLearning: true,
            modelType: 'ensemble'
        });

        console.log('📊 Initializing models...');
        engine.initializeModels();

        console.log('🎯 Training models...');
        await engine.trainModels();

        console.log('💾 Saving models...');
        await engine.saveModels('./models');

        console.log('✅ BTC model training completed successfully!');
        console.log('📁 Models saved to: ./models/X_BTCUSD/');
        
        // Log model info
        console.log('\n📈 Model Information:');
        console.log(`- Symbol: ${engine.config.symbol}`);
        console.log(`- Feature columns: ${engine.featureColumns}`);
        console.log(`- Training completed: ${engine.lastTraining}`);
        console.log(`- Models trained: ${Object.keys(engine.models).join(', ')}`);

    } catch (error) {
        console.error('❌ BTC model training failed:', error.message);
        process.exit(1);
    }
}

// Run the training
trainBTCModel(); 