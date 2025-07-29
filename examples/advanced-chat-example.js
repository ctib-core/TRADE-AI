import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/v1/advanced-chat';

// Example 1: Basic chat with conversation memory
async function basicChatExample() {
    console.log('\n=== Example 1: Basic Chat with Memory ===');
    
    // First message
    const response1 = await axios.post(BASE_URL, {
        message: 'Hello! I\'m interested in cryptocurrency trading. Can you help me understand Bitcoin?'
    });
    
    console.log('First response:', response1.data.response.substring(0, 150) + '...');
    console.log('Thread ID:', response1.data.threadId);
    
    // Follow-up message using the same thread
    const response2 = await axios.post(BASE_URL, {
        message: 'What was my previous question about?',
        threadId: response1.data.threadId
    });
    
    console.log('Follow-up response:', response2.data.response.substring(0, 150) + '...');
    console.log('Message count:', response2.data.messageCount);
}

// Example 2: Tool calling demonstration
async function toolCallingExample() {
    console.log('\n=== Example 2: Tool Calling ===');
    
    const response = await axios.post(BASE_URL, {
        message: 'Get the current market data for Bitcoin and provide a technical analysis. Also give me trading advice.'
    });
    
    console.log('Tool calling response:', response.data.response.substring(0, 200) + '...');
    console.log('Thread ID:', response.data.threadId);
    console.log('LLM enabled:', response.data.llmEnabled);
}

// Example 3: Specific trading advice
async function tradingAdviceExample() {
    console.log('\n=== Example 3: Trading Advice ===');
    
    const response = await axios.post(`${BASE_URL}/trading-advice`, {
        symbol: 'X:BTCUSD',
        riskTolerance: 'medium',
        accountBalance: 5000
    });
    
    console.log('Trading advice:', response.data.advice.substring(0, 200) + '...');
    console.log('Symbol:', response.data.symbol);
    console.log('Thread ID:', response.data.threadId);
}

// Example 4: Market analysis
async function marketAnalysisExample() {
    console.log('\n=== Example 4: Market Analysis ===');
    
    const response = await axios.post(`${BASE_URL}/market-analysis`, {
        symbol: 'X:ETHUSD',
        timeframe: '1D',
        analysisType: 'comprehensive'
    });
    
    console.log('Market analysis:', response.data.analysis.substring(0, 200) + '...');
    console.log('Symbol:', response.data.symbol);
    console.log('Timeframe:', response.data.timeframe);
}

// Example 5: Price prediction
async function predictionExample() {
    console.log('\n=== Example 5: Price Prediction ===');
    
    const response = await axios.post(`${BASE_URL}/prediction`, {
        symbol: 'X:BTCUSD',
        timeframe: 'short-term'
    });
    
    console.log('Prediction:', response.data.prediction.substring(0, 200) + '...');
    console.log('Symbol:', response.data.symbol);
    console.log('Timeframe:', response.data.timeframe);
}

// Example 6: Streaming response
async function streamingExample() {
    console.log('\n=== Example 6: Streaming Response ===');
    
    try {
        const response = await axios.post(BASE_URL, {
            message: 'Give me a detailed analysis of Ethereum\'s current market position and future outlook.',
            stream: true
        }, {
            responseType: 'stream'
        });
        
        console.log('🔄 Streaming response:');
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
        console.error('Streaming error:', error.message);
    }
}

// Example 7: Service status and tools
async function statusAndToolsExample() {
    console.log('\n=== Example 7: Service Status and Tools ===');
    
    // Get service status
    const statusResponse = await axios.get(`${BASE_URL}/status`);
    console.log('Service status:', statusResponse.data);
    
    // Get available tools
    const toolsResponse = await axios.get(`${BASE_URL}/tools`);
    console.log('Available tools:', toolsResponse.data.tools);
    console.log('Total tools:', toolsResponse.data.totalTools);
}

// Example 8: Conversation history
async function conversationHistoryExample() {
    console.log('\n=== Example 8: Conversation History ===');
    
    // Start a conversation
    const response1 = await axios.post(BASE_URL, {
        message: 'Tell me about Bitcoin'
    });
    
    const threadId = response1.data.threadId;
    
    // Add more messages
    await axios.post(BASE_URL, {
        message: 'What about Ethereum?',
        threadId: threadId
    });
    
    await axios.post(BASE_URL, {
        message: 'Compare Bitcoin and Ethereum',
        threadId: threadId
    });
    
    // Get conversation history
    const historyResponse = await axios.get(`${BASE_URL}/history/${threadId}`);
    console.log('Conversation history:');
    console.log('Thread ID:', historyResponse.data.threadId);
    console.log('Message count:', historyResponse.data.messageCount);
    console.log('Messages:', historyResponse.data.messages.length);
    
    // Clear conversation history
    const clearResponse = await axios.delete(`${BASE_URL}/history/${threadId}`);
    console.log('Clear response:', clearResponse.data.message);
}

// Main function to run all examples
async function runAllExamples() {
    console.log('🚀 Advanced Chatbot Examples\n');
    
    try {
        await basicChatExample();
        await toolCallingExample();
        await tradingAdviceExample();
        await marketAnalysisExample();
        await predictionExample();
        await streamingExample();
        await statusAndToolsExample();
        await conversationHistoryExample();
        
        console.log('\n✅ All examples completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Example failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllExamples();
}

export {
    basicChatExample,
    toolCallingExample,
    tradingAdviceExample,
    marketAnalysisExample,
    predictionExample,
    streamingExample,
    statusAndToolsExample,
    conversationHistoryExample,
    runAllExamples
}; 