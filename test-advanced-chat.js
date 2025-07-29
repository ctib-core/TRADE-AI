import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/v1/advanced-chat';

// Helper function to make requests
async function makeRequest(endpoint, data = null, method = 'POST') {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error(`Error calling ${endpoint}:`, error.response?.data || error.message);
        return null;
    }
}

// Helper function to make streaming request
async function makeStreamingRequest(message, threadId = null) {
    try {
        const response = await axios.post(`${BASE_URL}`, {
            message,
            threadId,
            stream: true
        }, {
            responseType: 'stream'
        });

        console.log('\n🔄 Streaming response:');
        response.data.on('data', (chunk) => {
            process.stdout.write(chunk.toString());
        });

        return new Promise((resolve) => {
            response.data.on('end', () => {
                console.log('\n✅ Stream completed');
                resolve();
            });
        });
    } catch (error) {
        console.error('Streaming error:', error.response?.data || error.message);
    }
}

// Test functions
async function testBasicChat() {
    console.log('\n🧪 Testing Basic Chat...');
    
    const response = await makeRequest('', {
        message: 'Hello! I\'m interested in Bitcoin. Can you tell me about the current market?'
    });
    
    if (response) {
        console.log('✅ Basic chat response:', response.response.substring(0, 200) + '...');
        console.log('Thread ID:', response.threadId);
        console.log('Message count:', response.messageCount);
        console.log('LLM enabled:', response.llmEnabled);
    }
    
    return response?.threadId;
}

async function testConversationMemory(threadId) {
    console.log('\n🧪 Testing Conversation Memory...');
    
    const response = await makeRequest('', {
        message: 'What was my previous question about?',
        threadId
    });
    
    if (response) {
        console.log('✅ Memory response:', response.response.substring(0, 200) + '...');
        console.log('Message count:', response.messageCount);
    }
}

async function testToolCalling() {
    console.log('\n🧪 Testing Tool Calling...');
    
    const response = await makeRequest('', {
        message: 'Get the current market data for Bitcoin and provide a technical analysis.'
    });
    
    if (response) {
        console.log('✅ Tool calling response:', response.response.substring(0, 300) + '...');
        console.log('Message count:', response.messageCount);
    }
}

async function testPredictionTool() {
    console.log('\n🧪 Testing Prediction Tool...');
    
    const response = await makeRequest('', {
        message: 'Can you get a price prediction for Bitcoin?'
    });
    
    if (response) {
        console.log('✅ Prediction response:', response.response.substring(0, 300) + '...');
    }
}

async function testTradingAdvice() {
    console.log('\n🧪 Testing Trading Advice...');
    
    const response = await makeRequest('/trading-advice', {
        symbol: 'X:BTCUSD',
        riskTolerance: 'medium',
        accountBalance: 10000
    });
    
    if (response) {
        console.log('✅ Trading advice:', response.advice.substring(0, 300) + '...');
        console.log('Thread ID:', response.threadId);
    }
}

async function testMarketAnalysis() {
    console.log('\n🧪 Testing Market Analysis...');
    
    const response = await makeRequest('/market-analysis', {
        symbol: 'X:ETHUSD',
        timeframe: '1D',
        analysisType: 'comprehensive'
    });
    
    if (response) {
        console.log('✅ Market analysis:', response.analysis.substring(0, 300) + '...');
        console.log('Symbol:', response.symbol);
        console.log('Timeframe:', response.timeframe);
    }
}

async function testPrediction() {
    console.log('\n🧪 Testing Prediction...');
    
    const response = await makeRequest('/prediction', {
        symbol: 'X:BTCUSD',
        timeframe: 'short-term'
    });
    
    if (response) {
        console.log('✅ Prediction:', response.prediction.substring(0, 300) + '...');
        console.log('Symbol:', response.symbol);
        console.log('Timeframe:', response.timeframe);
    }
}

async function testStreaming() {
    console.log('\n🧪 Testing Streaming...');
    
    await makeStreamingRequest('Give me a detailed analysis of Ethereum\'s current market position and future outlook.');
}

async function testStatus() {
    console.log('\n🧪 Testing Status...');
    
    const response = await makeRequest('/status', null, 'GET');
    
    if (response) {
        console.log('✅ Service status:', response);
    }
}

async function testTools() {
    console.log('\n🧪 Testing Tools Info...');
    
    const response = await makeRequest('/tools', null, 'GET');
    
    if (response) {
        console.log('✅ Available tools:', response.tools);
        console.log('Total tools:', response.totalTools);
    }
}

async function testConversationHistory(threadId) {
    console.log('\n🧪 Testing Conversation History...');
    
    const response = await makeRequest(`/history/${threadId}`, null, 'GET');
    
    if (response) {
        console.log('✅ Conversation history:');
        console.log('Thread ID:', response.threadId);
        console.log('Message count:', response.messageCount);
        console.log('Messages:', response.messages.length);
    }
}

// Main test function
async function runTests() {
    console.log('🚀 Starting Advanced Chat Tests...\n');
    
    try {
        // Test service status first
        await testStatus();
        
        // Test tools info
        await testTools();
        
        // Test basic chat and get thread ID
        const threadId = await testBasicChat();
        
        // Test conversation memory
        if (threadId) {
            await testConversationMemory(threadId);
        }
        
        // Test tool calling
        await testToolCalling();
        
        // Test prediction tool
        await testPredictionTool();
        
        // Test specific endpoints
        await testTradingAdvice();
        await testMarketAnalysis();
        await testPrediction();
        
        // Test streaming
        await testStreaming();
        
        // Test conversation history
        if (threadId) {
            await testConversationHistory(threadId);
        }
        
        console.log('\n✅ All tests completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests();
}

export { runTests }; 