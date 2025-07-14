#!/usr/bin/env node

/**
 * Batch Training Script for Multiple Cryptocurrencies
 * Usage: node scripts/batch-train.js
 */

import CryptoPredictionEngine from '../src/ml/CryptoPredictionEngine.js';
import { logger } from '../src/utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define cryptocurrencies to train
const CRYPTO_SYMBOLS = [
    'X:BTCUSD',
    'X:ETHUSD',
    'X:ADAUSD',
    'X:DOTUSD',
    'X:LINKUSD'
];

async function trainModel(symbol, config = {}) {
    try {
        console.log(`🚀 Training model for ${symbol}...`);
        
        const engine = new CryptoPredictionEngine({
            symbol,
            epochs: 50, // Reduced for batch training
            batchSize: 32,
            learningRate: 0.001,
            lstmUnits: [128, 64, 32],
            dropoutRate: 0.2,
            useAdvancedModel: true,
            enableSelfLearning: true,
            modelType: 'ensemble',
            ...config
        });

        engine.initializeModels();
        await engine.trainModels();
        await engine.saveModels('./models');

        console.log(`✅ ${symbol} model training completed!`);
        return { symbol, success: true, lastTraining: engine.lastTraining };
        
    } catch (error) {
        console.error(`❌ ${symbol} model training failed:`, error.message);
        return { symbol, success: false, error: error.message };
    }
}

async function batchTrain() {
    try {
        console.log('🚀 Starting batch training for multiple cryptocurrencies...');
        
        // Check for API key
        if (!process.env.POLYGON_API_KEY) {
            throw new Error('POLYGON_API_KEY environment variable is required');
        }

        const results = [];
        
        // Train models sequentially to avoid memory issues
        for (const symbol of CRYPTO_SYMBOLS) {
            console.log(`\n📊 Processing ${symbol}...`);
            const result = await trainModel(symbol);
            results.push(result);
            
            // Small delay between models
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Summary
        console.log('\n📈 Batch Training Summary:');
        console.log('==========================');
        
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        console.log(`✅ Successful: ${successful.length}/${results.length}`);
        successful.forEach(r => console.log(`  - ${r.symbol}: ${r.lastTraining}`));
        
        if (failed.length > 0) {
            console.log(`❌ Failed: ${failed.length}/${results.length}`);
            failed.forEach(r => console.log(`  - ${r.symbol}: ${r.error}`));
        }

        console.log('\n📁 All models saved to: ./models/');
        
    } catch (error) {
        console.error('❌ Batch training failed:', error.message);
        process.exit(1);
    }
}

// Run batch training
batchTrain(); 