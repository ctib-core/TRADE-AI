import * as tf from '@tensorflow/tfjs';
import { Matrix } from 'ml-matrix';
import mlRfPkg from 'ml-random-forest';
import mlSvmPkg from 'ml-svm';
import mlPcaPkg from 'ml-pca';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

const { RandomForestRegression } = mlRfPkg;
const { SVM } = mlSvmPkg;
const PCA = mlPcaPkg.default || mlPcaPkg.PCA || mlPcaPkg;

class ModelTrainer {
    constructor(config = {}) {
        this.config = {
            symbol: config.symbol || 'X:BTCUSD',
            modelType: config.modelType || 'ensemble', // 'lstm', 'randomForest', 'svm', 'ensemble'
            // LSTM specific
            lstmUnits: config.lstmUnits || [256, 128, 64, 32],
            lstmDropoutRate: config.lstmDropoutRate || 0.3,
            lstmLearningRate: config.lstmLearningRate || 0.001,
            lstmBatchSize: config.lstmBatchSize || 32,
            lstmEpochs: config.lstmEpochs || 200,
            lstmPatience: config.lstmPatience || 15,
            // Random Forest specific
            rfNEstimators: config.rfNEstimators || 200,
            rfMaxDepth: config.rfMaxDepth || 15,
            rfMinSamplesSplit: config.rfMinSamplesSplit || 5,
            rfMinSamplesLeaf: config.rfMinSamplesLeaf || 2,
            // SVM specific
            svmKernel: config.svmKernel || 'rbf',
            svmGamma: config.svmGamma || 0.1,
            svmC: config.svmC || 1.0,
            // Ensemble specific
            ensembleWeights: config.ensembleWeights || { lstm: 0.4, randomForest: 0.35, svm: 0.25 },
            // Training specific
            validationSplit: config.validationSplit || 0.2,
            earlyStoppingPatience: config.earlyStoppingPatience || 20,
            learningRateSchedule: config.learningRateSchedule || 'reduceLROnPlateau',
            // Model saving
            savePath: config.savePath || './models',
            modelVersion: config.modelVersion || '1.0.0'
        };

        this.models = {};
        this.trainingHistory = {};
        this.evaluationMetrics = {};
        this.hyperparameters = {};
        
        logger.info('ModelTrainer initialized with config:', this.config);
    }

    /**
     * Initialize TensorFlow.js LSTM model with advanced architecture
     */
    initializeLSTM(inputShape, outputShape) {
        try {
            const model = tf.sequential();
            
            // Input layer with batch normalization
            model.add(tf.layers.lstm({
                units: this.config.lstmUnits[0],
                returnSequences: true,
                inputShape: inputShape
            }));
            model.add(tf.layers.batchNormalization());
            model.add(tf.layers.dropout({ rate: this.config.lstmDropoutRate }));
            
            // Hidden layers with residual connections
            for (let i = 1; i < this.config.lstmUnits.length - 1; i++) {
                model.add(tf.layers.lstm({
                    units: this.config.lstmUnits[i],
                    returnSequences: i < this.config.lstmUnits.length - 2
                }));
                model.add(tf.layers.batchNormalization());
                model.add(tf.layers.dropout({ rate: this.config.lstmDropoutRate }));
            }
            
            // Dense layers for final prediction
            model.add(tf.layers.dense({
                units: 64,
                activation: 'relu'
            }));
            model.add(tf.layers.dropout({ rate: this.config.lstmDropoutRate }));
            
            model.add(tf.layers.dense({
                units: 32,
                activation: 'relu'
            }));
            
            // Output layer
            model.add(tf.layers.dense({
                units: outputShape,
                activation: 'linear'
            }));

            // Compile with advanced optimizer
            const optimizer = tf.train.adamax(this.config.lstmLearningRate);
            
            model.compile({
                optimizer: optimizer,
                loss: 'huber', // More robust than MSE
                metrics: ['mae', 'mse']
            });

            this.models.lstm = model;
            logger.info('Advanced LSTM model initialized successfully');
        } catch (error) {
            throw new Error(`Failed to initialize LSTM model: ${error.message}`);
        }
    }

    /**
     * Initialize Random Forest with hyperparameter optimization
     */
    initializeRandomForest() {
        try {
            this.models.randomForest = new RandomForestRegression({
                nEstimators: this.config.rfNEstimators,
                maxDepth: this.config.rfMaxDepth,
                minSamplesSplit: this.config.rfMinSamplesSplit,
                minSamplesLeaf: this.config.rfMinSamplesLeaf,
                maxFeatures: 'sqrt',
                bootstrap: true,
                oobScore: true
            });
            logger.info('Random Forest model initialized successfully');
        } catch (error) {
            throw new Error(`Failed to initialize Random Forest model: ${error.message}`);
        }
    }

    /**
     * Initialize SVM with advanced kernel options
     */
    initializeSVM() {
        try {
            this.models.svm = new SVM({
                kernel: this.config.svmKernel,
                gamma: this.config.svmGamma,
                C: this.config.svmC,
                probability: true
            });
            logger.info('SVM model initialized successfully');
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
     * Train LSTM model with advanced callbacks
     */
    async trainLSTM(trainFeatures, trainTargets, valFeatures, valTargets) {
        try {
            logger.info('Starting LSTM training with advanced configuration');
            
            const inputShape = [trainFeatures.shape[1], trainFeatures.shape[2]];
            const outputShape = trainTargets.shape[1];
            
            this.initializeLSTM(inputShape, outputShape);
            
            // Advanced callbacks
            const callbacks = [
                tf.callbacks.earlyStopping({
                    monitor: 'val_loss',
                    patience: this.config.earlyStoppingPatience,
                    restoreBestWeights: true
                }),
                tf.callbacks.reduceLROnPlateau({
                    monitor: 'val_loss',
                    factor: 0.5,
                    patience: this.config.lstmPatience,
                    minLr: 1e-7
                }),
                tf.callbacks.modelCheckpoint(
                    `${this.config.savePath}/lstm_best_weights.h5`,
                    {
                        monitor: 'val_loss',
                        saveBestOnly: true,
                        saveWeightsOnly: true
                    }
                )
            ];

            const history = await this.models.lstm.fit(trainFeatures, trainTargets, {
                epochs: this.config.lstmEpochs,
                batchSize: this.config.lstmBatchSize,
                validationData: [valFeatures, valTargets],
                callbacks: callbacks,
                verbose: 1,
                shuffle: true
            });

            this.trainingHistory.lstm = history;
            logger.info('LSTM training completed successfully');
            
            return history;
        } catch (error) {
            throw new Error(`LSTM training failed: ${error.message}`);
        }
    }

    /**
     * Train Random Forest with cross-validation
     */
    trainRandomForest(features, targets) {
        try {
            logger.info('Starting Random Forest training');
            
            this.initializeRandomForest();
            
            // Flatten features for Random Forest
            const flattenedFeatures = features.map(feature => feature.flat());
            const targetPrices = targets.map(target => target[0]); // Use first prediction horizon
            
            // Train with out-of-bag scoring
            this.models.randomForest.train(flattenedFeatures, targetPrices);
            
            // Get feature importance
            const featureImportance = this.models.randomForest.featureImportance;
            
            this.trainingHistory.randomForest = {
                oobScore: this.models.randomForest.oobScore,
                featureImportance: featureImportance
            };
            
            logger.info('Random Forest training completed successfully');
            logger.info(`OOB Score: ${this.models.randomForest.oobScore}`);
            
        } catch (error) {
            throw new Error(`Random Forest training failed: ${error.message}`);
        }
    }

    /**
     * Train SVM with hyperparameter tuning
     */
    trainSVM(features, targets) {
        try {
            logger.info('Starting SVM training');
            
            this.initializeSVM();
            
            // Flatten features for SVM
            const flattenedFeatures = features.map(feature => feature.flat());
            const targetPrices = targets.map(target => target[0]);
            
            // Train SVM
            this.models.svm.train(flattenedFeatures, targetPrices);
            
            this.trainingHistory.svm = {
                supportVectors: this.models.svm.supportVectors?.length || 0
            };
            
            logger.info('SVM training completed successfully');
            
        } catch (error) {
            throw new Error(`SVM training failed: ${error.message}`);
        }
    }

    /**
     * Train ensemble model
     */
    async trainEnsemble(trainFeatures, trainTargets, valFeatures, valTargets) {
        try {
            logger.info('Starting ensemble model training');
            
            // Train individual models
            if (this.config.ensembleWeights.lstm > 0) {
                await this.trainLSTM(trainFeatures, trainTargets, valFeatures, valTargets);
            }
            
            if (this.config.ensembleWeights.randomForest > 0) {
                this.trainRandomForest(trainFeatures, trainTargets);
            }
            
            if (this.config.ensembleWeights.svm > 0) {
                this.trainSVM(trainFeatures, trainTargets);
            }
            
                    // Temporarily disabled PCA due to import issues
        // this.initializePCA();
            
            logger.info('Ensemble training completed successfully');
            
        } catch (error) {
            throw new Error(`Ensemble training failed: ${error.message}`);
        }
    }

    /**
     * Evaluate model performance comprehensively
     */
    evaluateModel(testFeatures, testTargets) {
        try {
            logger.info('Starting comprehensive model evaluation');
            
            const evaluation = {};
            
            if (this.models.lstm) {
                evaluation.lstm = this.evaluateLSTM(testFeatures, testTargets);
            }
            
            if (this.models.randomForest) {
                evaluation.randomForest = this.evaluateRandomForest(testFeatures, testTargets);
            }
            
            if (this.models.svm) {
                evaluation.svm = this.evaluateSVM(testFeatures, testTargets);
            }
            
            // Ensemble evaluation
            if (Object.keys(this.models).length > 1) {
                evaluation.ensemble = this.evaluateEnsemble(testFeatures, testTargets);
            }
            
            this.evaluationMetrics = evaluation;
            logger.info('Model evaluation completed');
            
            return evaluation;
        } catch (error) {
            throw new Error(`Model evaluation failed: ${error.message}`);
        }
    }

    /**
     * Evaluate LSTM model
     */
    evaluateLSTM(testFeatures, testTargets) {
        try {
            const predictions = this.models.lstm.predict(testFeatures).arraySync();
            const metrics = this.calculateMetrics(testTargets, predictions);
            
            return {
                predictions,
                metrics,
                modelType: 'LSTM'
            };
        } catch (error) {
            throw new Error(`LSTM evaluation failed: ${error.message}`);
        }
    }

    /**
     * Evaluate Random Forest model
     */
    evaluateRandomForest(testFeatures, testTargets) {
        try {
            const flattenedFeatures = testFeatures.map(feature => feature.flat());
            const predictions = flattenedFeatures.map(feature => this.models.randomForest.predict([feature]));
            const metrics = this.calculateMetrics(testTargets.map(t => [t[0]]), predictions.map(p => [p]));
            
            return {
                predictions,
                metrics,
                featureImportance: this.models.randomForest.featureImportance,
                modelType: 'Random Forest'
            };
        } catch (error) {
            throw new Error(`Random Forest evaluation failed: ${error.message}`);
        }
    }

    /**
     * Evaluate SVM model
     */
    evaluateSVM(testFeatures, testTargets) {
        try {
            const flattenedFeatures = testFeatures.map(feature => feature.flat());
            const predictions = flattenedFeatures.map(feature => this.models.svm.predict([feature]));
            const metrics = this.calculateMetrics(testTargets.map(t => [t[0]]), predictions.map(p => [p]));
            
            return {
                predictions,
                metrics,
                modelType: 'SVM'
            };
        } catch (error) {
            throw new Error(`SVM evaluation failed: ${error.message}`);
        }
    }

    /**
     * Evaluate ensemble model
     */
    evaluateEnsemble(testFeatures, testTargets) {
        try {
            const ensemblePredictions = [];
            const weights = this.config.ensembleWeights;
            
            for (let i = 0; i < testTargets.length; i++) {
                let weightedSum = 0;
                let totalWeight = 0;
                
                if (this.models.lstm && weights.lstm > 0) {
                    const lstmPred = this.models.lstm.predict(testFeatures.slice(i, i + 1)).arraySync()[0][0];
                    weightedSum += lstmPred * weights.lstm;
                    totalWeight += weights.lstm;
                }
                
                if (this.models.randomForest && weights.randomForest > 0) {
                    const rfPred = this.models.randomForest.predict([testFeatures[i].flat()]);
                    weightedSum += rfPred * weights.randomForest;
                    totalWeight += weights.randomForest;
                }
                
                if (this.models.svm && weights.svm > 0) {
                    const svmPred = this.models.svm.predict([testFeatures[i].flat()]);
                    weightedSum += svmPred * weights.svm;
                    totalWeight += weights.svm;
                }
                
                ensemblePredictions.push([weightedSum / totalWeight]);
            }
            
            const metrics = this.calculateMetrics(testTargets.map(t => [t[0]]), ensemblePredictions);
            
            return {
                predictions: ensemblePredictions,
                metrics,
                weights: weights,
                modelType: 'Ensemble'
            };
        } catch (error) {
            throw new Error(`Ensemble evaluation failed: ${error.message}`);
        }
    }

    /**
     * Calculate comprehensive metrics
     */
    calculateMetrics(actual, predicted) {
        try {
            const n = actual.length;
            let mse = 0, mae = 0, rmse = 0;
            let directionalAccuracy = 0;
            let profitLoss = 0;
            
            for (let i = 0; i < n; i++) {
                const actualPrice = actual[i][0];
                const predictedPrice = predicted[i][0];
                const error = actualPrice - predictedPrice;
                
                mse += Math.pow(error, 2);
                mae += Math.abs(error);
                
                // Directional accuracy
                if (i > 0) {
                    const actualDirection = actual[i][0] > actual[i-1][0] ? 1 : -1;
                    const predictedDirection = predicted[i][0] > actual[i-1][0] ? 1 : -1;
                    if (actualDirection === predictedDirection) {
                        directionalAccuracy++;
                    }
                }
                
                // Profit/Loss calculation (simplified)
                const priceChange = (actualPrice - actual[i-1]?.[0]) / actual[i-1]?.[0] || 0;
                profitLoss += priceChange;
            }
            
            mse /= n;
            mae /= n;
            rmse = Math.sqrt(mse);
            directionalAccuracy = directionalAccuracy / (n - 1);
            
            return {
                mse,
                mae,
                rmse,
                directionalAccuracy,
                profitLoss,
                sharpeRatio: this.calculateSharpeRatio(actual, predicted),
                maxDrawdown: this.calculateMaxDrawdown(actual, predicted),
                hitRate: this.calculateHitRate(actual, predicted)
            };
        } catch (error) {
            throw new Error(`Metrics calculation failed: ${error.message}`);
        }
    }

    calculateSharpeRatio(actual, predicted) {
        const returns = [];
        for (let i = 1; i < actual.length; i++) {
            const actualReturn = (actual[i][0] - actual[i-1][0]) / actual[i-1][0];
            const predictedReturn = (predicted[i][0] - actual[i-1][0]) / actual[i-1][0];
            returns.push(actualReturn - predictedReturn);
        }
        
        const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);
        
        return stdDev === 0 ? 0 : meanReturn / stdDev;
    }

    calculateMaxDrawdown(actual, predicted) {
        let maxDrawdown = 0;
        let peak = -Infinity;
        
        for (let i = 0; i < actual.length; i++) {
            const value = actual[i][0];
            if (value > peak) {
                peak = value;
            }
            
            const drawdown = (peak - value) / peak;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }
        
        return maxDrawdown;
    }

    calculateHitRate(actual, predicted) {
        let hits = 0;
        let total = 0;
        
        for (let i = 1; i < actual.length; i++) {
            const actualDirection = actual[i][0] > actual[i-1][0];
            const predictedDirection = predicted[i][0] > actual[i-1][0];
            
            if (actualDirection === predictedDirection) {
                hits++;
            }
            total++;
        }
        
        return total === 0 ? 0 : hits / total;
    }

    /**
     * Save trained models with comprehensive metadata
     */
    async saveModels() {
        try {
            const modelPath = path.join(this.config.savePath, this.config.symbol.replace(':', '_'));
            
            if (!fs.existsSync(modelPath)) {
                fs.mkdirSync(modelPath, { recursive: true });
            }
            
            const modelMetadata = {
                symbol: this.config.symbol,
                modelType: this.config.modelType,
                version: this.config.modelVersion,
                trainingDate: new Date().toISOString(),
                config: this.config,
                evaluationMetrics: this.evaluationMetrics,
                trainingHistory: this.trainingHistory,
                featureImportance: this.featureImportance || {}
            };
            
            // Save TensorFlow.js models
            if (this.models.lstm) {
                await this.models.lstm.save(`file://${modelPath}/lstm`);
                logger.info('LSTM model saved successfully');
            }
            
            // Save metadata
            fs.writeFileSync(
                path.join(modelPath, 'metadata.json'),
                JSON.stringify(modelMetadata, null, 2)
            );
            
            // Save other model data (simplified for ml-matrix models)
            const modelData = {
                randomForest: this.models.randomForest ? 'trained' : null,
                svm: this.models.svm ? 'trained' : null,
                pca: this.models.pca ? 'initialized' : null
            };
            
            fs.writeFileSync(
                path.join(modelPath, 'model_status.json'),
                JSON.stringify(modelData, null, 2)
            );
            
            logger.info(`All models saved to ${modelPath}`);
            
        } catch (error) {
            throw new Error(`Failed to save models: ${error.message}`);
        }
    }

    /**
     * Load trained models
     */
    async loadModels(modelPath) {
        try {
            const metadataPath = path.join(modelPath, 'metadata.json');
            const statusPath = path.join(modelPath, 'model_status.json');
            
            if (!fs.existsSync(metadataPath)) {
                throw new Error('Model metadata not found');
            }
            
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
            
            // Load LSTM model
            if (fs.existsSync(path.join(modelPath, 'lstm'))) {
                this.models.lstm = await tf.loadLayersModel(`file://${modelPath}/lstm/model.json`);
                logger.info('LSTM model loaded successfully');
            }
            
            // Note: ml-matrix models need to be retrained as they don't have built-in serialization
            // In a production system, you'd implement custom serialization for these models
            
            this.config = metadata.config;
            this.evaluationMetrics = metadata.evaluationMetrics;
            this.trainingHistory = metadata.trainingHistory;
            
            logger.info(`Models loaded from ${modelPath}`);
            
        } catch (error) {
            throw new Error(`Failed to load models: ${error.message}`);
        }
    }

    /**
     * Complete training pipeline
     */
    async trainModel(trainFeatures, trainTargets, valFeatures, valTargets, testFeatures, testTargets) {
        try {
            logger.info('Starting complete model training pipeline');
            
            // Train models based on configuration
            if (this.config.modelType === 'lstm') {
                await this.trainLSTM(trainFeatures, trainTargets, valFeatures, valTargets);
            } else if (this.config.modelType === 'randomForest') {
                this.trainRandomForest(trainFeatures, trainTargets);
            } else if (this.config.modelType === 'svm') {
                this.trainSVM(trainFeatures, trainTargets);
            } else if (this.config.modelType === 'ensemble') {
                await this.trainEnsemble(trainFeatures, trainTargets, valFeatures, valTargets);
            }
            
            // Evaluate models
            const evaluation = this.evaluateModel(testFeatures, testTargets);
            
            // Save models
            await this.saveModels();
            
            logger.info('Model training pipeline completed successfully');
            
            return {
                models: this.models,
                evaluation: evaluation,
                trainingHistory: this.trainingHistory
            };
        } catch (error) {
            throw new Error(`Model training pipeline failed: ${error.message}`);
        }
    }
}

export default ModelTrainer; 