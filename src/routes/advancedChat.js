import express from 'express';
import Joi from 'joi';
import { validateRequest } from '../middleware/index.js';
import { logger } from '../utils/logger.js';
import advancedChatService from '../services/advancedChatService.js';

const router = express.Router();

// Validation schemas
const advancedChatRequestSchema = Joi.object({
    message: Joi.string().required().min(1).max(2000),
    threadId: Joi.string().optional(),
    stream: Joi.boolean().default(false)
});

const tradingAdviceRequestSchema = Joi.object({
    symbol: Joi.string().required().pattern(/^X:[A-Z]+USD$/),
    riskTolerance: Joi.string().valid('low', 'medium', 'high').default('medium'),
    accountBalance: Joi.number().positive().optional()
});

/**
 * POST /api/v1/advanced-chat
 * Advanced AI Chat endpoint with LangGraph, conversation memory, and tool calling
 */
router.post('/', validateRequest(advancedChatRequestSchema), async (req, res) => {
    try {
        const { message, threadId, stream } = req.body;
        
        logger.info(`Advanced chat request received`, { 
            message: message.substring(0, 50) + '...',
            threadId: threadId || 'new',
            stream 
        });
        
        if (stream) {
            // Handle streaming response
            const { stream: chatStream, threadId: responseThreadId, llmEnabled } = await advancedChatService.streamMessage(message, threadId);
            
            res.setHeader('Content-Type', 'text/plain');
            res.setHeader('Transfer-Encoding', 'chunked');
            
            let responseContent = '';
            
            for await (const step of chatStream) {
                const lastMessage = step.messages[step.messages.length - 1];
                if (lastMessage && lastMessage.content) {
                    responseContent += lastMessage.content;
                    res.write(lastMessage.content);
                }
            }
            
            res.end();
            
            logger.info(`Advanced chat stream completed`, { 
                threadId: responseThreadId,
                responseLength: responseContent.length,
                llmEnabled 
            });
            
        } else {
            // Handle regular response
            const result = await advancedChatService.processMessage(message, threadId);
            
            logger.info(`Advanced chat response generated`, { 
                threadId: result.threadId,
                messageCount: result.messageCount,
                llmEnabled: result.llmEnabled 
            });
            
            res.json({
                status: 'success',
                response: result.response,
                threadId: result.threadId,
                messageCount: result.messageCount,
                llmEnabled: result.llmEnabled,
                timestamp: result.timestamp
            });
        }
        
    } catch (error) {
        logger.error('Advanced chat error:', error);
        res.status(500).json({
            error: 'Advanced chat failed',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/advanced-chat/history/:threadId
 * Get conversation history for a specific thread
 */
router.get('/history/:threadId', async (req, res) => {
    try {
        const { threadId } = req.params;
        
        logger.info(`Getting conversation history for thread`, { threadId });
        
        const history = await advancedChatService.getConversationHistory(threadId);
        
        res.json({
            status: 'success',
            threadId: history.threadId,
            messages: history.messages,
            messageCount: history.messages.length,
            timestamp: history.timestamp
        });
        
    } catch (error) {
        logger.error('Get conversation history error:', error);
        res.status(500).json({
            error: 'Failed to get conversation history',
            message: error.message
        });
    }
});

/**
 * DELETE /api/v1/advanced-chat/history/:threadId
 * Clear conversation history for a specific thread
 */
router.delete('/history/:threadId', async (req, res) => {
    try {
        const { threadId } = req.params;
        
        logger.info(`Clearing conversation history for thread`, { threadId });
        
        const result = await advancedChatService.clearConversationHistory(threadId);
        
        if (result.success) {
            res.json({
                status: 'success',
                message: result.message,
                threadId: result.threadId
            });
        } else {
            res.status(500).json({
                error: 'Failed to clear conversation history',
                message: result.error
            });
        }
        
    } catch (error) {
        logger.error('Clear conversation history error:', error);
        res.status(500).json({
            error: 'Failed to clear conversation history',
            message: error.message
        });
    }
});

/**
 * POST /api/v1/advanced-chat/trading-advice
 * Get trading advice using the advanced chat system
 */
router.post('/trading-advice', validateRequest(tradingAdviceRequestSchema), async (req, res) => {
    try {
        const { symbol, riskTolerance, accountBalance } = req.body;
        
        logger.info(`Trading advice request via advanced chat`, { symbol, riskTolerance });
        
        const message = `Please provide trading advice for ${symbol}. My risk tolerance is ${riskTolerance}${accountBalance ? ` and my account balance is $${accountBalance}` : ''}.`;
        
        const result = await advancedChatService.processMessage(message);
        
        res.json({
            status: 'success',
            symbol,
            advice: result.response,
            threadId: result.threadId,
            llmEnabled: result.llmEnabled,
            timestamp: result.timestamp
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
 * POST /api/v1/advanced-chat/market-analysis
 * Get market analysis using the advanced chat system
 */
router.post('/market-analysis', validateRequest(Joi.object({
    symbol: Joi.string().required().pattern(/^X:[A-Z]+USD$/),
    timeframe: Joi.string().valid('1H', '1D', '1W', '1M').default('1D'),
    analysisType: Joi.string().valid('technical', 'fundamental', 'comprehensive').default('comprehensive')
})), async (req, res) => {
    try {
        const { symbol, timeframe, analysisType } = req.body;
        
        logger.info(`Market analysis request via advanced chat`, { symbol, timeframe, analysisType });
        
        const message = `Please provide a ${analysisType} market analysis for ${symbol} with focus on ${timeframe} timeframe.`;
        
        const result = await advancedChatService.processMessage(message);
        
        res.json({
            status: 'success',
            symbol,
            timeframe,
            analysisType,
            analysis: result.response,
            threadId: result.threadId,
            llmEnabled: result.llmEnabled,
            timestamp: result.timestamp
        });
        
    } catch (error) {
        logger.error('Market analysis error:', error);
        res.status(500).json({
            error: 'Market analysis failed',
            message: error.message
        });
    }
});

/**
 * POST /api/v1/advanced-chat/prediction
 * Get price prediction using the advanced chat system
 */
router.post('/prediction', validateRequest(Joi.object({
    symbol: Joi.string().required().pattern(/^X:[A-Z]+USD$/),
    timeframe: Joi.string().valid('short-term', 'medium-term', 'long-term').default('short-term')
})), async (req, res) => {
    try {
        const { symbol, timeframe } = req.body;
        
        logger.info(`Prediction request via advanced chat`, { symbol, timeframe });
        
        const message = `Please provide a ${timeframe} price prediction for ${symbol}. Include confidence levels and key factors influencing the prediction.`;
        
        const result = await advancedChatService.processMessage(message);
        
        res.json({
            status: 'success',
            symbol,
            timeframe,
            prediction: result.response,
            threadId: result.threadId,
            llmEnabled: result.llmEnabled,
            timestamp: result.timestamp
        });
        
    } catch (error) {
        logger.error('Prediction error:', error);
        res.status(500).json({
            error: 'Prediction failed',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/advanced-chat/status
 * Get advanced chat service status
 */
router.get('/status', async (req, res) => {
    try {
        const status = advancedChatService.getStatus();
        
        res.json({
            status: 'success',
            service: 'Advanced Chat (LangGraph)',
            ...status
        });
        
    } catch (error) {
        logger.error('Status check error:', error);
        res.status(500).json({
            error: 'Status check failed',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/advanced-chat/tools
 * Get available tools for the advanced chat system
 */
router.get('/tools', async (req, res) => {
    try {
        const tools = [
            {
                name: 'get_market_data',
                description: 'Retrieve current market data for a cryptocurrency symbol',
                parameters: {
                    symbol: 'string (format: X:XXXUSD)'
                }
            },
            {
                name: 'get_prediction',
                description: 'Get AI-powered price prediction for a cryptocurrency symbol',
                parameters: {
                    symbol: 'string (format: X:XXXUSD)'
                }
            },
            {
                name: 'technical_analysis',
                description: 'Perform technical analysis for a cryptocurrency symbol',
                parameters: {
                    symbol: 'string (format: X:XXXUSD)',
                    timeframe: 'string (optional, e.g., 1H, 1D, 1W)'
                }
            },
            {
                name: 'trading_advice',
                description: 'Get trading advice for a cryptocurrency symbol',
                parameters: {
                    symbol: 'string (format: X:XXXUSD)',
                    riskTolerance: 'string (optional: low, medium, high)',
                    accountBalance: 'number (optional)'
                }
            }
        ];
        
        res.json({
            status: 'success',
            tools,
            totalTools: tools.length,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Tools info error:', error);
        res.status(500).json({
            error: 'Failed to get tools info',
            message: error.message
        });
    }
});

export default router; 