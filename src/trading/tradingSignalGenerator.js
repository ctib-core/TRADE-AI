import { logger } from '../utils/logger.js';

class TradingSignalGenerator {
    constructor(config = {}) {
        this.config = {
            // Account configuration
            accountBalance: config.accountBalance || 10000,
            accountCurrency: config.accountCurrency || 'USD',
            leverage: config.leverage || 100,
            maxLeverage: config.maxLeverage || 500,
            
            // Risk management
            riskPercentage: config.riskPercentage || 2, // 2% risk per trade
            maxRiskPerTrade: config.maxRiskPerTrade || 200, // $200 max risk
            maxDailyLoss: config.maxDailyLoss || 5, // 5% max daily loss
            maxOpenPositions: config.maxOpenPositions || 5,
            
            // Trading parameters
            minLotSize: config.minLotSize || 0.01,
            maxLotSize: config.maxLotSize || 10,
            lotSizeStep: config.lotSizeStep || 0.01,
            
            // Stop loss and take profit
            defaultStopLossPips: config.defaultStopLossPips || 50,
            defaultTakeProfitPips: config.defaultTakeProfitPips || 100,
            riskRewardRatio: config.riskRewardRatio || 2, // 1:2 risk:reward
            
            // Pip values (for different instruments)
            pipValues: config.pipValues || {
                'X:BTCUSD': 1,
                'X:ETHUSD': 1,
                'X:EURUSD': 10,
                'X:GBPUSD': 10,
                'X:USDJPY': 10
            },
            
            // Market analysis
            minConfidence: config.minConfidence || 0.7,
            minPriceMovement: config.minPriceMovement || 0.5, // 0.5% minimum movement
            trendThreshold: config.trendThreshold || 0.8,
            
            // Order types
            useLimitOrders: config.useLimitOrders !== false,
            limitOrderOffset: config.limitOrderOffset || 0.1, // 0.1% offset
            useTrailingStop: config.useTrailingStop || false,
            trailingStopDistance: config.trailingStopDistance || 20 // 20 pips
        };

        this.openPositions = [];
        this.dailyPnL = 0;
        this.dailyTrades = 0;
        
        logger.info('TradingSignalGenerator initialized with config:', this.config);
    }

    /**
     * Generate comprehensive trading signals based on AI predictions
     */
    generateTradingSignals(predictionData, marketData, accountBalance = null) {
        try {
            logger.trading('Generating comprehensive trading signals');
            
            const currentBalance = accountBalance || this.config.accountBalance;
            const currentPrice = marketData.currentPrice;
            const predictedPrice = predictionData.ensemble;
            const confidence = predictionData.confidence;
            
            // Validate signal conditions
            if (!this.validateSignalConditions(currentPrice, predictedPrice, confidence)) {
                return {
                    signal: 'HOLD',
                    reason: 'Signal conditions not met',
                    confidence: confidence,
                    analysis: this.analyzeMarketConditions(marketData, predictionData)
                };
            }
            
            // Determine signal type
            const signalType = this.determineSignalType(currentPrice, predictedPrice, confidence);
            
            // Calculate position sizing
            const positionSize = this.calculatePositionSize(
                currentPrice, 
                predictedPrice, 
                confidence, 
                currentBalance
            );
            
            // Generate order details
            const orderDetails = this.generateOrderDetails(
                signalType,
                currentPrice,
                predictedPrice,
                positionSize,
                marketData
            );
            
            // Risk analysis
            const riskAnalysis = this.analyzeRisk(
                orderDetails,
                currentBalance,
                marketData
            );
            
            // Market analysis
            const marketAnalysis = this.analyzeMarketConditions(marketData, predictionData);
            
            const tradingSignal = {
                signal: signalType,
                timestamp: new Date().toISOString(),
                symbol: marketData.symbol,
                currentPrice: currentPrice,
                predictedPrice: predictedPrice,
                confidence: confidence,
                positionSize: positionSize,
                orderDetails: orderDetails,
                riskAnalysis: riskAnalysis,
                marketAnalysis: marketAnalysis,
                accountImpact: this.calculateAccountImpact(orderDetails, currentBalance)
            };
            
            logger.trading(`Generated ${signalType} signal for ${marketData.symbol}`, {
                confidence: confidence,
                lotSize: positionSize.lotSize,
                potentialProfit: orderDetails.takeProfit ? (orderDetails.takeProfit - currentPrice) * positionSize.lotSize : 0
            });
            
            return tradingSignal;
            
        } catch (error) {
            throw new Error(`Trading signal generation failed: ${error.message}`);
        }
    }

    /**
     * Validate if signal conditions are met
     */
    validateSignalConditions(currentPrice, predictedPrice, confidence) {
        const priceChangePercent = Math.abs((predictedPrice - currentPrice) / currentPrice) * 100;
        
        // Check confidence threshold
        if (confidence < this.config.minConfidence) {
            return false;
        }
        
        // Check minimum price movement
        if (priceChangePercent < this.config.minPriceMovement) {
            return false;
        }
        
        // Check daily loss limit
        if (this.dailyPnL < -(this.config.accountBalance * this.config.maxDailyLoss / 100)) {
            return false;
        }
        
        // Check maximum open positions
        if (this.openPositions.length >= this.config.maxOpenPositions) {
            return false;
        }
        
        return true;
    }

    /**
     * Determine signal type based on prediction and confidence
     */
    determineSignalType(currentPrice, predictedPrice, confidence) {
        const priceChangePercent = ((predictedPrice - currentPrice) / currentPrice) * 100;
        
        if (priceChangePercent > this.config.minPriceMovement) {
            return 'BUY';
        } else if (priceChangePercent < -this.config.minPriceMovement) {
            return 'SELL';
        } else {
            return 'HOLD';
        }
    }

    /**
     * Calculate optimal position size based on risk management
     */
    calculatePositionSize(currentPrice, predictedPrice, confidence, accountBalance) {
        try {
            // Calculate risk amount
            const riskAmount = Math.min(
                accountBalance * (this.config.riskPercentage / 100),
                this.config.maxRiskPerTrade
            );
            
            // Calculate stop loss distance in pips
            const pipValue = this.config.pipValues['X:BTCUSD'] || 1; // Default for crypto
            const stopLossPips = this.config.defaultStopLossPips;
            const stopLossDistance = stopLossPips * pipValue;
            
            // Calculate lot size based on risk
            const riskPerLot = stopLossDistance;
            const lotSize = riskAmount / riskPerLot;
            
            // Apply lot size constraints
            const constrainedLotSize = Math.max(
                this.config.minLotSize,
                Math.min(lotSize, this.config.maxLotSize)
            );
            
            // Round to lot size step
            const finalLotSize = Math.round(constrainedLotSize / this.config.lotSizeStep) * this.config.lotSizeStep;
            
            // Calculate margin requirement
            const marginRequirement = (currentPrice * finalLotSize) / this.config.leverage;
            
            // Check if margin is available
            if (marginRequirement > accountBalance * 0.9) { // Keep 10% buffer
                const adjustedLotSize = (accountBalance * 0.9 * this.config.leverage) / currentPrice;
                return {
                    lotSize: Math.max(this.config.minLotSize, adjustedLotSize),
                    marginRequired: marginRequirement,
                    riskAmount: riskAmount,
                    adjustedForMargin: true
                };
            }
            
            return {
                lotSize: finalLotSize,
                marginRequired: marginRequirement,
                riskAmount: riskAmount,
                adjustedForMargin: false
            };
            
        } catch (error) {
            throw new Error(`Position size calculation failed: ${error.message}`);
        }
    }

    /**
     * Generate comprehensive order details
     */
    generateOrderDetails(signalType, currentPrice, predictedPrice, positionSize, marketData) {
        try {
            const pipValue = this.config.pipValues[marketData.symbol] || 1;
            
            // Calculate stop loss and take profit levels
            const stopLossPips = this.config.defaultStopLossPips;
            const takeProfitPips = this.config.defaultTakeProfitPips;
            
            let stopLoss, takeProfit, entryPrice;
            
            if (signalType === 'BUY') {
                entryPrice = currentPrice;
                stopLoss = currentPrice - (stopLossPips * pipValue);
                takeProfit = currentPrice + (takeProfitPips * pipValue);
            } else if (signalType === 'SELL') {
                entryPrice = currentPrice;
                stopLoss = currentPrice + (stopLossPips * pipValue);
                takeProfit = currentPrice - (takeProfitPips * pipValue);
            }
            
            // Generate limit orders if enabled
            let limitOrders = [];
            if (this.config.useLimitOrders && signalType !== 'HOLD') {
                limitOrders = this.generateLimitOrders(
                    signalType,
                    currentPrice,
                    predictedPrice,
                    positionSize,
                    marketData
                );
            }
            
            // Calculate potential profit and loss
            const potentialProfit = Math.abs(takeProfit - entryPrice) * positionSize.lotSize;
            const potentialLoss = Math.abs(stopLoss - entryPrice) * positionSize.lotSize;
            
            return {
                signalType: signalType,
                entryPrice: entryPrice,
                stopLoss: stopLoss,
                takeProfit: takeProfit,
                lotSize: positionSize.lotSize,
                leverage: this.config.leverage,
                marginRequired: positionSize.marginRequired,
                potentialProfit: potentialProfit,
                potentialLoss: potentialLoss,
                riskRewardRatio: potentialProfit / potentialLoss,
                limitOrders: limitOrders,
                trailingStop: this.config.useTrailingStop ? {
                    enabled: true,
                    distance: this.config.trailingStopDistance * pipValue
                } : null
            };
            
        } catch (error) {
            throw new Error(`Order details generation failed: ${error.message}`);
        }
    }

    /**
     * Generate limit orders for better entry/exit
     */
    generateLimitOrders(signalType, currentPrice, predictedPrice, positionSize, marketData) {
        const limitOrders = [];
        const offset = currentPrice * (this.config.limitOrderOffset / 100);
        
        if (signalType === 'BUY') {
            // Buy limit order (buy below current price)
            const buyLimitPrice = currentPrice - offset;
            limitOrders.push({
                type: 'BUY_LIMIT',
                price: buyLimitPrice,
                lotSize: positionSize.lotSize * 0.5, // Split position
                stopLoss: buyLimitPrice - (this.config.defaultStopLossPips * this.config.pipValues[marketData.symbol]),
                takeProfit: buyLimitPrice + (this.config.defaultTakeProfitPips * this.config.pipValues[marketData.symbol])
            });
            
            // Buy stop order (buy above current price if breakout)
            const buyStopPrice = currentPrice + offset;
            limitOrders.push({
                type: 'BUY_STOP',
                price: buyStopPrice,
                lotSize: positionSize.lotSize * 0.5,
                stopLoss: buyStopPrice - (this.config.defaultStopLossPips * this.config.pipValues[marketData.symbol]),
                takeProfit: buyStopPrice + (this.config.defaultTakeProfitPips * this.config.pipValues[marketData.symbol])
            });
        } else if (signalType === 'SELL') {
            // Sell limit order (sell above current price)
            const sellLimitPrice = currentPrice + offset;
            limitOrders.push({
                type: 'SELL_LIMIT',
                price: sellLimitPrice,
                lotSize: positionSize.lotSize * 0.5,
                stopLoss: sellLimitPrice + (this.config.defaultStopLossPips * this.config.pipValues[marketData.symbol]),
                takeProfit: sellLimitPrice - (this.config.defaultTakeProfitPips * this.config.pipValues[marketData.symbol])
            });
            
            // Sell stop order (sell below current price if breakdown)
            const sellStopPrice = currentPrice - offset;
            limitOrders.push({
                type: 'SELL_STOP',
                price: sellStopPrice,
                lotSize: positionSize.lotSize * 0.5,
                stopLoss: sellStopPrice + (this.config.defaultStopLossPips * this.config.pipValues[marketData.symbol]),
                takeProfit: sellStopPrice - (this.config.defaultTakeProfitPips * this.config.pipValues[marketData.symbol])
            });
        }
        
        return limitOrders;
    }

    /**
     * Analyze risk for the proposed trade
     */
    analyzeRisk(orderDetails, accountBalance, marketData) {
        try {
            const riskAmount = orderDetails.potentialLoss;
            const riskPercentage = (riskAmount / accountBalance) * 100;
            
            // Calculate margin utilization
            const marginUtilization = (orderDetails.marginRequired / accountBalance) * 100;
            
            // Calculate free margin
            const freeMargin = accountBalance - orderDetails.marginRequired;
            
            // Risk assessment
            let riskLevel = 'LOW';
            if (riskPercentage > 5) riskLevel = 'HIGH';
            else if (riskPercentage > 2) riskLevel = 'MEDIUM';
            
            // Margin assessment
            let marginLevel = 'SAFE';
            if (marginUtilization > 80) marginLevel = 'CRITICAL';
            else if (marginUtilization > 60) marginLevel = 'HIGH';
            else if (marginUtilization > 40) marginLevel = 'MEDIUM';
            
            return {
                riskAmount: riskAmount,
                riskPercentage: riskPercentage,
                riskLevel: riskLevel,
                marginUtilization: marginUtilization,
                marginLevel: marginLevel,
                freeMargin: freeMargin,
                maxDrawdown: this.calculateMaxDrawdown(accountBalance, riskAmount),
                riskRewardRatio: orderDetails.riskRewardRatio,
                dailyRiskExposure: this.dailyPnL + riskAmount
            };
            
        } catch (error) {
            throw new Error(`Risk analysis failed: ${error.message}`);
        }
    }

    /**
     * Analyze market conditions
     */
    analyzeMarketConditions(marketData, predictionData) {
        try {
            const analysis = {
                trend: this.analyzeTrend(marketData),
                volatility: this.analyzeVolatility(marketData),
                supportResistance: this.analyzeSupportResistance(marketData),
                momentum: this.analyzeMomentum(marketData),
                volume: this.analyzeVolume(marketData),
                technicalIndicators: this.analyzeTechnicalIndicators(marketData),
                marketSentiment: this.analyzeMarketSentiment(predictionData)
            };
            
            // Overall market condition
            analysis.overallCondition = this.calculateOverallCondition(analysis);
            
            return analysis;
            
        } catch (error) {
            throw new Error(`Market analysis failed: ${error.message}`);
        }
    }

    /**
     * Analyze market trend
     */
    analyzeTrend(marketData) {
        const indicators = marketData.indicators || {};
        
        let trend = 'NEUTRAL';
        let strength = 0;
        
        // Moving average analysis
        if (indicators.sma20 && indicators.sma50) {
            if (indicators.sma20 > indicators.sma50) {
                trend = 'BULLISH';
                strength += 0.3;
            } else {
                trend = 'BEARISH';
                strength -= 0.3;
            }
        }
        
        // Price position relative to moving averages
        const currentPrice = marketData.close;
        if (indicators.sma20) {
            if (currentPrice > indicators.sma20) {
                strength += 0.2;
            } else {
                strength -= 0.2;
            }
        }
        
        // MACD analysis
        if (indicators.macd && indicators.macdSignal) {
            if (indicators.macd > indicators.macdSignal) {
                strength += 0.2;
            } else {
                strength -= 0.2;
            }
        }
        
        return {
            direction: trend,
            strength: Math.abs(strength),
            confidence: Math.min(Math.abs(strength), 1)
        };
    }

    /**
     * Analyze market volatility
     */
    analyzeVolatility(marketData) {
        const indicators = marketData.indicators || {};
        
        let volatility = 'NORMAL';
        let level = 0.5;
        
        if (indicators.atr) {
            // Compare ATR with historical average
            level = indicators.atr / marketData.close;
            
            if (level > 0.05) {
                volatility = 'HIGH';
            } else if (level < 0.02) {
                volatility = 'LOW';
            }
        }
        
        return {
            level: volatility,
            value: level,
            impact: this.assessVolatilityImpact(volatility)
        };
    }

    /**
     * Analyze support and resistance levels
     */
    analyzeSupportResistance(marketData) {
        const indicators = marketData.indicators || {};
        const currentPrice = marketData.close;
        
        let nearestSupport = null;
        let nearestResistance = null;
        let supportDistance = Infinity;
        let resistanceDistance = Infinity;
        
        // Bollinger Bands
        if (indicators.bbLower && indicators.bbUpper) {
            const bbSupportDistance = currentPrice - indicators.bbLower;
            const bbResistanceDistance = indicators.bbUpper - currentPrice;
            
            if (bbSupportDistance < supportDistance) {
                supportDistance = bbSupportDistance;
                nearestSupport = indicators.bbLower;
            }
            
            if (bbResistanceDistance < resistanceDistance) {
                resistanceDistance = bbResistanceDistance;
                nearestResistance = indicators.bbUpper;
            }
        }
        
        return {
            support: nearestSupport,
            resistance: nearestResistance,
            supportDistance: supportDistance,
            resistanceDistance: resistanceDistance,
            position: nearestSupport && nearestResistance ? 
                (currentPrice - nearestSupport) / (nearestResistance - nearestSupport) : 0.5
        };
    }

    /**
     * Analyze market momentum
     */
    analyzeMomentum(marketData) {
        const indicators = marketData.indicators || {};
        
        let momentum = 'NEUTRAL';
        let strength = 0;
        
        // RSI analysis
        if (indicators.rsi) {
            if (indicators.rsi > 70) {
                momentum = 'OVERBOUGHT';
                strength = (indicators.rsi - 70) / 30;
            } else if (indicators.rsi < 30) {
                momentum = 'OVERSOLD';
                strength = (30 - indicators.rsi) / 30;
            } else {
                momentum = 'NEUTRAL';
                strength = 0.5;
            }
        }
        
        // Stochastic analysis
        if (indicators.stochK) {
            if (indicators.stochK > 80) {
                momentum = 'OVERBOUGHT';
                strength = Math.max(strength, (indicators.stochK - 80) / 20);
            } else if (indicators.stochK < 20) {
                momentum = 'OVERSOLD';
                strength = Math.max(strength, (20 - indicators.stochK) / 20);
            }
        }
        
        return {
            direction: momentum,
            strength: strength,
            rsi: indicators.rsi,
            stochastic: indicators.stochK
        };
    }

    /**
     * Analyze volume patterns
     */
    analyzeVolume(marketData) {
        const indicators = marketData.indicators || {};
        
        let volumeAnalysis = 'NORMAL';
        let volumeRatio = 1;
        
        if (indicators.volumeRatio) {
            volumeRatio = indicators.volumeRatio;
            
            if (volumeRatio > 2) {
                volumeAnalysis = 'HIGH';
            } else if (volumeRatio < 0.5) {
                volumeAnalysis = 'LOW';
            }
        }
        
        return {
            level: volumeAnalysis,
            ratio: volumeRatio,
            significance: this.assessVolumeSignificance(volumeRatio)
        };
    }

    /**
     * Analyze technical indicators
     */
    analyzeTechnicalIndicators(marketData) {
        const indicators = marketData.indicators || {};
        
        const analysis = {
            movingAverages: this.analyzeMovingAverages(indicators),
            oscillators: this.analyzeOscillators(indicators),
            momentum: this.analyzeMomentumIndicators(indicators),
            volatility: this.analyzeVolatilityIndicators(indicators)
        };
        
        // Calculate overall technical score
        analysis.overallScore = this.calculateTechnicalScore(analysis);
        
        return analysis;
    }

    /**
     * Analyze market sentiment based on AI predictions
     */
    analyzeMarketSentiment(predictionData) {
        const confidence = predictionData.confidence;
        const ensemblePrediction = predictionData.ensemble;
        
        let sentiment = 'NEUTRAL';
        let strength = confidence;
        
        // Determine sentiment based on prediction confidence and direction
        if (confidence > 0.8) {
            sentiment = ensemblePrediction > 0 ? 'VERY_BULLISH' : 'VERY_BEARISH';
        } else if (confidence > 0.6) {
            sentiment = ensemblePrediction > 0 ? 'BULLISH' : 'BEARISH';
        }
        
        return {
            sentiment: sentiment,
            strength: strength,
            confidence: confidence,
            predictionDirection: ensemblePrediction > 0 ? 'UP' : 'DOWN'
        };
    }

    /**
     * Calculate overall market condition
     */
    calculateOverallCondition(analysis) {
        let score = 0;
        let factors = [];
        
        // Trend factor
        if (analysis.trend.direction === 'BULLISH') {
            score += analysis.trend.strength;
            factors.push('BULLISH_TREND');
        } else if (analysis.trend.direction === 'BEARISH') {
            score -= analysis.trend.strength;
            factors.push('BEARISH_TREND');
        }
        
        // Momentum factor
        if (analysis.momentum.direction === 'OVERSOLD') {
            score += 0.3;
            factors.push('OVERSOLD');
        } else if (analysis.momentum.direction === 'OVERBOUGHT') {
            score -= 0.3;
            factors.push('OVERBOUGHT');
        }
        
        // Volume factor
        if (analysis.volume.level === 'HIGH') {
            score += 0.2;
            factors.push('HIGH_VOLUME');
        }
        
        // Sentiment factor
        if (analysis.marketSentiment.sentiment.includes('BULLISH')) {
            score += analysis.marketSentiment.strength;
            factors.push('BULLISH_SENTIMENT');
        } else if (analysis.marketSentiment.sentiment.includes('BEARISH')) {
            score -= analysis.marketSentiment.strength;
            factors.push('BEARISH_SENTIMENT');
        }
        
        let condition = 'NEUTRAL';
        if (score > 0.5) condition = 'BULLISH';
        else if (score < -0.5) condition = 'BEARISH';
        
        return {
            condition: condition,
            score: score,
            factors: factors
        };
    }

    /**
     * Calculate account impact of the trade
     */
    calculateAccountImpact(orderDetails, accountBalance) {
        const marginUtilization = (orderDetails.marginRequired / accountBalance) * 100;
        const freeMargin = accountBalance - orderDetails.marginRequired;
        const marginBuffer = (freeMargin / accountBalance) * 100;
        
        return {
            marginUtilization: marginUtilization,
            freeMargin: freeMargin,
            marginBuffer: marginBuffer,
            maxDrawdown: this.calculateMaxDrawdown(accountBalance, orderDetails.potentialLoss),
            riskExposure: (orderDetails.potentialLoss / accountBalance) * 100
        };
    }

    /**
     * Calculate maximum drawdown
     */
    calculateMaxDrawdown(accountBalance, potentialLoss) {
        return (potentialLoss / accountBalance) * 100;
    }

    /**
     * Assess volatility impact on trading
     */
    assessVolatilityImpact(volatility) {
        switch (volatility) {
            case 'HIGH':
                return 'INCREASE_STOP_LOSS';
            case 'LOW':
                return 'DECREASE_STOP_LOSS';
            default:
                return 'NORMAL';
        }
    }

    /**
     * Assess volume significance
     */
    assessVolumeSignificance(volumeRatio) {
        if (volumeRatio > 3) return 'VERY_SIGNIFICANT';
        if (volumeRatio > 2) return 'SIGNIFICANT';
        if (volumeRatio > 1.5) return 'MODERATE';
        return 'LOW';
    }

    // Helper methods for technical analysis
    analyzeMovingAverages(indicators) {
        // Implementation for moving average analysis
        return { status: 'ANALYZED' };
    }

    analyzeOscillators(indicators) {
        // Implementation for oscillator analysis
        return { status: 'ANALYZED' };
    }

    analyzeMomentumIndicators(indicators) {
        // Implementation for momentum indicator analysis
        return { status: 'ANALYZED' };
    }

    analyzeVolatilityIndicators(indicators) {
        // Implementation for volatility indicator analysis
        return { status: 'ANALYZED' };
    }

    calculateTechnicalScore(analysis) {
        // Implementation for technical score calculation
        return 0.5;
    }

    /**
     * Update daily P&L and trade count
     */
    updateDailyStats(pnl) {
        this.dailyPnL += pnl;
        this.dailyTrades++;
    }

    /**
     * Reset daily statistics
     */
    resetDailyStats() {
        this.dailyPnL = 0;
        this.dailyTrades = 0;
    }
}

export default TradingSignalGenerator; 