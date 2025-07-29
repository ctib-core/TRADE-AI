# 🚀 Groq + LangChain Setup Guide

## Why Groq?

- **⚡ Lightning Fast**: 10-100x faster than OpenAI
- **💰 Cost Effective**: Much cheaper than GPT-4
- **🧠 Powerful Models**: Llama3-70B, Mixtral, and more
- **🔒 Privacy**: No data retention
- **🌐 Global**: Available worldwide

## Setup Instructions

### 1. Get Groq API Key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `gsk_`)

### 2. Configure Environment

Add to your `.env` file:

```bash
# Groq Configuration
GROQ_API_KEY=gsk_your_api_key_here
GROQ_MODEL=llama3-70b-8192
GROQ_MAX_TOKENS=1000
GROQ_TEMPERATURE=0.7
```

### 3. Install Dependencies

```bash
npm install langchain @langchain/groq
```

### 4. Test the Setup

```bash
# Test basic chat
npm run test:llm

# Test with curl
curl -X POST http://localhost:3000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is your analysis of Bitcoin?"}'
```

## Available Groq Models

### Recommended Models:

- **`llama3-70b-8192`** - Best performance, 70B parameters
- **`mixtral-8x7b-32768`** - Fast, good quality
- **`llama3-8b-8192`** - Fastest, smaller model

### Model Comparison:

| Model | Speed | Quality | Cost | Use Case |
|-------|-------|---------|------|----------|
| llama3-70b-8192 | ⚡⚡⚡ | 🧠🧠🧠 | 💰💰 | Best analysis |
| mixtral-8x7b-32768 | ⚡⚡⚡⚡ | 🧠🧠 | 💰 | Fast responses |
| llama3-8b-8192 | ⚡⚡⚡⚡⚡ | 🧠 | 💰 | Quick queries |

## API Endpoints

### Basic Chat
```bash
POST /api/v1/chat
{
  "message": "What's your analysis of Bitcoin?",
  "symbol": "X:BTCUSD",
  "context": "analysis"
}
```

### Advanced Analysis
```bash
POST /api/v1/chat/analyze
{
  "symbol": "X:BTCUSD",
  "timeframe": "short-term",
  "analysisType": "comprehensive"
}
```

### Trading Advice
```bash
POST /api/v1/chat/advice
{
  "symbol": "X:BTCUSD",
  "accountBalance": 10000,
  "riskTolerance": "medium",
  "tradingStyle": "swing"
}
```

### Check Status
```bash
GET /api/v1/chat/status
```

## Benefits Over OpenAI

### Speed
- **Groq**: 100-500ms response time
- **OpenAI**: 2-10 seconds response time

### Cost
- **Groq**: ~$0.0001 per 1K tokens
- **OpenAI GPT-4**: ~$0.03 per 1K tokens

### Features
- ✅ Real-time market data integration
- ✅ Specialized crypto analysis
- ✅ Trading advice with risk management
- ✅ Technical and fundamental analysis
- ✅ Position sizing recommendations

## Troubleshooting

### Common Issues:

1. **"GROQ_API_KEY not set"**
   - Check your `.env` file
   - Ensure the key starts with `gsk_`

2. **"Failed to initialize LLM service"**
   - Verify your API key is valid
   - Check internet connection

3. **Slow responses**
   - Try a smaller model like `llama3-8b-8192`
   - Reduce `maxTokens` in config

### Performance Tips:

1. **Use appropriate model size**:
   - Quick queries: `llama3-8b-8192`
   - Detailed analysis: `llama3-70b-8192`

2. **Optimize temperature**:
   - Factual responses: `0.3`
   - Creative analysis: `0.7`

3. **Set reasonable max tokens**:
   - Short responses: `500`
   - Detailed analysis: `1000`

## Example Usage

### Basic Chat
```javascript
const response = await fetch('http://localhost:3000/api/v1/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "What's the current market sentiment for Bitcoin?",
    symbol: "X:BTCUSD"
  })
});
```

### Advanced Analysis
```javascript
const analysis = await fetch('http://localhost:3000/api/v1/chat/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    symbol: "X:BTCUSD",
    timeframe: "short-term",
    analysisType: "comprehensive"
  })
});
```

## Security Notes

- 🔒 Never commit your API key to version control
- 🔒 Use environment variables for all secrets
- 🔒 Monitor your API usage in Groq console
- 🔒 Set up rate limiting for production use

## Support

- 📚 [Groq Documentation](https://console.groq.com/docs)
- 📚 [LangChain Documentation](https://js.langchain.com/)
- 🐛 [Report Issues](https://github.com/your-repo/issues) 