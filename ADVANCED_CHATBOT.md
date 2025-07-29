# Advanced Chatbot with LangGraph

This document describes the advanced chatbot implementation using LangGraph, which provides conversation memory, tool calling, and streaming capabilities.

## Overview

The advanced chatbot is built using LangGraph and integrates with the existing crypto prediction system. It features:

- **Conversation Memory**: Persistent chat history across sessions
- **Tool Calling**: Access to market data, predictions, and analysis tools
- **Streaming Responses**: Real-time response streaming
- **Multi-thread Support**: Separate conversation threads for different users
- **Advanced LLM Integration**: Powered by Groq with LangChain

## Architecture

### Components

1. **AdvancedChatService** (`src/services/advancedChatService.js`)
   - LangGraph state management
   - Tool definitions and execution
   - Conversation memory with checkpoints
   - Streaming support

2. **AdvancedChatRoutes** (`src/routes/advancedChat.js`)
   - REST API endpoints
   - Request validation
   - Response formatting

3. **Tools Available**:
   - `get_market_data`: Retrieve real-time market data
   - `get_prediction`: Get AI-powered price predictions
   - `technical_analysis`: Perform technical analysis
   - `trading_advice`: Generate trading recommendations

## API Endpoints

### Base URL
```
http://localhost:3000/api/v1/advanced-chat
```

### 1. Chat Endpoint
**POST** `/`

Send a message and get a response with optional streaming.

**Request Body:**
```json
{
  "message": "What's the current price of Bitcoin?",
  "threadId": "optional-thread-id",
  "stream": false
}
```

**Response:**
```json
{
  "status": "success",
  "response": "Based on current market data...",
  "threadId": "uuid-thread-id",
  "messageCount": 2,
  "llmEnabled": true,
  "timestamp": "2025-07-27T16:30:00.000Z"
}
```

### 2. Trading Advice
**POST** `/trading-advice`

Get personalized trading advice.

**Request Body:**
```json
{
  "symbol": "X:BTCUSD",
  "riskTolerance": "medium",
  "accountBalance": 10000
}
```

**Response:**
```json
{
  "status": "success",
  "symbol": "X:BTCUSD",
  "advice": "Based on current market conditions...",
  "threadId": "uuid-thread-id",
  "llmEnabled": true,
  "timestamp": "2025-07-27T16:30:00.000Z"
}
```

### 3. Market Analysis
**POST** `/market-analysis`

Get comprehensive market analysis.

**Request Body:**
```json
{
  "symbol": "X:ETHUSD",
  "timeframe": "1D",
  "analysisType": "comprehensive"
}
```

**Response:**
```json
{
  "status": "success",
  "symbol": "X:ETHUSD",
  "timeframe": "1D",
  "analysisType": "comprehensive",
  "analysis": "Technical analysis shows...",
  "threadId": "uuid-thread-id",
  "llmEnabled": true,
  "timestamp": "2025-07-27T16:30:00.000Z"
}
```

### 4. Price Prediction
**POST** `/prediction`

Get AI-powered price predictions.

**Request Body:**
```json
{
  "symbol": "X:BTCUSD",
  "timeframe": "short-term"
}
```

**Response:**
```json
{
  "status": "success",
  "symbol": "X:BTCUSD",
  "timeframe": "short-term",
  "prediction": "Based on our AI models...",
  "threadId": "uuid-thread-id",
  "llmEnabled": true,
  "timestamp": "2025-07-27T16:30:00.000Z"
}
```

### 5. Conversation History
**GET** `/history/:threadId`

Retrieve conversation history for a specific thread.

**Response:**
```json
{
  "status": "success",
  "threadId": "uuid-thread-id",
  "messages": [...],
  "messageCount": 5,
  "timestamp": "2025-07-27T16:30:00.000Z"
}
```

### 6. Clear History
**DELETE** `/history/:threadId`

Clear conversation history for a specific thread.

**Response:**
```json
{
  "status": "success",
  "message": "Conversation history cleared",
  "threadId": "uuid-thread-id"
}
```

### 7. Service Status
**GET** `/status`

Get service status and configuration.

**Response:**
```json
{
  "status": "success",
  "service": "Advanced Chat (LangGraph)",
  "isInitialized": true,
  "model": "llama3-70b-8192",
  "maxTokens": 2000,
  "temperature": 0.7,
  "activeThreads": 5,
  "timestamp": "2025-07-27T16:30:00.000Z"
}
```

### 8. Available Tools
**GET** `/tools`

Get list of available tools.

**Response:**
```json
{
  "status": "success",
  "tools": [
    {
      "name": "get_market_data",
      "description": "Retrieve current market data for a cryptocurrency symbol",
      "parameters": {
        "symbol": "string (format: X:XXXUSD)"
      }
    },
    ...
  ],
  "totalTools": 4,
  "timestamp": "2025-07-27T16:30:00.000Z"
}
```

## Usage Examples

### Basic Chat
```javascript
const response = await fetch('/api/v1/advanced-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'What\'s the current Bitcoin price?'
  })
});

const data = await response.json();
console.log(data.response);
```

### Streaming Chat
```javascript
const response = await fetch('/api/v1/advanced-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Analyze Ethereum\'s market position',
    stream: true
  })
});

const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  process.stdout.write(value);
}
```

### Conversation with Memory
```javascript
let threadId = null;

// First message
const response1 = await fetch('/api/v1/advanced-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'I\'m interested in Bitcoin trading'
  })
});

const data1 = await response1.json();
threadId = data1.threadId;

// Follow-up message (uses memory)
const response2 = await fetch('/api/v1/advanced-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'What was my previous question about?',
    threadId: threadId
  })
});

const data2 = await response2.json();
console.log(data2.response); // Will reference the previous conversation
```

## Tool Calling Examples

The chatbot can automatically call tools based on user requests:

### Market Data Request
```
User: "What's the current price of Bitcoin?"
Bot: [Calls get_market_data tool] "Current market data for X:BTCUSD: Price: $43,250.00, Change: +2.5%..."
```

### Prediction Request
```
User: "Can you predict Bitcoin's price?"
Bot: [Calls get_prediction tool] "Based on our AI models, Bitcoin is predicted to..."
```

### Technical Analysis Request
```
User: "Perform technical analysis on Ethereum"
Bot: [Calls technical_analysis tool] "Technical Analysis for X:ETHUSD: Current Price: $2,850.00..."
```

### Trading Advice Request
```
User: "Should I buy Bitcoin now?"
Bot: [Calls trading_advice tool] "Trading Advice for X:BTCUSD: Recommendation: consider taking profits..."
```

## Configuration

### Environment Variables

```bash
# Required for LLM functionality
GROQ_API_KEY=your-groq-api-key

# Optional configuration
GROQ_MODEL=llama3-70b-8192
GROQ_MAX_TOKENS=2000
GROQ_TEMPERATURE=0.7
```

### Features

1. **Conversation Memory**: Each thread maintains its own conversation history
2. **Tool Calling**: Automatic tool selection based on user intent
3. **Streaming**: Real-time response streaming for better UX
4. **Error Handling**: Graceful fallbacks when tools or LLM fail
5. **Validation**: Request validation with Joi schemas
6. **Logging**: Comprehensive logging for debugging

## Testing

Run the test script to verify functionality:

```bash
node test-advanced-chat.js
```

This will test:
- Basic chat functionality
- Conversation memory
- Tool calling
- Streaming responses
- Specific endpoints (trading advice, market analysis, predictions)
- Service status and tools info

## Integration with Existing System

The advanced chatbot integrates seamlessly with the existing crypto prediction system:

- Uses the same `polygonService` for market data
- Leverages `CryptoPredictionEngine` for predictions
- Maintains compatibility with existing chat endpoints
- Shares the same logging and validation infrastructure

## Benefits over Basic Chat

1. **Conversation Memory**: Remembers previous interactions
2. **Tool Calling**: Can access real-time data and perform analysis
3. **Streaming**: Real-time responses for better user experience
4. **Multi-thread Support**: Separate conversations for different users
5. **Advanced LLM**: More sophisticated responses with context awareness
6. **Extensible**: Easy to add new tools and capabilities

## Troubleshooting

### Common Issues

1. **LLM Not Initialized**: Check `GROQ_API_KEY` environment variable
2. **Tool Errors**: Verify market data services are running
3. **Memory Issues**: Check available system memory for large conversations
4. **Streaming Issues**: Ensure client supports streaming responses

### Debug Mode

Enable detailed logging by setting:
```bash
NODE_ENV=development
```

## Future Enhancements

1. **More Tools**: Add sentiment analysis, news integration
2. **Custom Prompts**: Allow users to customize system prompts
3. **WebSocket Support**: Real-time bidirectional communication
4. **Database Persistence**: Store conversations in database
5. **User Authentication**: Secure conversation threads
6. **Analytics**: Track usage patterns and tool effectiveness 