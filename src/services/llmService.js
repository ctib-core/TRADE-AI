import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { logger } from '../utils/logger.js';
import polygonService from './polygonService.js';

class LLMService {
    constructor() {
        this.groq = null;
        this.isInitialized = false;
        this.model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
        this.maxTokens = parseInt(process.env.GROQ_MAX_TOKENS) || 1000;
        this.temperature = parseFloat(process.env.GROQ_TEMPERATURE) || 0.7;
        
        this.initialize();
    }

    initialize() {
        try {
            const apiKey = process.env.GROQ_API_KEY;
            if (!apiKey) {
                logger.warn('GROQ_API_KEY not set. LLM features will be disabled.');
                return;
            }

            this.groq = new ChatGroq({
                apiKey: apiKey,
                model: this.model,
                maxTokens: this.maxTokens,
                temperature: this.temperature
            });

            this.isInitialized = true;
            logger.info('✅ LLM Service (Groq) initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize LLM service:', error);
            this.isInitialized = false;
        }
    }

    async generateResponse(message, context = {}) {
        if (!this.isInitialized || !this.groq) {
            return this.getFallbackResponse(message);
        }

        try {
            // Get market data for context
            const marketData = await this.getMarketContext(context.symbol);
            
            // Create system prompt
            const systemPrompt = this.createSystemPrompt(marketData);
            
            // Create user message with context
            const userMessage = this.createUserMessage(message, context);
            
            const messages = [
                new SystemMessage(systemPrompt),
                new HumanMessage(userMessage)
            ];
            
            const response = await this.groq.invoke(messages);
            
            const aiResponse = response.content;
            
            if (!aiResponse) {
                throw new Error('No response from Groq');
            }

            logger.info('LLM response generated successfully');
            return aiResponse;

        } catch (error) {
            logger.error('LLM generation error:', error);
            return this.getFallbackResponse(message);
        }
    }

    async getMarketContext(symbol = 'X:BTCUSD') {
        try {
            const marketData = await polygonService.getRealTimeData(symbol);
            return {
                symbol: marketData.symbol,
                price: marketData.close,
                change: marketData.priceChangePercent,
                volume: marketData.volume,
                high: marketData.high,
                low: marketData.low,
                timestamp: marketData.timestamp
            };
        } catch (error) {
            logger.error('Failed to get market context:', error);
            return null;
        }
    }

    createSystemPrompt(marketData) {
        return `You are an expert AI crypto analyst and trading advisor. You have access to real-time market data and can provide intelligent analysis, predictions, and trading advice.

Your capabilities include:
- Real-time market analysis and price predictions
- Technical analysis using indicators (RSI, MACD, Bollinger Bands, etc.)
- Risk management and trading strategy advice
- Fundamental analysis and market sentiment
- Position sizing and portfolio management

Current market context: ${marketData ? JSON.stringify(marketData, null, 2) : 'No market data available'}

Guidelines:
1. Always provide accurate, data-driven analysis
2. Include risk warnings and disclaimers
3. Be specific about timeframes and confidence levels
4. Consider both technical and fundamental factors
5. Provide actionable trading advice when appropriate
6. Always mention that crypto trading involves risk

Respond in a helpful, professional tone. If you don't have enough information, ask for clarification or suggest what additional data would be helpful.`;
    }

    createUserMessage(message, context) {
        let userMessage = message;
        
        if (context.symbol) {
            userMessage += `\n\nFocus on ${context.symbol} specifically.`;
        }
        
        if (context.context) {
            userMessage += `\n\nContext: ${context.context}`;
        }
        
        return userMessage;
    }

    getFallbackResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
            return "Hello! I'm your AI crypto assistant. I can help you with market analysis, predictions, and trading insights. However, I'm currently running in fallback mode without full LLM capabilities. For the best experience, please set up your Groq API key.";
        }
        
        if (lowerMessage.includes('prediction') || lowerMessage.includes('forecast')) {
            return "I'd love to provide detailed predictions, but I'm currently running in fallback mode. To get intelligent, AI-powered predictions, please configure your Groq API key in the environment variables.";
        }
        
        if (lowerMessage.includes('analysis') || lowerMessage.includes('analyze')) {
            return "For comprehensive market analysis, I need access to advanced AI capabilities. Please set up your Groq API key to enable full LLM-powered analysis.";
        }
        
        return "I'm here to help with crypto analysis and predictions! However, I'm currently running in basic mode. For intelligent, AI-powered responses, please configure your Groq API key in the environment variables.";
    }

    async generatePredictionAnalysis(symbol, predictionData) {
        if (!this.isInitialized) {
            return this.getFallbackResponse("prediction");
        }

        try {
            const marketData = await this.getMarketContext(symbol);
            
            const prompt = `Analyze the following prediction data for ${symbol}:

Market Data: ${JSON.stringify(marketData, null, 2)}
Prediction Data: ${JSON.stringify(predictionData, null, 2)}

Please provide:
1. Analysis of the prediction confidence and reliability
2. Key factors influencing this prediction
3. Risk assessment and potential scenarios
4. Trading recommendations based on this data
5. Timeframe considerations

Be specific, data-driven, and include appropriate risk warnings.`;

            const messages = [
                new SystemMessage(this.createSystemPrompt(marketData)),
                new HumanMessage(prompt)
            ];
            
            const response = await this.groq.invoke(messages);
            
            return response.content || "Unable to generate prediction analysis.";

        } catch (error) {
            logger.error('Prediction analysis error:', error);
            return this.getFallbackResponse("prediction");
        }
    }

    async generateTradingAdvice(symbol, marketData, userContext = {}) {
        if (!this.isInitialized) {
            return this.getFallbackResponse("trading");
        }

        try {
            const currentMarketData = await this.getMarketContext(symbol);
            
            const prompt = `Provide comprehensive trading advice for ${symbol}:

Current Market Data: ${JSON.stringify(currentMarketData, null, 2)}
User Context: ${JSON.stringify(userContext, null, 2)}

Please provide:
1. Current market analysis and trend assessment
2. Entry/exit recommendations with specific price levels
3. Risk management strategies including stop-loss and take-profit levels
4. Position sizing advice
5. Key factors to monitor
6. Potential risks and warnings

Be specific, actionable, and always emphasize risk management.`;

            const messages = [
                new SystemMessage(this.createSystemPrompt(currentMarketData)),
                new HumanMessage(prompt)
            ];
            
            const response = await this.groq.invoke(messages);
            
            return response.content || "Unable to generate trading advice.";

        } catch (error) {
            logger.error('Trading advice error:', error);
            return this.getFallbackResponse("trading");
        }
    }

    async generateMarketAnalysis(symbol, timeframe = 'short-term') {
        if (!this.isInitialized) {
            return this.getFallbackResponse("analysis");
        }

        try {
            const marketData = await this.getMarketContext(symbol);
            
            const prompt = `Provide a comprehensive market analysis for ${symbol} with focus on ${timeframe} outlook:

Market Data: ${JSON.stringify(marketData, null, 2)}

Please include:
1. Technical analysis with key support/resistance levels
2. Fundamental factors affecting the price
3. Market sentiment analysis
4. Volume and volatility assessment
5. Key indicators and their implications
6. Potential catalysts and events to watch
7. Risk factors and market uncertainties

Provide specific, actionable insights with clear reasoning.`;

            const messages = [
                new SystemMessage(this.createSystemPrompt(marketData)),
                new HumanMessage(prompt)
            ];
            
            const response = await this.groq.invoke(messages);
            
            return response.content || "Unable to generate market analysis.";

        } catch (error) {
            logger.error('Market analysis error:', error);
            return this.getFallbackResponse("analysis");
        }
    }
}

// Export singleton instance
const llmService = new LLMService();
export default llmService; 