import { Matrix } from 'ml-matrix';
import { logger } from '../utils/logger.js';
import marketDataService from '../services/marketDataService.js';

class DataPreprocessor {
    constructor(config = {}) {
        this.config = {
            symbol: config.symbol || 'X:BTCUSD',
            lookbackPeriod: config.lookbackPeriod || 60,
            predictionHorizon: config.predictionHorizon || 5,
            trainingRatio: config.trainingRatio || 0.8,
            validationRatio: config.validationRatio || 0.1,
            testRatio: config.testRatio || 0.1,
            // Feature engineering
            useTechnicalIndicators: config.useTechnicalIndicators !== false,
            usePriceAction: config.usePriceAction !== false,
            useVolumeAnalysis: config.useVolumeAnalysis !== false,
            useMarketMicrostructure: config.useMarketMicrostructure !== false,
            // Data quality
            minDataPoints: config.minDataPoints || 1000,
            maxMissingData: config.maxMissingData || 0.05, // 5%
            outlierThreshold: config.outlierThreshold || 3.0, // 3 standard deviations
            // Normalization
            normalizationMethod: config.normalizationMethod || 'minmax', // 'minmax', 'zscore', 'robust'
            // Feature selection
            featureSelectionMethod: config.featureSelectionMethod || 'correlation', // 'correlation', 'mutual_info', 'variance'
            maxFeatures: config.maxFeatures || 100
        };

        this.scalers = {};
        this.featureNames = [];
        this.featureImportance = {};
        this.dataQuality = {};
        
        logger.info('DataPreprocessor initialized with config:', this.config);
    }

    /**
     * Fetch and validate comprehensive market data
     */
    async fetchComprehensiveData(years = 15) {
        try {
            logger.info(`Fetching ${years} years of comprehensive data for ${this.config.symbol}`);
            
            const data = await marketDataService.getExtendedHistoricalData(
                this.config.symbol,
                'day',
                years
            );

            if (!data.results || data.results.length < this.config.minDataPoints) {
                throw new Error(`Insufficient data points. Required: ${this.config.minDataPoints}, Got: ${data.results?.length || 0}`);
            }

            logger.info(`Fetched ${data.results.length} data points spanning ${years} years`);
            
            // Validate data quality
            const qualityReport = this.validateDataQuality(data.results);
            this.dataQuality = qualityReport;
            
            if (qualityReport.missingDataRatio > this.config.maxMissingData) {
                throw new Error(`Data quality too poor. Missing data ratio: ${qualityReport.missingDataRatio}`);
            }

            return data.results;
        } catch (error) {
            throw new Error(`Failed to fetch comprehensive data: ${error.message}`);
        }
    }

    /**
     * Validate data quality and completeness
     */
    validateDataQuality(data) {
        const totalPoints = data.length;
        let missingData = 0;
        let outliers = 0;
        let invalidData = 0;

        const qualityReport = {
            totalPoints,
            missingData: 0,
            outliers: 0,
            invalidData: 0,
            missingDataRatio: 0,
            outlierRatio: 0,
            invalidDataRatio: 0,
            dataCompleteness: 0,
            dataQuality: 'UNKNOWN'
        };

        for (let i = 0; i < data.length; i++) {
            const point = data[i];
            
            // Check for missing data
            if (!point.o || !point.h || !point.l || !point.c || !point.v) {
                missingData++;
                continue;
            }

            // Check for invalid data
            if (point.h < point.l || point.o < 0 || point.c < 0 || point.v < 0) {
                invalidData++;
                continue;
            }

            // Check for outliers (using price and volume)
            if (i > 0) {
                const prevPoint = data[i - 1];
                const priceChange = Math.abs((point.c - prevPoint.c) / prevPoint.c);
                const volumeChange = Math.abs((point.v - prevPoint.v) / prevPoint.v);
                
                if (priceChange > this.config.outlierThreshold || volumeChange > this.config.outlierThreshold) {
                    outliers++;
                }
            }
        }

        qualityReport.missingData = missingData;
        qualityReport.outliers = outliers;
        qualityReport.invalidData = invalidData;
        qualityReport.missingDataRatio = missingData / totalPoints;
        qualityReport.outlierRatio = outliers / totalPoints;
        qualityReport.invalidDataRatio = invalidData / totalPoints;
        qualityReport.dataCompleteness = 1 - qualityReport.missingDataRatio;

        // Determine overall data quality
        if (qualityReport.dataCompleteness > 0.95 && qualityReport.outlierRatio < 0.1) {
            qualityReport.dataQuality = 'EXCELLENT';
        } else if (qualityReport.dataCompleteness > 0.9 && qualityReport.outlierRatio < 0.2) {
            qualityReport.dataQuality = 'GOOD';
        } else if (qualityReport.dataCompleteness > 0.8 && qualityReport.outlierRatio < 0.3) {
            qualityReport.dataQuality = 'FAIR';
        } else {
            qualityReport.dataQuality = 'POOR';
        }

        logger.info('Data quality report:', qualityReport);
        return qualityReport;
    }

    /**
     * Extract comprehensive features from market data
     */
    extractComprehensiveFeatures(marketData) {
        try {
            logger.info('Extracting comprehensive features from market data');
            
            const features = [];
            const targets = [];
            const featureNames = [];

            for (let i = this.config.lookbackPeriod; i < marketData.length - this.config.predictionHorizon; i++) {
                const featureVector = [];
                const currentNames = [];

                // 1. Price-based features
                const priceFeatures = this.extractPriceFeatures(marketData, i);
                featureVector.push(...priceFeatures.values);
                currentNames.push(...priceFeatures.names);

                // 2. Technical indicators
                if (this.config.useTechnicalIndicators) {
                    const technicalFeatures = this.extractTechnicalFeatures(marketData, i);
                    featureVector.push(...technicalFeatures.values);
                    currentNames.push(...technicalFeatures.names);
                }

                // 3. Price action patterns
                if (this.config.usePriceAction) {
                    const priceActionFeatures = this.extractPriceActionFeatures(marketData, i);
                    featureVector.push(...priceActionFeatures.values);
                    currentNames.push(...priceActionFeatures.names);
                }

                // 4. Volume analysis
                if (this.config.useVolumeAnalysis) {
                    const volumeFeatures = this.extractVolumeFeatures(marketData, i);
                    featureVector.push(...volumeFeatures.values);
                    currentNames.push(...volumeFeatures.names);
                }

                // 5. Market microstructure
                if (this.config.useMarketMicrostructure) {
                    const microstructureFeatures = this.extractMicrostructureFeatures(marketData, i);
                    featureVector.push(...microstructureFeatures.values);
                    currentNames.push(...microstructureFeatures.names);
                }

                features.push(featureVector);
                
                // Store feature names only once
                if (featureNames.length === 0) {
                    featureNames.push(...currentNames);
                }

                // Target: future prices
                const futurePrices = [];
                for (let k = 1; k <= this.config.predictionHorizon; k++) {
                    futurePrices.push(marketData[i + k]?.c || marketData[i].c);
                }
                targets.push(futurePrices);
            }

            this.featureNames = featureNames;
            logger.info(`Extracted ${features.length} feature vectors with ${featureNames.length} features each`);

            return { features, targets, featureNames };
        } catch (error) {
            throw new Error(`Feature extraction failed: ${error.message}`);
        }
    }

    /**
     * Extract price-based features
     */
    extractPriceFeatures(data, currentIndex) {
        const values = [];
        const names = [];
        
        // Historical price data
        for (let j = 0; j < this.config.lookbackPeriod; j++) {
            const dataPoint = data[currentIndex - this.config.lookbackPeriod + j];
            values.push(
                dataPoint.o, dataPoint.h, dataPoint.l, dataPoint.c, dataPoint.v
            );
            names.push(
                `open_${j}`, `high_${j}`, `low_${j}`, `close_${j}`, `volume_${j}`
            );
        }

        // Price changes and returns
        const current = data[currentIndex];
        const prev = data[currentIndex - 1];
        
        values.push(
            (current.c - prev.c) / prev.c, // Price return
            (current.h - prev.h) / prev.h, // High return
            (current.l - prev.l) / prev.l, // Low return
            (current.o - prev.o) / prev.o, // Open return
            (current.v - prev.v) / prev.v  // Volume return
        );
        names.push('price_return', 'high_return', 'low_return', 'open_return', 'volume_return');

        // Price ratios
        values.push(
            current.h / current.l, // High-low ratio
            current.c / current.o, // Close-open ratio
            current.v / (current.h - current.l) // Volume-price ratio
        );
        names.push('high_low_ratio', 'close_open_ratio', 'volume_price_ratio');

        return { values, names };
    }

    /**
     * Extract technical indicator features
     */
    extractTechnicalFeatures(data, currentIndex) {
        const values = [];
        const names = [];
        
        const current = data[currentIndex];
        
        if (current.indicators) {
            const indicators = current.indicators;
            
            // Moving averages
            if (indicators.sma10) values.push(indicators.sma10); names.push('sma_10');
            if (indicators.sma20) values.push(indicators.sma20); names.push('sma_20');
            if (indicators.sma50) values.push(indicators.sma50); names.push('sma_50');
            if (indicators.sma200) values.push(indicators.sma200); names.push('sma_200');
            
            if (indicators.ema10) values.push(indicators.ema10); names.push('ema_10');
            if (indicators.ema20) values.push(indicators.ema20); names.push('ema_20');
            if (indicators.ema50) values.push(indicators.ema50); names.push('ema_50');

            // Oscillators
            if (indicators.rsi) values.push(indicators.rsi); names.push('rsi');
            if (indicators.stochK) values.push(indicators.stochK); names.push('stoch_k');
            if (indicators.stochD) values.push(indicators.stochD); names.push('stoch_d');
            if (indicators.williamsR) values.push(indicators.williamsR); names.push('williams_r');
            if (indicators.cci) values.push(indicators.cci); names.push('cci');
            if (indicators.mfi) values.push(indicators.mfi); names.push('mfi');

            // MACD
            if (indicators.macd) values.push(indicators.macd); names.push('macd');
            if (indicators.macdSignal) values.push(indicators.macdSignal); names.push('macd_signal');
            if (indicators.macdHistogram) values.push(indicators.macdHistogram); names.push('macd_histogram');

            // Bollinger Bands
            if (indicators.bbUpper) values.push(indicators.bbUpper); names.push('bb_upper');
            if (indicators.bbMiddle) values.push(indicators.bbMiddle); names.push('bb_middle');
            if (indicators.bbLower) values.push(indicators.bbLower); names.push('bb_lower');
            if (indicators.bbWidth) values.push(indicators.bbWidth); names.push('bb_width');
            if (indicators.bbPosition) values.push(indicators.bbPosition); names.push('bb_position');

            // Volatility
            if (indicators.atr) values.push(indicators.atr); names.push('atr');

            // Volume
            if (indicators.obv) values.push(indicators.obv); names.push('obv');
            if (indicators.volumeSMA) values.push(indicators.volumeSMA); names.push('volume_sma');
            if (indicators.volumeRatio) values.push(indicators.volumeRatio); names.push('volume_ratio');
        }

        return { values, names };
    }

    /**
     * Extract price action pattern features
     */
    extractPriceActionFeatures(data, currentIndex) {
        const values = [];
        const names = [];
        
        const current = data[currentIndex];
        
        // Candle patterns
        if (current.indicators && current.indicators.candlePattern) {
            const pattern = current.indicators.candlePattern;
            const patternValues = {
                'DOJI': 1, 'HAMMER': 2, 'SHOOTING_STAR': 3,
                'BULLISH_ENGULFING': 4, 'BEARISH_ENGULFING': 5, 'NORMAL': 0
            };
            values.push(patternValues[pattern] || 0);
            names.push('candle_pattern');
        }

        // Support and resistance
        if (current.indicators && current.indicators.supportResistance) {
            const sr = current.indicators.supportResistance;
            if (sr.support && sr.resistance) {
                values.push(
                    (current.c - sr.support) / (sr.resistance - sr.support), // Position between S/R
                    sr.resistance - sr.support // Range
                );
                names.push('sr_position', 'sr_range');
            }
        }

        // Price action metrics
        const bodySize = Math.abs(current.c - current.o);
        const totalRange = current.h - current.l;
        const upperShadow = current.h - Math.max(current.o, current.c);
        const lowerShadow = Math.min(current.o, current.c) - current.l;

        values.push(
            bodySize / totalRange, // Body ratio
            upperShadow / totalRange, // Upper shadow ratio
            lowerShadow / totalRange, // Lower shadow ratio
            bodySize / current.c // Body to close ratio
        );
        names.push('body_ratio', 'upper_shadow_ratio', 'lower_shadow_ratio', 'body_close_ratio');

        return { values, names };
    }

    /**
     * Extract volume analysis features
     */
    extractVolumeFeatures(data, currentIndex) {
        const values = [];
        const names = [];
        
        const current = data[currentIndex];
        
        // Volume-based features
        if (current.indicators && current.indicators.volumeRatio) {
            values.push(current.indicators.volumeRatio);
            names.push('volume_ratio');
        }

        // Volume-price relationship
        const volumePriceRatio = current.v / (current.h - current.l);
        values.push(volumePriceRatio);
        names.push('volume_price_ratio');

        // Volume momentum
        if (currentIndex > 0) {
            const prev = data[currentIndex - 1];
            const volumeMomentum = (current.v - prev.v) / prev.v;
            values.push(volumeMomentum);
            names.push('volume_momentum');
        }

        return { values, names };
    }

    /**
     * Extract market microstructure features
     */
    extractMicrostructureFeatures(data, currentIndex) {
        const values = [];
        const names = [];
        
        const current = data[currentIndex];
        
        // Bid-ask spread approximation (using high-low as proxy)
        const spread = (current.h - current.l) / current.c;
        values.push(spread);
        names.push('spread_ratio');

        // Price efficiency (how much price moved vs range)
        const priceEfficiency = Math.abs(current.c - current.o) / (current.h - current.l);
        values.push(priceEfficiency);
        names.push('price_efficiency');

        // Market impact (volume vs price movement)
        const marketImpact = current.v / Math.abs(current.c - current.o);
        values.push(marketImpact);
        names.push('market_impact');

        return { values, names };
    }

    /**
     * Normalize features using specified method
     */
    normalizeFeatures(features) {
        try {
            const matrix = new Matrix(features);
            
            if (this.config.normalizationMethod === 'minmax') {
                return this.minMaxNormalization(matrix);
            } else if (this.config.normalizationMethod === 'zscore') {
                return this.zScoreNormalization(matrix);
            } else if (this.config.normalizationMethod === 'robust') {
                return this.robustNormalization(matrix);
            } else {
                throw new Error(`Unknown normalization method: ${this.config.normalizationMethod}`);
            }
        } catch (error) {
            throw new Error(`Feature normalization failed: ${error.message}`);
        }
    }

    minMaxNormalization(matrix) {
        const min = matrix.min('row');
        const max = matrix.max('row');
        
        this.scalers.features = { 
            method: 'minmax',
            min, 
            max,
            transform: (value) => (value - min) / (max - min),
            inverseTransform: (scaledValue) => scaledValue * (max - min) + min
        };
        
        const normalized = matrix.subRowVector(min).divRowVector(max.sub(min));
        return normalized.to2DArray();
    }

    zScoreNormalization(matrix) {
        const mean = matrix.mean('row');
        const std = matrix.standardDeviation('row');
        
        this.scalers.features = {
            method: 'zscore',
            mean,
            std,
            transform: (value) => (value - mean) / std,
            inverseTransform: (scaledValue) => scaledValue * std + mean
        };
        
        const normalized = matrix.subRowVector(mean).divRowVector(std);
        return normalized.to2DArray();
    }

    robustNormalization(matrix) {
        const median = matrix.median('row');
        const mad = matrix.mad('row'); // Median Absolute Deviation
        
        this.scalers.features = {
            method: 'robust',
            median,
            mad,
            transform: (value) => (value - median) / mad,
            inverseTransform: (scaledValue) => scaledValue * mad + median
        };
        
        const normalized = matrix.subRowVector(median).divRowVector(mad);
        return normalized.to2DArray();
    }

    /**
     * Feature selection based on correlation, variance, or mutual information
     */
    selectFeatures(features, targets) {
        try {
            if (this.config.featureSelectionMethod === 'correlation') {
                return this.correlationBasedSelection(features, targets);
            } else if (this.config.featureSelectionMethod === 'variance') {
                return this.varianceBasedSelection(features);
            } else if (this.config.featureSelectionMethod === 'mutual_info') {
                return this.mutualInfoBasedSelection(features, targets);
            } else {
                logger.warn(`Unknown feature selection method: ${this.config.featureSelectionMethod}. Using all features.`);
                return { selectedFeatures: features, selectedIndices: Array.from({ length: features[0].length }, (_, i) => i) };
            }
        } catch (error) {
            logger.error('Feature selection failed:', error);
            return { selectedFeatures: features, selectedIndices: Array.from({ length: features[0].length }, (_, i) => i) };
        }
    }

    correlationBasedSelection(features, targets) {
        const matrix = new Matrix(features);
        const targetMatrix = new Matrix(targets);
        
        const correlations = [];
        for (let i = 0; i < matrix.columns; i++) {
            const featureCol = matrix.getColumn(i);
            const correlation = this.calculateCorrelation(featureCol, targetMatrix.getColumn(0));
            correlations.push({ index: i, correlation: Math.abs(correlation) });
        }
        
        correlations.sort((a, b) => b.correlation - a.correlation);
        const selectedIndices = correlations.slice(0, this.config.maxFeatures).map(c => c.index);
        
        return {
            selectedFeatures: features.map(row => selectedIndices.map(i => row[i])),
            selectedIndices,
            featureImportance: correlations.slice(0, this.config.maxFeatures)
        };
    }

    varianceBasedSelection(features) {
        const matrix = new Matrix(features);
        const variances = matrix.variance('row');
        
        const varianceIndices = variances.map((variance, index) => ({ index, variance }))
            .sort((a, b) => b.variance - a.variance)
            .slice(0, this.config.maxFeatures);
        
        const selectedIndices = varianceIndices.map(v => v.index);
        
        return {
            selectedFeatures: features.map(row => selectedIndices.map(i => row[i])),
            selectedIndices,
            featureImportance: varianceIndices
        };
    }

    mutualInfoBasedSelection(features, targets) {
        // Simplified mutual information calculation
        const matrix = new Matrix(features);
        const targetMatrix = new Matrix(targets);
        
        const mutualInfo = [];
        for (let i = 0; i < matrix.columns; i++) {
            const featureCol = matrix.getColumn(i);
            const mi = this.calculateMutualInformation(featureCol, targetMatrix.getColumn(0));
            mutualInfo.push({ index: i, mutualInfo: mi });
        }
        
        mutualInfo.sort((a, b) => b.mutualInfo - a.mutualInfo);
        const selectedIndices = mutualInfo.slice(0, this.config.maxFeatures).map(mi => mi.index);
        
        return {
            selectedFeatures: features.map(row => selectedIndices.map(i => row[i])),
            selectedIndices,
            featureImportance: mutualInfo.slice(0, this.config.maxFeatures)
        };
    }

    calculateCorrelation(x, y) {
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
        const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
        
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        
        return denominator === 0 ? 0 : numerator / denominator;
    }

    calculateMutualInformation(x, y) {
        // Simplified mutual information calculation
        const correlation = this.calculateCorrelation(x, y);
        return Math.abs(correlation);
    }

    /**
     * Split data into training, validation, and test sets
     */
    splitData(features, targets) {
        try {
            const totalSamples = features.length;
            const trainEnd = Math.floor(totalSamples * this.config.trainingRatio);
            const valEnd = Math.floor(totalSamples * (this.config.trainingRatio + this.config.validationRatio));

            const trainFeatures = features.slice(0, trainEnd);
            const trainTargets = targets.slice(0, trainEnd);
            
            const valFeatures = features.slice(trainEnd, valEnd);
            const valTargets = targets.slice(trainEnd, valEnd);
            
            const testFeatures = features.slice(valEnd);
            const testTargets = targets.slice(valEnd);

            logger.info(`Data split - Training: ${trainFeatures.length}, Validation: ${valFeatures.length}, Test: ${testFeatures.length}`);

            return {
                trainFeatures,
                trainTargets,
                valFeatures,
                valTargets,
                testFeatures,
                testTargets
            };
        } catch (error) {
            throw new Error(`Data splitting failed: ${error.message}`);
        }
    }

    /**
     * Complete data preprocessing pipeline
     */
    async preprocessData(years = 15) {
        try {
            logger.info('Starting comprehensive data preprocessing pipeline');
            
            // 1. Fetch comprehensive data
            const marketData = await this.fetchComprehensiveData(years);
            
            // 2. Extract features
            const { features, targets, featureNames } = this.extractComprehensiveFeatures(marketData);
            
            // 3. Normalize features
            const normalizedFeatures = this.normalizeFeatures(features);
            
            // 4. Feature selection
            const { selectedFeatures, selectedIndices, featureImportance } = this.selectFeatures(normalizedFeatures, targets);
            this.featureImportance = featureImportance;
            
            // 5. Split data
            const splitData = this.splitData(selectedFeatures, targets);
            
            logger.info('Data preprocessing completed successfully');
            
            return {
                ...splitData,
                featureNames: selectedIndices.map(i => featureNames[i]),
                scalers: this.scalers,
                featureImportance: this.featureImportance,
                dataQuality: this.dataQuality
            };
        } catch (error) {
            throw new Error(`Data preprocessing failed: ${error.message}`);
        }
    }
}

export default DataPreprocessor; 