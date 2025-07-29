import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StateGraph, MessagesAnnotation, MemorySaver } from '@langchain/langgraph';
import { ToolNode, toolsCondition } from '@langchain/langgraph/prebuilt';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import polygonService from './polygonService.js';
import CryptoPredictionEngine from '../ml/CryptoPredictionEngine.js';

class AdvancedChatService {
    constructor() {
        this.groq = null;
        this.isInitialized = false;
        this.model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
        this.maxTokens = parseInt(process.env.GROQ_MAX_TOKENS) || 2000;
        this.temperature = parseFloat(process.env.GROQ_TEMPERATURE) || 0.7;
        
        this.checkpointer = new MemorySaver();
        this.conversationThreads = new Map();
        
        this.initialize();
        this.setupTools();
        this.setupGraph();
    }

    initialize() {
        try {
            const apiKey = process.env.GROQ_API_KEY;
            if (!apiKey) {
                logger.warn('GROQ_API_KEY not set. Advanced chat features will be disabled.');
                return;
            }

            this.groq = new ChatGroq({
                apiKey: apiKey,
                model: this.model,
                maxTokens: this.maxTokens,
                temperature: this.temperature
            });

            this.isInitialized = true;
            logger.info('✅ Advanced Chat Service (LangGraph) initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Advanced Chat service:', error);
            this.isInitialized = false;
        }
    }

    setupTools() {
        // Market data retrieval tool
        this.marketDataTool = tool(
            async ({ symbol }) => {
                try {
                    const marketData = await polygonService.getRealTimeData(symbol);
                    const serialized = `Current market data for ${symbol}:
• Price: $${marketData.close.toFixed(2)}
• Change: ${marketData.priceChangePercent.toFixed(2)}%
• Volume: ${marketData.volume.toLocaleString()}
• High: $${marketData.high.toFixed(2)}
• Low: $${marketData.low.toFixed(2)}
• Timestamp: ${marketData.timestamp}`;
                    
                    return [serialized, marketData];
                } catch (error) {
                    logger.error('Market data tool error:', error);
                    return [`Failed to fetch market data for ${symbol}`, null];
                }
            },
            {
                name: "get_market_data",
                description: "Retrieve current market data for a cryptocurrency symbol (e.g., X:BTCUSD, X:ETHUSD)",
                schema: z.object({
                    symbol: z.string().describe("Cryptocurrency symbol in format X:XXXUSD")
                }),
                responseFormat: "content_and_artifact"
            }
        );

        // Prediction tool
        this.predictionTool = tool(
            async ({ symbol }) => {
                try {
                    const engine = new CryptoPredictionEngine({ symbol });
                    
                    if (!engine.isTrained) {
                        return [`Prediction model for ${symbol} is not trained yet. Please train the model first.`, null];
                    }

                    const prediction = await engine.runPrediction();
                    const serialized = `Prediction for ${symbol}:
• Predicted Price: $${prediction.prediction.price?.toFixed(2) || 'N/A'}
• Confidence: ${(prediction.prediction.confidence * 100).toFixed(1)}%
• Direction: ${prediction.prediction.direction || 'N/A'}
• Timeframe: ${prediction.prediction.timeframe || 'N/A'}
• Model: ${prediction.model || 'N/A'}`;
                    
                    return [serialized, prediction];
                } catch (error) {
                    logger.error('Prediction tool error:', error);
                    return [`Failed to generate prediction for ${symbol}`, null];
                }
            },
            {
                name: "get_prediction",
                description: "Get AI-powered price prediction for a cryptocurrency symbol",
                schema: z.object({
                    symbol: z.string().describe("Cryptocurrency symbol in format X:XXXUSD")
                }),
                responseFormat: "content_and_artifact"
            }
        );

        // Technical analysis tool
        this.technicalAnalysisTool = tool(
            async ({ symbol, timeframe = '1D' }) => {
                try {
                    const marketData = await polygonService.getRealTimeData(symbol);
                    
                    // Simple technical analysis based on price action
                    const priceChange = marketData.priceChangePercent;
                    let trend = 'neutral';
                    let strength = 'weak';
                    
                    if (priceChange > 5) {
                        trend = 'bullish';
                        strength = 'strong';
                    } else if (priceChange > 2) {
                        trend = 'bullish';
                        strength = 'moderate';
                    } else if (priceChange < -5) {
                        trend = 'bearish';
                        strength = 'strong';
                    } else if (priceChange < -2) {
                        trend = 'bearish';
                        strength = 'moderate';
                    }
                    
                    const serialized = `Technical Analysis for ${symbol} (${timeframe}):
• Current Price: $${marketData.close.toFixed(2)}
• Price Change: ${priceChange.toFixed(2)}%
• Trend: ${trend} (${strength})
• Volume: ${marketData.volume.toLocaleString()}
• Support Level: $${(marketData.low * 0.98).toFixed(2)}
• Resistance Level: $${(marketData.high * 1.02).toFixed(2)}`;
                    
                    return [serialized, { trend, strength, priceChange, marketData }];
                } catch (error) {
                    logger.error('Technical analysis tool error:', error);
                    return [`Failed to perform technical analysis for ${symbol}`, null];
                }
            },
            {
                name: "technical_analysis",
                description: "Perform technical analysis for a cryptocurrency symbol",
                schema: z.object({
                    symbol: z.string().describe("Cryptocurrency symbol in format X:XXXUSD"),
                    timeframe: z.string().optional().describe("Timeframe for analysis (e.g., 1H, 1D, 1W)")
                }),
                responseFormat: "content_and_artifact"
            }
        );

        // Trading advice tool
        this.tradingAdviceTool = tool(
            async ({ symbol, riskTolerance = 'medium', accountBalance }) => {
                try {
                    const marketData = await polygonService.getRealTimeData(symbol);
                    const priceChange = marketData.priceChangePercent;
                    
                    let recommendation = 'hold';
                    let reasoning = '';
                    let riskLevel = 'medium';
                    
                    if (priceChange > 3) {
                        recommendation = 'consider taking profits';
                        reasoning = 'Strong upward momentum suggests potential profit-taking opportunity';
                        riskLevel = 'low';
                    } else if (priceChange < -3) {
                        recommendation = 'consider dollar-cost averaging';
                        reasoning = 'Significant decline may present buying opportunities for long-term investors';
                        riskLevel = 'high';
                    } else {
                        recommendation = 'monitor and wait';
                        reasoning = 'Sideways movement suggests waiting for clearer direction';
                        riskLevel = 'medium';
                    }
                    
                    const serialized = `Trading Advice for ${symbol}:
• Recommendation: ${recommendation}
• Reasoning: ${reasoning}
• Risk Level: ${riskLevel}
• Current Price: $${marketData.close.toFixed(2)}
• Price Change: ${priceChange.toFixed(2)}%
• Risk Tolerance: ${riskTolerance}
${accountBalance ? `• Account Balance: $${accountBalance.toLocaleString()}` : ''}

⚠️ DISCLAIMER: This is not financial advice. Always do your own research and consider your risk tolerance.`;
                    
                    return [serialized, { recommendation, reasoning, riskLevel, marketData }];
                } catch (error) {
                    logger.error('Trading advice tool error:', error);
                    return [`Failed to generate trading advice for ${symbol}`, null];
                }
            },
            {
                name: "trading_advice",
                description: "Get trading advice for a cryptocurrency symbol",
                schema: z.object({
                    symbol: z.string().describe("Cryptocurrency symbol in format X:XXXUSD"),
                    riskTolerance: z.enum(['low', 'medium', 'high']).optional().describe("User's risk tolerance level"),
                    accountBalance: z.number().optional().describe("User's account balance for position sizing")
                }),
                responseFormat: "content_and_artifact"
            }
        );
    }

    setupGraph() {
        // Step 1: Generate response with potential tool calls
        const queryOrRespond = async (state) => {
            if (!this.isInitialized) {
                const fallbackResponse = new AIMessage("I'm currently in fallback mode. Please set up your Groq API key for full functionality.");
                return { messages: [fallbackResponse] };
            }

            const llmWithTools = this.groq.bindTools([
                this.marketDataTool,
                this.predictionTool,
                this.technicalAnalysisTool,
                this.tradingAdviceTool
            ]);

            const response = await llmWithTools.invoke(state.messages);
            return { messages: [response] };
        };

        // Step 2: Execute tools
        const tools = new ToolNode([
            this.marketDataTool,
            this.predictionTool,
            this.technicalAnalysisTool,
            this.tradingAdviceTool
        ]);

        // Step 3: Generate final response
        const generate = async (state) => {
            if (!this.isInitialized) {
                const fallbackResponse = new AIMessage("I'm currently in fallback mode. Please set up your Groq API key for full functionality.");
                return { messages: [fallbackResponse] };
            }

            // Get recent tool messages
            let recentToolMessages = [];
            for (let i = state.messages.length - 1; i >= 0; i--) {
                let message = state.messages[i];
                if (message instanceof ToolMessage) {
                    recentToolMessages.push(message);
                } else {
                    break;
                }
            }
            let toolMessages = recentToolMessages.reverse();

            // Format tool results into context
            const toolsContent = toolMessages.map((msg) => msg.content).join("\n\n");

            const systemMessageContent = `You are an expert AI crypto analyst and trading advisor. You have access to real-time market data and can provide intelligent analysis, predictions, and trading advice.

Your capabilities include:
- Real-time market analysis and price predictions
- Technical analysis using indicators
- Risk management and trading strategy advice
- Fundamental analysis and market sentiment
- Position sizing and portfolio management

${toolsContent ? `\nRetrieved Information:\n${toolsContent}` : ''}

Guidelines:
1. Always provide accurate, data-driven analysis
2. Include risk warnings and disclaimers
3. Be specific about timeframes and confidence levels
4. Consider both technical and fundamental factors
5. Provide actionable trading advice when appropriate
6. Always mention that crypto trading involves risk
7. Use the retrieved information to provide comprehensive answers

Respond in a helpful, professional tone. If you don't have enough information, ask for clarification or suggest what additional data would be helpful.`;

            const conversationMessages = state.messages.filter(
                (message) => message instanceof HumanMessage || 
                             message instanceof SystemMessage || 
                             (message instanceof AIMessage && message.tool_calls.length === 0)
            );

            const prompt = [
                new SystemMessage(systemMessageContent),
                ...conversationMessages
            ];

            const response = await this.groq.invoke(prompt);
            return { messages: [response] };
        };

        // Build the graph
        this.graphBuilder = new StateGraph(MessagesAnnotation)
            .addNode("queryOrRespond", queryOrRespond)
            .addNode("tools", tools)
            .addNode("generate", generate)
            .addEdge("__start__", "queryOrRespond")
            .addConditionalEdges("queryOrRespond", toolsCondition, {
                __end__: "__end__",
                tools: "tools",
            })
            .addEdge("tools", "generate")
            .addEdge("generate", "__end__");

        this.graph = this.graphBuilder.compile({
            checkpointer: this.checkpointer
        });
    }

    async processMessage(message, threadId = null) {
        try {
            if (!threadId) {
                threadId = uuidv4();
            }

            const config = {
                configurable: { thread_id: threadId }
            };

            const input = {
                messages: [new HumanMessage(message)]
            };

            const result = await this.graph.invoke(input, config);

            // Get the last AI message
            const lastMessage = result.messages[result.messages.length - 1];
            
            return {
                response: lastMessage.content,
                threadId: threadId,
                messageCount: result.messages.length,
                llmEnabled: this.isInitialized,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Advanced chat processing error:', error);
            return {
                response: "I'm experiencing technical difficulties. Please try again in a moment.",
                threadId: threadId,
                messageCount: 0,
                llmEnabled: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async streamMessage(message, threadId = null) {
        try {
            if (!threadId) {
                threadId = uuidv4();
            }

            const config = {
                configurable: { thread_id: threadId },
                streamMode: "values"
            };

            const input = {
                messages: [new HumanMessage(message)]
            };

            const stream = await this.graph.stream(input, config);
            
            return {
                stream,
                threadId,
                llmEnabled: this.isInitialized
            };

        } catch (error) {
            logger.error('Advanced chat streaming error:', error);
            throw error;
        }
    }

    async getConversationHistory(threadId) {
        try {
            const config = {
                configurable: { thread_id: threadId }
            };

            const checkpoint = await this.checkpointer.get(config);
            
            if (!checkpoint) {
                return { messages: [], threadId };
            }

            return {
                messages: checkpoint.messages || [],
                threadId,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Get conversation history error:', error);
            return { messages: [], threadId, error: error.message };
        }
    }

    async clearConversationHistory(threadId) {
        try {
            const config = {
                configurable: { thread_id: threadId }
            };

            await this.checkpointer.delete(config);
            
            return {
                success: true,
                threadId,
                message: 'Conversation history cleared'
            };

        } catch (error) {
            logger.error('Clear conversation history error:', error);
            return { success: false, threadId, error: error.message };
        }
    }

    getStatus() {
        return {
            isInitialized: this.isInitialized,
            model: this.model,
            maxTokens: this.maxTokens,
            temperature: this.temperature,
            activeThreads: this.conversationThreads.size,
            timestamp: new Date().toISOString()
        };
    }
}

// Export singleton instance
const advancedChatService = new AdvancedChatService();
export default advancedChatService; 