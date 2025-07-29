#!/usr/bin/env node

/**
 * Test script for the LLM-powered Chat endpoint
 * Usage: node test-llm-chat.js
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/v1/chat';

async function testLLMChat() {
    console.log('🤖 Testing LLM-Powered Chat Endpoint\n');
    
    // First check LLM status
    try {
        console.log('📊 Checking Groq LLM Status...');
        const statusResponse = await axios.get(`${BASE_URL}/status`);
        console.log(`✅ LLM Enabled: ${statusResponse.data.llmEnabled}`);
        console.log(`🚀 Groq Model: ${statusResponse.data.model}`);
        console.log(`⚙️ Max Tokens: ${statusResponse.data.maxTokens}`);
        console.log(`🌡️ Temperature: ${statusResponse.data.temperature}\n`);
    } catch (error) {
        console.error('❌ Error checking LLM status:', error.response?.data || error.message);
    }
    
    const testMessages = [
        { 
            message: "Hello! I'm interested in Bitcoin trading. Can you help me understand the current market conditions?", 
            description: "Greeting with trading context" 
        },
        { 
            message: "What's your analysis of Bitcoin's current price action and where do you think it's heading?", 
            description: "Technical analysis request" 
        },
        { 
            message: "I have $10,000 to invest in crypto. Should I buy Bitcoin now or wait?", 
            description: "Investment advice request" 
        },
        { 
            message: "What are the key support and resistance levels for Ethereum?", 
            description: "Technical levels request" 
        },
        { 
            message: "Explain the current market sentiment and what factors are driving crypto prices", 
            description: "Market sentiment analysis" 
        }
    ];
    
    for (const test of testMessages) {
        try {
            console.log(`📝 Testing: ${test.description}`);
            console.log(`💬 Message: "${test.message}"`);
            
            const response = await axios.post(BASE_URL, {
                message: test.message
            });
            
            console.log(`🚀 Groq AI Response: ${response.data.response.substring(0, 200)}...`);
            console.log(`🎯 Intent: ${response.data.intent} (confidence: ${response.data.confidence})`);
            console.log(`🧠 LLM Enabled: ${response.data.llmEnabled}`);
            console.log('─'.repeat(80) + '\n');
            
            // Wait a bit between requests
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.error(`❌ Error testing "${test.message}":`, error.response?.data || error.message);
            console.log('─'.repeat(80) + '\n');
        }
    }
    
    // Test advanced analysis
    try {
        console.log('🔍 Testing Advanced Analysis...');
        const analysisResponse = await axios.post(`${BASE_URL}/analyze`, {
            symbol: 'X:BTCUSD',
            timeframe: 'short-term',
            analysisType: 'comprehensive'
        });
        
        console.log(`📊 Analysis for ${analysisResponse.data.symbol}:`);
        console.log(`⏰ Timeframe: ${analysisResponse.data.timeframe}`);
        console.log(`🚀 Groq LLM Enabled: ${analysisResponse.data.llmEnabled}`);
        console.log(`📝 Analysis: ${analysisResponse.data.analysis.substring(0, 300)}...`);
        console.log('─'.repeat(80) + '\n');
    } catch (error) {
        console.error('❌ Error testing advanced analysis:', error.response?.data || error.message);
    }
    
    // Test trading advice
    try {
        console.log('💹 Testing Trading Advice...');
        const adviceResponse = await axios.post(`${BASE_URL}/advice`, {
            symbol: 'X:BTCUSD',
            accountBalance: 10000,
            riskTolerance: 'medium',
            tradingStyle: 'swing'
        });
        
        console.log(`💼 Trading Advice for ${adviceResponse.data.symbol}:`);
        console.log(`💰 Account Balance: $${adviceResponse.data.userContext.accountBalance}`);
        console.log(`⚠️ Risk Tolerance: ${adviceResponse.data.userContext.riskTolerance}`);
        console.log(`📈 Trading Style: ${adviceResponse.data.userContext.tradingStyle}`);
        console.log(`🚀 Groq LLM Enabled: ${adviceResponse.data.llmEnabled}`);
        console.log(`💡 Advice: ${adviceResponse.data.advice.substring(0, 300)}...`);
        console.log('─'.repeat(80) + '\n');
    } catch (error) {
        console.error('❌ Error testing trading advice:', error.response?.data || error.message);
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
testLLMChat().catch(console.error); 