import express from 'express';
import Joi from 'joi';
import { validateRequest } from '../middleware/index.js';
import { logger } from '../utils/logger.js';
import polygonService from '../services/polygonService.js';
import CryptoPredictionEngine from '../ml/CryptoPredictionEngine.js';
import llmService from '../services/llmService.js';

const router = express.Router();

// Validation schemas
const chatRequestSchema = Joi.object({
    message: Joi.string().required().min(1).max(1000),
    symbol: Joi.string().pattern(/^X:[A-Z]+USD$/).optional(),
    context: Joi.string().valid('prediction', 'analysis', 'trading', 'general').default('general')
});

// Global prediction engines for chat
const predictionEngines = new Map();

// Chat response templates and logic
const chatResponses = {
    greetings: [
        "Hello! I'm your AI crypto assistant. I can help you with market analysis, predictions, and trading insights.",
        "Hi there! I'm here to help you with cryptocurrency analysis and predictions.",
        "Welcome! I'm your crypto AI assistant. What would you like to know about the markets?"
    ],
    
    predictions: {
        positive: [
            "Based on my analysis, {symbol} shows bullish signals with strong technical indicators.",
            "My models indicate a positive trend for {symbol} in the short term.",
            "The prediction models suggest upward movement for {symbol} with good confidence levels."
        ],
        negative: [
            "My analysis shows bearish signals for {symbol} with weakening technical indicators.",
            "The models indicate a potential downward trend for {symbol}.",
            "Current signals suggest caution for {symbol} with bearish momentum."
        ],
        neutral: [
            "The analysis shows mixed signals for {symbol} with no clear directional bias.",
            "My models indicate sideways movement for {symbol} in the near term.",
            "Technical indicators are neutral for {symbol} with balanced risk/reward."
        ]
    },
    
    analysis: {
        technical: [
            "Technical analysis shows {indicator} levels indicating {trend} momentum.",
            "The {indicator} indicator suggests {trend} pressure on {symbol}.",
            "Based on technical indicators, {symbol} is showing {trend} characteristics."
        ],
        fundamental: [
            "Market fundamentals for {symbol} appear {sentiment} based on recent data.",
            "The overall market sentiment for {symbol} is {sentiment}.",
            "Fundamental analysis indicates {sentiment} outlook for {symbol}."
        ]
    },
    
    trading: {
        advice: [
            "For {symbol}, consider {action} with proper risk management.",
            "My trading recommendation for {symbol} is to {action}.",
            "Based on current market conditions, {action} for {symbol} seems appropriate."
        ],
        risk: [
            "Remember to always use proper risk management and never invest more than you can afford to lose.",
            "Consider setting stop-loss orders and taking profits at predetermined levels.",
            "Diversification is key - don't put all your eggs in one basket."
        ]
    },
    
    errors: [
        "I'm having trouble analyzing that right now. Could you try rephrasing your question?",
        "I need more specific information to provide a helpful analysis.",
        "Let me focus on what I can help you with - crypto predictions and market analysis."
    ]
};

// AI Chat Response Generator
class CryptoChatAI {
    constructor() {
        this.context = {};
        this.conversationHistory = [];
    }

    async generateResponse(message, symbol = null, context = 'general') {
        try {
            const lowerMessage = message.toLowerCase();
            
            // Store conversation context
            this.context.lastMessage = message;
            this.context.symbol = symbol;
            this.context.timestamp = new Date().toISOString();
            
            // Analyze message intent
            const intent = this.analyzeIntent(lowerMessage);
            
            // Use LLM for intelligent response
            const llmResponse = await llmService.generateResponse(message, {
                symbol: symbol,
                context: context,
                intent: intent.type
            });
            
            // Add to conversation history
            this.conversationHistory.push({
                user: message,
                ai: llmResponse,
                timestamp: new Date().toISOString(),
                intent: intent.type,
                llmUsed: llmService.isInitialized
            });
            
            return {
                response: llmResponse,
                intent: intent.type,
                confidence: intent.confidence,
                context: this.context,
                llmEnabled: llmService.isInitialized
            };
            
        } catch (error) {
            logger.error('Chat AI error:', error);
            return {
                response: "I'm experiencing some technical difficulties. Please try again in a moment.",
                intent: 'error',
                confidence: 0,
                context: this.context,
                llmEnabled: false
            };
        }
    }

    analyzeIntent(message) {
        // Greeting detection
        if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
            return { type: 'greeting', confidence: 0.9 };
        }
        
        // Prediction requests
        if (message.includes('predict') || message.includes('forecast') || message.includes('price') || message.includes('trend')) {
            return { type: 'prediction', confidence: 0.8 };
        }
        
        // Analysis requests
        if (message.includes('analyze') || message.includes('analysis') || message.includes('technical') || message.includes('fundamental')) {
            return { type: 'analysis', confidence: 0.8 };
        }
        
        // Trading advice
        if (message.includes('trade') || message.includes('buy') || message.includes('sell') || message.includes('position')) {
            return { type: 'trading', confidence: 0.8 };
        }
        
        // Market data
        if (message.includes('price') || message.includes('market') || message.includes('data') || message.includes('current')) {
            return { type: 'market_data', confidence: 0.7 };
        }
        
        // Help requests
        if (message.includes('help') || message.includes('what can you do') || message.includes('capabilities')) {
            return { type: 'help', confidence: 0.9 };
        }
        
        return { type: 'general', confidence: 0.5 };
    }

    async generateIntentResponse(intent, message, symbol, context) {
        switch (intent.type) {
            case 'greeting':
                return this.getRandomResponse(chatResponses.greetings);
                
            case 'prediction':
                return await this.generatePredictionResponse(message, symbol);
                
            case 'analysis':
                return await this.generateAnalysisResponse(message, symbol);
                
            case 'trading':
                return await this.generateTradingResponse(message, symbol);
                
            case 'market_data':
                return await this.generateMarketDataResponse(message, symbol);
                
            case 'help':
                return this.generateHelpResponse();
                
            default:
                return this.getRandomResponse(chatResponses.errors);
        }
    }

    async generatePredictionResponse(message, symbol) {
        try {
            if (!symbol) {
                symbol = this.extractSymbol(message) || 'X:BTCUSD';
            }
            
            // Get or create prediction engine
            let engine = predictionEngines.get(symbol);
            if (!engine) {
                engine = new CryptoPredictionEngine({ symbol });
                predictionEngines.set(symbol, engine);
            }
            
            // Try to get prediction if model is trained
            if (engine.isTrained) {
                const prediction = await engine.runPrediction();
                const confidence = prediction.prediction.confidence || 0.5;
                
                if (confidence > 0.6) {
                    return this.getRandomResponse(chatResponses.predictions.positive).replace('{symbol}', symbol);
                } else if (confidence < 0.4) {
                    return this.getRandomResponse(chatResponses.predictions.negative).replace('{symbol}', symbol);
                } else {
                    return this.getRandomResponse(chatResponses.predictions.neutral).replace('{symbol}', symbol);
                }
            } else {
                // Get current market data for basic analysis
                const marketData = await polygonService.getRealTimeData(symbol);
                const priceChange = marketData.priceChangePercent;
                
                if (priceChange > 2) {
                    return `Based on current market data, ${symbol} is showing positive momentum with a ${priceChange.toFixed(2)}% increase. However, I recommend training a prediction model for more accurate forecasts.`;
                } else if (priceChange < -2) {
                    return `Current market data shows ${symbol} is experiencing downward pressure with a ${priceChange.toFixed(2)}% decrease. Consider training a prediction model for better insights.`;
                } else {
                    return `The market for ${symbol} appears stable with minimal price movement (${priceChange.toFixed(2)}%). For detailed predictions, I'd need to train a model first.`;
                }
            }
        } catch (error) {
            logger.error('Prediction response error:', error);
            return `I'm having trouble analyzing ${symbol || 'the market'} right now. Please try again or ask me to train a prediction model first.`;
        }
    }

    async generateAnalysisResponse(message, symbol) {
        try {
            if (!symbol) {
                symbol = this.extractSymbol(message) || 'X:BTCUSD';
            }
            
            const marketData = await polygonService.getRealTimeData(symbol);
            const priceChange = marketData.priceChangePercent;
            
            let trend = 'neutral';
            let sentiment = 'balanced';
            
            if (priceChange > 3) {
                trend = 'bullish';
                sentiment = 'positive';
            } else if (priceChange < -3) {
                trend = 'bearish';
                sentiment = 'negative';
            }
            
            return this.getRandomResponse(chatResponses.analysis.technical)
                .replace('{indicator}', 'price action')
                .replace('{trend}', trend)
                .replace('{symbol}', symbol) + 
                ` Current price change: ${priceChange.toFixed(2)}%. Market sentiment appears ${sentiment}.`;
                
        } catch (error) {
            logger.error('Analysis response error:', error);
            return `I'm having trouble analyzing ${symbol || 'the market'} right now. Please check the symbol and try again.`;
        }
    }

    async generateTradingResponse(message, symbol) {
        try {
            if (!symbol) {
                symbol = this.extractSymbol(message) || 'X:BTCUSD';
            }
            
            const marketData = await polygonService.getRealTimeData(symbol);
            const priceChange = marketData.priceChangePercent;
            
            let action = 'monitor the market';
            if (priceChange > 2) {
                action = 'consider taking profits or setting stop-loss orders';
            } else if (priceChange < -2) {
                action = 'wait for better entry points or consider dollar-cost averaging';
            }
            
            const response = this.getRandomResponse(chatResponses.trading.advice)
                .replace('{action}', action)
                .replace('{symbol}', symbol);
                
            return response + ' ' + this.getRandomResponse(chatResponses.trading.risk);
            
        } catch (error) {
            logger.error('Trading response error:', error);
            return `I'm having trouble providing trading advice for ${symbol || 'the market'} right now. Please try again.`;
        }
    }

    async generateMarketDataResponse(message, symbol) {
        try {
            if (!symbol) {
                symbol = this.extractSymbol(message) || 'X:BTCUSD';
            }
            
            const marketData = await polygonService.getRealTimeData(symbol);
            
            return `Current market data for ${symbol}:
• Price: $${marketData.close.toFixed(2)}
• Change: ${marketData.priceChangePercent.toFixed(2)}%
• Volume: ${marketData.volume.toLocaleString()}
• High: $${marketData.high.toFixed(2)}
• Low: $${marketData.low.toFixed(2)}`;
            
        } catch (error) {
            logger.error('Market data response error:', error);
            return `I'm having trouble fetching current market data for ${symbol || 'the market'}. Please try again.`;
        }
    }

    generateHelpResponse() {
        return `I'm your AI crypto assistant! Here's what I can help you with:

🔮 **Predictions**: Ask about price forecasts and trends
📊 **Analysis**: Get technical and fundamental analysis
💹 **Trading**: Receive trading advice and risk management tips
📈 **Market Data**: Get current prices and market information

Examples:
• "What's the prediction for Bitcoin?"
• "Analyze the current market for ETH"
• "Should I buy BTC now?"
• "What's the current price of Bitcoin?"

Just ask me anything about crypto markets!`;
    }

    extractSymbol(message) {
        const symbolPatterns = [
            /bitcoin|btc/i,
            /ethereum|eth/i,
            /cardano|ada/i,
            /polkadot|dot/i,
            /chainlink|link/i
        ];
        
        const symbolMap = {
            'bitcoin': 'X:BTCUSD',
            'btc': 'X:BTCUSD',
            'ethereum': 'X:ETHUSD',
            'eth': 'X:ETHUSD',
            'cardano': 'X:ADAUSD',
            'ada': 'X:ADAUSD',
            'polkadot': 'X:DOTUSD',
            'dot': 'X:DOTUSD',
            'chainlink': 'X:LINKUSD',
            'link': 'X:LINKUSD'
        };
        
        for (const pattern of symbolPatterns) {
            const match = message.match(pattern);
            if (match) {
                const key = match[0].toLowerCase();
                return symbolMap[key] || null;
            }
        }
        
        return null;
    }

    getRandomResponse(responses) {
        return responses[Math.floor(Math.random() * responses.length)];
    }
}

// Initialize chat AI
const chatAI = new CryptoChatAI();

/**
 * POST /api/v1/chat
 * AI Chat endpoint for crypto predictions and market analysis
 */
router.post('/', validateRequest(chatRequestSchema), async (req, res) => {
    try {
        const { message, symbol, context } = req.body;
        
        logger.info(`Chat request received`, { 
            message: message.substring(0, 50) + '...',
            symbol,
            context 
        });
        
        // Generate AI response
        const result = await chatAI.generateResponse(message, symbol, context);
        
        logger.info(`Chat response generated`, { 
            intent: result.intent,
            confidence: result.confidence 
        });
        
        res.json({
            status: 'success',
            response: result.response,
            intent: result.intent,
            confidence: result.confidence,
            context: result.context,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Chat error:', error);
        res.status(500).json({
            error: 'Chat failed',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/chat/history
 * Get conversation history
 */
router.get('/history', async (req, res) => {
    try {
        res.json({
            status: 'success',
            history: chatAI.conversationHistory,
            totalMessages: chatAI.conversationHistory.length
        });
    } catch (error) {
        logger.error('Chat history error:', error);
        res.status(500).json({
            error: 'Failed to get chat history',
            message: error.message
        });
    }
});

/**
 * DELETE /api/v1/chat/history
 * Clear conversation history
 */
router.delete('/history', async (req, res) => {
    try {
        chatAI.conversationHistory = [];
        res.json({
            status: 'success',
            message: 'Chat history cleared'
        });
    } catch (error) {
        logger.error('Clear chat history error:', error);
        res.status(500).json({
            error: 'Failed to clear chat history',
            message: error.message
        });
    }
});

/**
 * POST /api/v1/chat/analyze
 * Advanced market analysis with LLM
 */
router.post('/analyze', validateRequest(Joi.object({
    symbol: Joi.string().required().pattern(/^X:[A-Z]+USD$/),
    timeframe: Joi.string().valid('short-term', 'medium-term', 'long-term').default('short-term'),
    analysisType: Joi.string().valid('technical', 'fundamental', 'comprehensive').default('comprehensive')
})), async (req, res) => {
    try {
        const { symbol, timeframe, analysisType } = req.body;
        
        logger.info(`Advanced analysis request for ${symbol}`, { timeframe, analysisType });
        
        const analysis = await llmService.generateMarketAnalysis(symbol, timeframe);
        
        res.json({
            status: 'success',
            symbol,
            timeframe,
            analysisType,
            analysis,
            llmEnabled: llmService.isInitialized,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Advanced analysis error:', error);
        res.status(500).json({
            error: 'Analysis failed',
            message: error.message
        });
    }
});

/**
 * POST /api/v1/chat/advice
 * Trading advice with LLM
 */
router.post('/advice', validateRequest(Joi.object({
    symbol: Joi.string().required().pattern(/^X:[A-Z]+USD$/),
    accountBalance: Joi.number().positive().optional(),
    riskTolerance: Joi.string().valid('low', 'medium', 'high').default('medium'),
    tradingStyle: Joi.string().valid('scalping', 'day-trading', 'swing', 'position').default('swing')
})), async (req, res) => {
    try {
        const { symbol, accountBalance, riskTolerance, tradingStyle } = req.body;
        
        logger.info(`Trading advice request for ${symbol}`, { riskTolerance, tradingStyle });
        
        const userContext = {
            accountBalance,
            riskTolerance,
            tradingStyle,
            timestamp: new Date().toISOString()
        };
        
        const advice = await llmService.generateTradingAdvice(symbol, null, userContext);
        
        res.json({
            status: 'success',
            symbol,
            advice,
            userContext,
            llmEnabled: llmService.isInitialized,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Trading advice error:', error);
        res.status(500).json({
            error: 'Trading advice failed',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/chat/status
 * Get LLM service status
 */
router.get('/status', async (req, res) => {
    try {
        res.json({
            status: 'success',
            llmEnabled: llmService.isInitialized,
            model: llmService.model,
            maxTokens: llmService.maxTokens,
            temperature: llmService.temperature,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Status check error:', error);
        res.status(500).json({
            error: 'Status check failed',
            message: error.message
        });
    }
});

export default router; 