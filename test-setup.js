#!/usr/bin/env node

/**
 * Test script to verify the crypto prediction server setup
 */

import axios from 'axios';
import { logger } from './src/utils/logger.js';

const BASE_URL = 'http://localhost:3000/api/v1';

async function testServer() {
    console.log('🧪 Testing Crypto Prediction Server Setup...\n');

    try {
        // Test 1: Health Check
        console.log('1. Testing health check...');
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Health check passed:', healthResponse.data.status);

        // Test 2: API Documentation
        console.log('\n2. Testing API documentation...');
        const docsResponse = await axios.get(`${BASE_URL}/docs`);
        console.log('✅ API docs available:', docsResponse.data.name);

        // Test 3: Prediction Status
        console.log('\n3. Testing prediction status...');
        const statusResponse = await axios.get(`${BASE_URL}/prediction/status`);
        console.log('✅ Prediction status:', statusResponse.data.status);

        // Test 4: Data Endpoints
        console.log('\n4. Testing data endpoints...');
        const symbolsResponse = await axios.get(`${BASE_URL}/data/symbols`);
        console.log('✅ Symbols endpoint working');

        // Test 5: Model Management
        console.log('\n5. Testing model management...');
        const modelStatusResponse = await axios.get(`${BASE_URL}/models/status`);
        console.log('✅ Model management working');

        console.log('\n🎉 All tests passed! Server is ready for use.');
        console.log('\n📚 Next steps:');
        console.log('1. Set up your Polygon.io API key in .env');
        console.log('2. Start MongoDB and Redis');
        console.log('3. Train your first model: POST /api/v1/prediction/train');
        console.log('4. Make predictions: POST /api/v1/prediction/predict');
        console.log('5. Generate trading signals: POST /api/v1/trading/signal');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Make sure the server is running:');
            console.log('   npm run dev');
        }
        
        if (error.response) {
            console.log('Response status:', error.response.status);
            console.log('Response data:', error.response.data);
        }
        
        process.exit(1);
    }
}

// Run tests
testServer(); 