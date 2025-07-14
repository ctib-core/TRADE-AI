#!/usr/bin/env node

/**
 * Standalone BTC Prediction Script
 * Usage: node scripts/predict-btc.js
 */

import CryptoPredictionEngine from '../src/ml/CryptoPredictionEngine.js';
import { logger } from '../src/utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function predictBTC() {
    try {
        console.log('🔮 Starting BTC prediction...');
        
        // Check for API key
        if (!process.env.POLYGON_API_KEY) {
            throw new Error('POLYGON_API_KEY environment variable is required');
        }

        // Initialize BTC prediction engine
        const engine = new CryptoPredictionEngine({
            symbol: 'X:BTCUSD',
            useAdvancedModel: true,
            enableSelfLearning: true
        });

        console.log('📊 Initializing models...');
        engine.initializeModels();

        console.log('🎯 Training models (if not already trained)...');
        await engine.trainModels();

        console.log('🔮 Making prediction...');
        const result = await engine.runPrediction();

        console.log('\n📈 BTC Prediction Results:');
        console.log('========================');
        console.log(`Current Price: $${result.currentPrice?.toFixed(2)}`);
        console.log(`Predicted Price: $${result.prediction?.ensemble?.toFixed(2)}`);
        console.log(`Confidence: ${(result.prediction?.confidence * 100).toFixed(1)}%`);
        console.log(`Signal: ${result.tradingSignal?.signal}`);
        
        if (result.tradingSignal?.signal !== 'HOLD') {
            console.log(`Entry: $${result.tradingSignal?.entry?.toFixed(2)}`);
            console.log(`Stop Loss: $${result.tradingSignal?.stopLoss?.toFixed(2)}`);
            console.log(`Take Profit: $${result.tradingSignal?.takeProfit?.toFixed(2)}`);
            console.log(`Risk/Reward: ${result.tradingSignal?.riskRewardRatio?.toFixed(2)}`);
        }

        console.log('\n📊 Model Performance:');
        console.log(`- Models trained: ${Object.keys(engine.models).join(', ')}`);
        console.log(`- Last training: ${engine.lastTraining}`);
        console.log(`- Prediction count: ${engine.predictionHistory?.length || 0}`);

    } catch (error) {
        console.error('❌ BTC prediction failed:', error.message);
        process.exit(1);
    }
}

// Run the prediction
predictBTC(); 