#!/usr/bin/env node

/**
 * Test script for the AI Chat endpoint
 * Usage: node test-chat.js
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/v1/chat';

async function testChat() {
    console.log('🤖 Testing AI Chat Endpoint\n');
    
    const testMessages = [
        { message: "Hello!", description: "Greeting" },
        { message: "What's the prediction for Bitcoin?", description: "Prediction request" },
        { message: "Analyze the current market for ETH", description: "Analysis request" },
        { message: "Should I buy BTC now?", description: "Trading advice" },
        { message: "What's the current price of Bitcoin?", description: "Market data" },
        { message: "Help me understand what you can do", description: "Help request" }
    ];
    
    for (const test of testMessages) {
        try {
            console.log(`📝 Testing: ${test.description}`);
            console.log(`💬 Message: "${test.message}"`);
            
            const response = await axios.post(BASE_URL, {
                message: test.message
            });
            
            console.log(`🤖 AI Response: ${response.data.response}`);
            console.log(`🎯 Intent: ${response.data.intent} (confidence: ${response.data.confidence})`);
            console.log('─'.repeat(80) + '\n');
            
            // Wait a bit between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error(`❌ Error testing "${test.message}":`, error.response?.data || error.message);
            console.log('─'.repeat(80) + '\n');
        }
    }
    
    // Test chat history
    try {
        console.log('📚 Testing chat history...');
        const historyResponse = await axios.get(`${BASE_URL}/history`);
        console.log(`📊 Total messages in history: ${historyResponse.data.totalMessages}`);
        console.log('✅ Chat history test completed\n');
    } catch (error) {
        console.error('❌ Error getting chat history:', error.response?.data || error.message);
    }
}

// Run the test
testChat().catch(console.error); 