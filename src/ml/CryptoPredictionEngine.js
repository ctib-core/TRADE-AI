import * as tf from '@tensorflow/tfjs';
import { Matrix } from 'ml-matrix';
import mlRfPkg from 'ml-random-forest';
import mlSvmPkg from 'ml-svm';
import mlPcaPkg from 'ml-pca';
import mlKmeansPkg from 'ml-kmeans';
import { logger } from '../utils/logger.js';
import polygonService from '../services/polygonService.js';
import ModelTrainer from './modelTrainer.js';
import marketDataBuffer from '../libs/marketDataBuffer.js';
import fs from 'fs';

const { RandomForestRegression } = mlRfPkg;
const SVM = mlSvmPkg.default || mlSvmPkg.SVM || mlSvmPkg;
const PCA = mlPcaPkg.default || mlPcaPkg.PCA || mlPcaPkg;
const KMeans = mlKmeansPkg.default || mlKmeansPkg.KMeans || mlKmeansPkg;

class CryptoPredictionEngine {
    constructor(config = {}) {
        this.config = {
            symbol: config.symbol || 'X:BTCUSD',
            lookbackPeriod: config.lookbackPeriod || 60,
            predictionHorizon: config.predictionHorizon || 5,
            trainingRatio: config.trainingRatio || 0.8,
            validationRatio: config.validationRatio || 0.1,
            // TensorFlow.js configurations
            lstmUnits: config.lstmUnits || [256, 128, 64, 32],
            dropoutRate: config.dropoutRate || 0.3,
            learningRate: config.learningRate || 0.001,
            batchSize: config.batchSize || 32,
            epochs: config.epochs || 200,
            // Ensemble model configurations
            useEnsemble: config.useEnsemble !== false,
            models: config.models || ['lstm', 'randomForest'], // Temporarily removed 'svm'
            // Feature engineering
            technicalIndicators: config.technicalIndicators || [
                'sma', 'ema', 'rsi', 'macd', 'bollinger', 'volume', 'volatility'
            ],
            // Trading parameters
            riskPercentage: config.riskPercentage || 2,
            takeProfitRatio: config.takeProfitRatio || 1.5,
            maxLeverage: config.maxLeverage || 10,
            // Self-learning parameters
            enableSelfLearning: config.enableSelfLearning !== false,
            retrainInterval: config.retrainInterval || 24 * 60 * 60 * 1000, // 24 hours
            minDataPointsForRetrain: config.minDataPointsForRetrain || 100,
            performanceThreshold: config.performanceThreshold || 0.6,
            // Advanced model configuration
            useAdvancedModel: config.useAdvancedModel !== false,
            modelType: config.modelType || 'ensemble'
        };

        this.models = {};
        this.scalers = {};
        this.featureColumns = [];
        this.isTrained = false;
        this.lastTraining = null;
        this.lastRetrain = null;
        this.predictionHistory = [];
        this.performanceMetrics = {};
        this.modelTrainer = null;
        
        // Temporarily disabled advanced model trainer due to import issues
        // if (this.config.useAdvancedModel) {
        //     this.modelTrainer = new ModelTrainer({
        //         symbol: this.config.symbol,
        //         modelType: this.config.modelType,
        //         ...this.config
        //     });
        // }
        
        logger.info('Enhanced CryptoPredictionEngine initialized with config:', this.config);
    }

    /**
     * Initialize TensorFlow.js LSTM model with advanced architecture
     */
    initializeLSTM() {
        try {
            const model = tf.sequential();
            
            // Calculate expected feature count based on configuration
            const priceFeaturesPerTimeStep = 7; // close, volume, high, low, open, vwap, transactions
            const technicalIndicators = 11; // sma10, sma20, ema10, ema20, rsi, macd, macdSignal, bbUpper, bbLower, bbMiddle, macdHistogram
            const derivedFeatures = 4; // priceChange, volatility, volumeChange, priceMomentum
            const expectedFeatureColumns = (this.config.lookbackPeriod * priceFeaturesPerTimeStep) + technicalIndicators + derivedFeatures;
            
            // Input layer - using Dense instead of LSTM for 2D input
            model.add(tf.layers.dense({
                units: this.config.lstmUnits[0],
                activation: 'relu',
                inputShape: [expectedFeatureColumns]
            }));
            model.add(tf.layers.batchNormalization());
            model.add(tf.layers.dropout({ rate: this.config.dropoutRate }));
            
            // Hidden layers
            for (let i = 1; i < this.config.lstmUnits.length - 1; i++) {
                model.add(tf.layers.dense({
                    units: this.config.lstmUnits[i],
                    activation: 'relu'
                }));
                model.add(tf.layers.batchNormalization());
                model.add(tf.layers.dropout({ rate: this.config.dropoutRate }));
            }
            
            // Dense layers for final prediction
            model.add(tf.layers.dense({
                units: 64,
                activation: 'relu'
            }));
            model.add(tf.layers.dropout({ rate: this.config.dropoutRate }));
            
            model.add(tf.layers.dense({
                units: 32,
                activation: 'relu'
            }));
            
            // Output layer
            model.add(tf.layers.dense({
                units: this.config.predictionHorizon,
                activation: 'linear'
            }));

            // Compile with advanced optimizer
            const optimizer = tf.train.adamax(this.config.learningRate);
            
            model.compile({
                optimizer: optimizer,
                loss: 'meanSquaredError',
                metrics: ['mae', 'mse']
            });

            this.models.lstm = model;
            logger.info('Advanced Neural Network model initialized successfully');
        } catch (error) {
            throw new Error(`Failed to initialize Neural Network model: ${error.message}`);
        }
    }

    /**
     * Initialize Random Forest model with hyperparameter optimization
     */
    initializeRandomForest() {
        try {
            this.models.randomForest = new RandomForestRegression({
                nEstimators: 200,
                maxDepth: 15,
                minSamplesSplit: 5,
                minSamplesLeaf: 2,
                maxFeatures: 0.5, // Use 50% of features at each split
                bootstrap: true,
                oobScore: true
            });
            logger.info('Advanced Random Forest model initialized successfully');
        } catch (error) {
            throw new Error(`Failed to initialize Random Forest model: ${error.message}`);
        }
    }

    /**
     * Initialize SVM model with advanced kernel options
     */
    initializeSVM() {
        try {
            logger.debug('SVM constructor type:', typeof SVM);
            logger.debug('SVM constructor:', SVM);
            
            if (typeof SVM !== 'function') {
                throw new Error(`SVM is not a constructor. Type: ${typeof SVM}`);
            }
            
            this.models.svm = new SVM({
                kernel: 'rbf',
                gamma: 0.1,
                C: 1.0,
                probability: true
            });
            logger.info('Advanced SVM model initialized successfully');
        } catch (error) {
            throw new Error(`Failed to initialize SVM model: ${error.message}`);
        }
    }

    /**
     * Initialize PCA for dimensionality reduction
     */
    initializePCA() {
        try {
            logger.debug('PCA constructor type:', typeof PCA);
            logger.debug('PCA constructor:', PCA);
            
            if (typeof PCA !== 'function') {
                throw new Error(`PCA is not a constructor. Type: ${typeof PCA}`);
            }
            
            this.models.pca = new PCA();
            logger.info('PCA initialized successfully');
        } catch (error) {
            throw new Error(`Failed to initialize PCA: ${error.message}`);
        }
    }

    /**
     * Initialize all models
     */
    initializeModels() {
        try {
            if (this.config.models.includes('lstm')) {
                this.initializeLSTM();
            }
            if (this.config.models.includes('randomForest')) {
                this.initializeRandomForest();
            }
            // Temporarily disabled SVM due to import issues
            // if (this.config.models.includes('svm')) {
            //     this.initializeSVM();
            // }
            // Temporarily disabled PCA due to import issues
            // if (this.config.useEnsemble) {
            //     this.initializePCA();
            // }
            
            logger.info('All models initialized successfully');
        } catch (error) {
            throw new Error(`Failed to initialize models: ${error.message}`);
        }
    }

    /**
     * Fetch and preprocess market data with extended history
     */
    async fetchMarketData() {
        try {
            logger.info(`Fetching market data for ${this.config.symbol}`);
            
            // const endDate = new Date().toISOString().split('T')[0];
            // // Fetch 10 years of daily data (3650 days) for robust training
            // const startDate = new Date(Date.now() - (3650 * 24 * 60 * 60 * 1000))
            //     .toISOString().split('T')[0];
            
            // const data = await polygonService.getMarketDataWithIndicators(
            //     this.config.symbol,
            //     'day',
            //     3650 // 10 years of data
            // );

            const endDate = new Date().toISOString().split('T')[0];

            // Fetch 2 years of daily data (730 days)
            const startDate = new Date(Date.now() - (730 * 24 * 60 * 60 * 1000))
                .toISOString().split('T')[0];

            const data = await polygonService.getMarketDataWithIndicators(
                this.config.symbol,
                'day',
                730 // 2 years of data
            );


            if (!data.results || data.results.length === 0) {
                throw new Error('No market data available');
            }

            logger.info(`Fetched ${data.results.length} data points covering ${startDate} to ${endDate}`);
            return data.results;
        } catch (error) {
            throw new Error(`Failed to fetch market data: ${error.message}`);
        }
    }

    /**
     * Extract features from market data with enhanced feature engineering
     */
    extractFeatures(marketData) {
        try {
            const features = [];
            const targets = [];

            for (let i = this.config.lookbackPeriod; i < marketData.length - this.config.predictionHorizon; i++) {
                const featureVector = [];
                
                // Price features with enhanced patterns
                for (let j = 0; j < this.config.lookbackPeriod; j++) {
                    const dataPoint = marketData[i - this.config.lookbackPeriod + j];
                    featureVector.push(
                        dataPoint.close,
                        dataPoint.volume,
                        dataPoint.high,
                        dataPoint.low,
                        dataPoint.open,
                        dataPoint.vwap || dataPoint.close,
                        dataPoint.transactions || 0
                    );
                }

                // Technical indicators with enhanced calculations
                const currentData = marketData[i];
                if (currentData.indicators) {
                    const indicators = currentData.indicators;
                    featureVector.push(
                        indicators.sma10 || 0,
                        indicators.sma20 || 0,
                        indicators.ema10 || 0,
                        indicators.ema20 || 0,
                        indicators.rsi || 0,
                        indicators.macd || 0,
                        indicators.macdSignal || 0,
                        indicators.bbUpper || 0,
                        indicators.bbLower || 0,
                        indicators.bbMiddle || 0,
                        indicators.macdHistogram || 0
                    );
                }

                // Additional derived features
                const priceChange = currentData.priceChangePercent || 0;
                const volatility = currentData.volatility || 0;
                const volumeChange = this.calculateVolumeChange(marketData, i);
                const priceMomentum = this.calculatePriceMomentum(marketData, i);
                
                featureVector.push(priceChange, volatility, volumeChange, priceMomentum);

                features.push(featureVector);
                
                // Target: future prices
                const futurePrices = [];
                for (let k = 1; k <= this.config.predictionHorizon; k++) {
                    futurePrices.push(marketData[i + k]?.close || currentData.close);
                }
                targets.push(futurePrices);
            }

            this.featureColumns = features[0]?.length || 0;
            logger.info(`Extracted ${features.length} feature vectors with ${this.featureColumns} features each`);

            return { features, targets };
        } catch (error) {
            throw new Error(`Feature extraction failed: ${error.message}`);
        }
    }

    /**
     * Calculate volume change percentage
     */
    calculateVolumeChange(marketData, index) {
        if (index < 1) return 0;
        const currentVolume = marketData[index].volume;
        const previousVolume = marketData[index - 1].volume;
        return previousVolume > 0 ? ((currentVolume - previousVolume) / previousVolume) * 100 : 0;
    }

    /**
     * Calculate price momentum
     */
    calculatePriceMomentum(marketData, index) {
        if (index < 5) return 0;
        const currentPrice = marketData[index].close;
        const price5DaysAgo = marketData[index - 5].close;
        return price5DaysAgo > 0 ? ((currentPrice - price5DaysAgo) / price5DaysAgo) * 100 : 0;
    }

    /**
     * Normalize features using Min-Max scaling
     */
    normalizeFeatures(features) {
        try {
            // Ensure all feature vectors have the same length
            const featureLength = features[0]?.length || 0;
            if (featureLength === 0) {
                throw new Error('No features to normalize');
            }
            
            // Validate all feature vectors have the same length
            for (let i = 0; i < features.length; i++) {
                if (features[i].length !== featureLength) {
                    throw new Error(`Feature vector ${i} has length ${features[i].length}, expected ${featureLength}`);
                }
            }
            
            // Manual normalization to avoid Matrix dimension issues
            const normalized = [];
            const min = new Array(featureLength).fill(Infinity);
            const max = new Array(featureLength).fill(-Infinity);
            
            // Find min and max for each feature
            for (let i = 0; i < features.length; i++) {
                for (let j = 0; j < featureLength; j++) {
                    min[j] = Math.min(min[j], features[i][j]);
                    max[j] = Math.max(max[j], features[i][j]);
                }
            }
            
            // Store scalers for later use
            this.scalers.features = { min, max };
            
            // Normalize features
            for (let i = 0; i < features.length; i++) {
                const normalizedRow = [];
                for (let j = 0; j < featureLength; j++) {
                    const range = max[j] - min[j];
                    const normalizedValue = range === 0 ? 0 : (features[i][j] - min[j]) / range;
                    normalizedRow.push(normalizedValue);
                }
                normalized.push(normalizedRow);
            }
            
            return normalized;
        } catch (error) {
            throw new Error(`Feature normalization failed: ${error.message}`);
        }
    }

    /**
     * Prepare data for TensorFlow.js
     */
    prepareTensorFlowData(features, targets) {
        try {
            const splitIndex = Math.floor(features.length * this.config.trainingRatio);
            const valSplitIndex = Math.floor(features.length * (this.config.trainingRatio + this.config.validationRatio));

            // Training data
            const trainFeatures = features.slice(0, splitIndex);
            const trainTargets = targets.slice(0, splitIndex);

            // Validation data
            const valFeatures = features.slice(splitIndex, valSplitIndex);
            const valTargets = targets.slice(splitIndex, valSplitIndex);

            // Test data
            const testFeatures = features.slice(valSplitIndex);
            const testTargets = targets.slice(valSplitIndex);

            // Convert to tensors
            const trainFeaturesTensor = tf.tensor2d(trainFeatures);
            const trainTargetsTensor = tf.tensor2d(trainTargets);
            const valFeaturesTensor = tf.tensor2d(valFeatures);
            const valTargetsTensor = tf.tensor2d(valTargets);

            return {
                trainFeatures: trainFeaturesTensor,
                trainTargets: trainTargetsTensor,
                valFeatures: valFeaturesTensor,
                valTargets: valTargetsTensor,
                testFeatures,
                testTargets
            };
        } catch (error) {
            throw new Error(`TensorFlow data preparation failed: ${error.message}`);
        }
    }

    /**
     * Train LSTM model with advanced callbacks
     */
    async trainLSTM(trainData) {
        try {
            logger.info('Training advanced LSTM model...');
            
            const { trainFeatures, trainTargets, valFeatures, valTargets } = trainData;
            
            // Advanced callbacks
            const callbacks = [
                tf.callbacks.earlyStopping({
                    monitor: 'val_loss',
                    patience: 15
                })
            ];

            const history = await this.models.lstm.fit(trainFeatures, trainTargets, {
                epochs: this.config.epochs,
                batchSize: this.config.batchSize,
                validationData: [valFeatures, valTargets],
                callbacks: callbacks,
                verbose: 1,
                shuffle: true
            });

            logger.info('Advanced LSTM training completed');
            return history;
        } catch (error) {
            throw new Error(`LSTM training failed: ${error.message}`);
        }
    }

    /**
     * Train Random Forest model with enhanced configuration
     */
    trainRandomForest(features, targets) {
        try {
            logger.info('Training advanced Random Forest model...');
            
            // Flatten features for Random Forest
            const flattenedFeatures = features.map(feature => feature.flat());
            const targetPrices = targets.map(target => target[0]); // Use first prediction horizon
            
            this.models.randomForest.train(flattenedFeatures, targetPrices);
            
            // Store feature importance
            this.featureImportance = this.models.randomForest.featureImportance;
            
            logger.info('Advanced Random Forest training completed');
            logger.info(`OOB Score: ${this.models.randomForest.oobScore}`);
        } catch (error) {
            throw new Error(`Random Forest training failed: ${error.message}`);
        }
    }

    /**
     * Train SVM model with enhanced configuration
     */
    trainSVM(features, targets) {
        try {
            logger.info('Training advanced SVM model...');
            
            // Flatten features for SVM
            const flattenedFeatures = features.map(feature => feature.flat());
            const targetPrices = targets.map(target => target[0]); // Use first prediction horizon
            
            this.models.svm.train(flattenedFeatures, targetPrices);
            
            logger.info('Advanced SVM training completed');
        } catch (error) {
            throw new Error(`SVM training failed: ${error.message}`);
        }
    }

    /**
     * Train all models with advanced configuration
     */
    async trainModels() {
        try {
            logger.info('Starting advanced model training...');
            
                        // Use standard training (advanced ModelTrainer temporarily disabled)
            const marketData = await this.fetchMarketData();
            const { features, targets } = this.extractFeatures(marketData);
            const normalizedFeatures = this.normalizeFeatures(features);
            
            // Train individual models
            if (this.config.models.includes('lstm')) {
                const tensorData = this.prepareTensorFlowData(normalizedFeatures, targets);
                await this.trainLSTM(tensorData);
            }
            
            if (this.config.models.includes('randomForest')) {
                this.trainRandomForest(normalizedFeatures, targets);
            }
            
            // Temporarily disabled SVM training due to import issues
            // if (this.config.models.includes('svm')) {
            //     this.trainSVM(normalizedFeatures, targets);
            // }
            
            this.isTrained = true;
            this.lastTraining = new Date().toISOString();
            logger.info('All models trained successfully');
        } catch (error) {
            throw new Error(`Model training failed: ${error.message}`);
        }
    }

    /**
     * Make predictions using ensemble approach with confidence scoring
     */
    async predict(inputData) {
        try {
            if (!this.isTrained) {
                throw new Error('Models not trained yet');
            }

            const predictions = {};
            const normalizedInput = this.normalizeFeatures([inputData.flat()])[0];

            // Neural Network prediction
            if (this.models.lstm) {
                // Ensure input has the correct shape
                const expectedFeatureColumns = (this.config.lookbackPeriod * 7) + 11 + 4;
                if (normalizedInput.length !== expectedFeatureColumns) {
                    throw new Error(`Input feature count mismatch. Expected ${expectedFeatureColumns}, got ${normalizedInput.length}`);
                }
                const inputTensor = tf.tensor2d([normalizedInput]);
                const nnPrediction = await this.models.lstm.predict(inputTensor).array();
                predictions.lstm = nnPrediction[0];
                inputTensor.dispose();
            }

            // Random Forest prediction
            if (this.models.randomForest) {
                const rfPrediction = this.models.randomForest.predict([normalizedInput.flat()]);
                predictions.randomForest = [rfPrediction];
            }

            // Temporarily disabled SVM prediction due to import issues
            // if (this.models.svm) {
            //     const svmPrediction = this.models.svm.predict([normalizedInput.flat()]);
            //     predictions.svm = [svmPrediction];
            // }

            // Ensemble prediction (weighted average)
            const ensemblePrediction = this.ensemblePredictions(predictions);
            const confidence = this.calculateConfidence(predictions);
            
            return {
                predictions,
                ensemble: ensemblePrediction,
                confidence: confidence
            };
        } catch (error) {
            throw new Error(`Prediction failed: ${error.message}`);
        }
    }

    /**
     * Ensemble predictions using weighted average with dynamic weights
     */
    ensemblePredictions(predictions) {
        // Dynamic weights based on model performance
        const weights = this.calculateDynamicWeights(predictions);

        let weightedSum = 0;
        let totalWeight = 0;

        Object.keys(predictions).forEach(model => {
            if (predictions[model] && weights[model]) {
                weightedSum += predictions[model][0] * weights[model];
                totalWeight += weights[model];
            }
        });

        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }

    /**
     * Calculate dynamic weights based on model performance
     */
    calculateDynamicWeights(predictions) {
        const baseWeights = {
            lstm: 0.6,
            randomForest: 0.4
            // svm: 0.25 - temporarily disabled
        };

        // Adjust weights based on recent performance
        if (this.performanceMetrics) {
            const performanceAdjustment = 0.1;
            
            Object.keys(baseWeights).forEach(model => {
                if (this.performanceMetrics[model]) {
                    const performance = this.performanceMetrics[model].accuracy || 0.5;
                    baseWeights[model] += (performance - 0.5) * performanceAdjustment;
                }
            });
        }

        return baseWeights;
    }

    /**
     * Calculate prediction confidence with enhanced metrics
     */
    calculateConfidence(predictions) {
        const values = Object.values(predictions).filter(p => p && p[0]);
        if (values.length < 2) return 0.5;

        const mean = values.reduce((sum, p) => sum + p[0], 0) / values.length;
        const variance = values.reduce((sum, p) => sum + Math.pow(p[0] - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        // Enhanced confidence calculation
        const baseConfidence = Math.max(0, 1 - (stdDev / mean));
        const modelAgreement = this.calculateModelAgreement(values);
        
        const finalConfidence = (baseConfidence + modelAgreement) / 2;
        
        // Ensure confidence is between 0 and 1
        return Math.max(0, Math.min(1, finalConfidence));
    }

    /**
     * Calculate model agreement score
     */
    calculateModelAgreement(values) {
        if (values.length < 2) return 0.5;
        
        const sortedValues = values.map(v => v[0]).sort((a, b) => a - b);
        const range = sortedValues[sortedValues.length - 1] - sortedValues[0];
        const mean = sortedValues.reduce((sum, v) => sum + v, 0) / sortedValues.length;
        
        // Higher agreement for smaller range relative to mean
        return Math.max(0, 1 - (range / mean));
    }

    /**
     * Generate trading signals for CFD trading with enhanced analysis
     * This method is now deprecated in favor of the new CFD approach in trading.js
     */
    generateTradingSignals(currentPrice, predictedPrice, confidence) {
        try {
            const priceChangePercent = ((predictedPrice - currentPrice) / currentPrice) * 100;
            const minConfidence = 0.65; // Increased confidence threshold
            const minPriceChange = 1.5; // Increased minimum change

            if (confidence < minConfidence || Math.abs(priceChangePercent) < minPriceChange) {
                return {
                    signal: 'HOLD',
                    confidence: confidence,
                    reason: 'Insufficient confidence or price movement',
                    analysis: {
                        confidenceThreshold: minConfidence,
                        priceChangeThreshold: minPriceChange,
                        currentConfidence: confidence,
                        currentPriceChange: priceChangePercent
                    }
                };
            }

            const signal = priceChangePercent > 0 ? 'BUY' : 'SELL';
            const stopLossPercent = this.config.riskPercentage;
            const takeProfitPercent = stopLossPercent * this.config.takeProfitRatio;

            let stopLoss, takeProfit;

            if (signal === 'BUY') {
                stopLoss = currentPrice * (1 - stopLossPercent / 100);
                takeProfit = currentPrice * (1 + takeProfitPercent / 100);
            } else {
                stopLoss = currentPrice * (1 + stopLossPercent / 100);
                takeProfit = currentPrice * (1 - takeProfitPercent / 100);
            }

            return {
                signal: signal,
                entry: currentPrice,
                predictedPrice: predictedPrice,
                stopLoss: stopLoss,
                takeProfit: takeProfit,
                priceChangePercent: priceChangePercent,
                confidence: confidence,
                riskRewardRatio: takeProfitPercent / stopLossPercent,
                leverage: Math.min(this.config.maxLeverage, Math.floor(confidence * 10)),
                analysis: {
                    signalStrength: Math.abs(priceChangePercent) / minPriceChange,
                    confidenceScore: confidence,
                    riskAssessment: this.assessRisk(confidence, priceChangePercent)
                }
            };
        } catch (error) {
            throw new Error(`Trading signal generation failed: ${error.message}`);
        }
    }

    /**
     * Assess risk level based on confidence and price change
     */
    assessRisk(confidence, priceChangePercent) {
        const riskScore = (1 - confidence) + (Math.abs(priceChangePercent) / 10);
        
        if (riskScore < 0.3) return 'LOW';
        if (riskScore < 0.6) return 'MEDIUM';
        return 'HIGH';
    }

    /**
     * Run complete prediction pipeline with self-learning
     */
    async runPrediction() {
        try {
            logger.info('Running enhanced prediction pipeline...');
            
            // Check if retraining is needed
            if (this.config.enableSelfLearning && this.shouldRetrain()) {
                logger.info('Initiating self-learning retraining...');
                await this.retrainModels();
            }
            
            // Get latest market data
            const marketData = await this.fetchMarketData();
            const latestData = marketData.slice(-this.config.lookbackPeriod);
            
            // Extract features for prediction
            const { features } = this.extractFeatures(marketData);
            const latestFeatures = features[features.length - 1];
            
            // Make prediction
            const predictionResult = await this.predict(latestFeatures);
            const currentPrice = latestData[latestData.length - 1].close;
            
            // Store prediction for self-learning
            this.storePrediction({
                timestamp: new Date().toISOString(),
                currentPrice,
                predictedPrice: predictionResult.ensemble,
                actualPrice: null, // Will be updated later
                confidence: predictionResult.confidence,
                signal: null // Signal will be determined by trading route
            });

            return {
                symbol: this.config.symbol,
                timestamp: new Date().toISOString(),
                currentPrice: currentPrice,
                prediction: predictionResult,
                marketData: {
                    lastUpdate: latestData[latestData.length - 1].date,
                    dataPoints: latestData.length
                },
                modelInfo: {
                    isTrained: this.isTrained,
                    lastTraining: this.lastTraining,
                    lastRetrain: this.lastRetrain,
                    predictionCount: this.predictionHistory.length,
                    performanceMetrics: this.performanceMetrics
                }
            };
        } catch (error) {
            throw new Error(`Prediction pipeline failed: ${error.message}`);
        }
    }

    /**
     * Check if retraining is needed
     */
    shouldRetrain() {
        if (!this.lastRetrain) return true;
        
        const timeSinceRetrain = Date.now() - new Date(this.lastRetrain).getTime();
        const hasEnoughData = this.predictionHistory.length >= this.config.minDataPointsForRetrain;
        const performanceBelowThreshold = this.getOverallPerformance() < this.config.performanceThreshold;
        
        return timeSinceRetrain > this.config.retrainInterval || 
               (hasEnoughData && performanceBelowThreshold);
    }

    /**
     * Get overall model performance
     */
    getOverallPerformance() {
        if (!this.performanceMetrics) return 0.5;
        
        const metrics = Object.values(this.performanceMetrics);
        if (metrics.length === 0) return 0.5;
        
        const avgAccuracy = metrics.reduce((sum, metric) => sum + (metric.accuracy || 0), 0) / metrics.length;
        return avgAccuracy;
    }

    /**
     * Retrain models with new data
     */
    async retrainModels() {
        try {
            logger.info('Starting self-learning retraining...');
            
            // Update performance metrics based on historical predictions
            this.updatePerformanceMetrics();
            
            // Retrain models
            await this.trainModels();
            
            this.lastRetrain = new Date().toISOString();
            logger.info('Self-learning retraining completed');
        } catch (error) {
            logger.error('Self-learning retraining failed:', error);
        }
    }

    /**
     * Store prediction for later performance evaluation
     */
    storePrediction(prediction) {
        this.predictionHistory.push(prediction);
        
        // Keep only recent predictions (last 1000)
        if (this.predictionHistory.length > 1000) {
            this.predictionHistory = this.predictionHistory.slice(-1000);
        }
    }

    /**
     * Update performance metrics based on historical predictions
     */
    updatePerformanceMetrics() {
        if (this.predictionHistory.length < 10) return;
        
        const recentPredictions = this.predictionHistory.slice(-100);
        const metrics = {};
        
        // Calculate accuracy for each model type
        const modelTypes = ['lstm', 'randomForest', 'svm'];
        
        modelTypes.forEach(modelType => {
            const modelPredictions = recentPredictions.filter(p => p.modelType === modelType);
            if (modelPredictions.length > 0) {
                const accuracy = this.calculatePredictionAccuracy(modelPredictions);
                metrics[modelType] = { accuracy };
            }
        });
        
        this.performanceMetrics = metrics;
    }

    /**
     * Calculate prediction accuracy
     */
    calculatePredictionAccuracy(predictions) {
        let correctPredictions = 0;
        let totalPredictions = 0;
        
        predictions.forEach(prediction => {
            if (prediction.actualPrice !== null) {
                const predictedDirection = prediction.predictedPrice > prediction.currentPrice;
                const actualDirection = prediction.actualPrice > prediction.currentPrice;
                
                if (predictedDirection === actualDirection) {
                    correctPredictions++;
                }
                totalPredictions++;
            }
        });
        
        return totalPredictions > 0 ? correctPredictions / totalPredictions : 0.5;
    }

    /**
     * Save trained models with comprehensive metadata as JSON
     */
    async saveModels(path = './models') {
        try {
            const modelPath = `${path}/${this.config.symbol.replace(':', '_')}`;
            
            // Ensure model directory exists
            const fs = await import('fs');
            const pathModule = await import('path');
            
            if (!fs.existsSync(modelPath)) {
                fs.mkdirSync(modelPath, { recursive: true });
            }
            
            // Save TensorFlow.js model as JSON with weights
            if (this.models.lstm) {
                // Use the proper TensorFlow.js save method that includes weights
                const modelJson = await this.models.lstm.save(tf.io.withSaveHandler(async (artifacts) => {
                    // Convert weight data to base64 for JSON storage
                    const weightData = artifacts.weightData;
                    const weightDataBase64 = tf.io.encodeWeights(weightData);
                    
                    return {
                        modelTopology: artifacts.modelTopology,
                        weightSpecs: artifacts.weightSpecs,
                        weightData: weightDataBase64,
                        format: artifacts.format,
                        generatedBy: artifacts.generatedBy,
                        convertedBy: artifacts.convertedBy
                    };
                }));
                
                // Save the model JSON
                const modelFilePath = pathModule.join(modelPath, 'neural_network.json');
                fs.writeFileSync(modelFilePath, JSON.stringify(modelJson, null, 2));
                logger.info(`Neural Network model saved to: ${modelFilePath}`);
            }
            
            // Save metadata
            const modelData = {
                symbol: this.config.symbol,
                savedAt: new Date().toISOString(),
                scalers: this.scalers,
                config: this.config,
                featureColumns: this.featureColumns,
                isTrained: this.isTrained,
                lastTraining: this.lastTraining,
                lastRetrain: this.lastRetrain,
                performanceMetrics: this.performanceMetrics,
                featureImportance: this.featureImportance,
                evaluationMetrics: this.evaluationMetrics
            };
            
            // Save other model data (simplified for ml-matrix models)
            const modelStatus = {
                randomForest: this.models.randomForest ? 'trained' : null,
                svm: this.models.svm ? 'trained' : null,
                pca: this.models.pca ? 'initialized' : null
            };
            
            // Save metadata as JSON
            const metadataPath = pathModule.join(modelPath, 'metadata.json');
            fs.writeFileSync(metadataPath, JSON.stringify(modelData, null, 2));
            
            // Save model status as JSON
            const statusPath = pathModule.join(modelPath, 'model_status.json');
            fs.writeFileSync(statusPath, JSON.stringify(modelStatus, null, 2));
            
            logger.info('All models saved successfully as JSON files');
        } catch (error) {
            throw new Error(`Failed to save models: ${error.message}`);
        }
    }

    /**
     * Load trained models from JSON files
     */
    async loadModels(path = './models') {
        try {
            const modelPath = `${path}/${this.config.symbol.replace(':', '_')}`;
            
            // Import required modules
            const fs = await import('fs');
            const pathModule = await import('path');
            
            // Check if model directory exists
            if (!fs.existsSync(modelPath)) {
                throw new Error(`Model directory not found: ${modelPath}`);
            }
            
            // Load metadata
            const metadataPath = pathModule.join(modelPath, 'metadata.json');
            if (fs.existsSync(metadataPath)) {
                const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                
                // Override config with saved values to ensure compatibility
                this.config = { ...this.config, ...metadata.config };
                this.scalers = metadata.scalers;
                this.featureColumns = metadata.featureColumns;
                this.isTrained = metadata.isTrained;
                this.lastTraining = metadata.lastTraining;
                this.lastRetrain = metadata.lastRetrain;
                this.performanceMetrics = metadata.performanceMetrics;
                this.featureImportance = metadata.featureImportance;
                this.evaluationMetrics = metadata.evaluationMetrics;
                
                logger.info('Model metadata loaded successfully');
                logger.info(`Loaded config: lookbackPeriod=${this.config.lookbackPeriod}, featureColumns=${this.featureColumns}`);
            }
            
            // Initialize only LSTM model (skip Random Forest for now since it can't be easily loaded)
            if (this.config.models.includes('lstm')) {
                this.initializeLSTM();
            }
            
            // Load TensorFlow.js model from JSON
            const neuralNetworkPath = pathModule.join(modelPath, 'neural_network.json');
            if (fs.existsSync(neuralNetworkPath)) {
                const modelJson = fs.readFileSync(neuralNetworkPath, 'utf8');
                const modelArtifacts = JSON.parse(modelJson);
                
                // Decode the weight data from base64
                if (modelArtifacts.weightData) {
                    const weightData = tf.io.decodeWeights(modelArtifacts.weightData);
                    modelArtifacts.weightData = weightData;
                }
                
                // Load model using fromMemory handler
                this.models.lstm = await tf.loadLayersModel(tf.io.fromMemory(modelArtifacts));
                logger.info('Neural Network model loaded successfully from JSON');
            }
            
            // Load model status
            const statusPath = pathModule.join(modelPath, 'model_status.json');
            if (fs.existsSync(statusPath)) {
                const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
                logger.info('Model status loaded:', status);
            }
            
            // Set isTrained to true since we successfully loaded the models
            this.isTrained = true;
            
            logger.info('All models loaded successfully from JSON files');
        } catch (error) {
            throw new Error(`Failed to load models: ${error.message}`);
        }
    }
}

export default CryptoPredictionEngine; 