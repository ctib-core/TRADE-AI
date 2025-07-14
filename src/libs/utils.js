/**
 * Utility functions for data preprocessing and mathematical operations
 */

/**
 * Min-Max normalization
 * @param {Array} data - Input data array
 * @returns {Object} Normalized data and scaler parameters
 */
export function minMax(data) {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Input data must be a non-empty array');
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;

    if (range === 0) {
        // If all values are the same, return original data
        return {
            scaledData: data.map(() => 0.5),
            scaler: { min, max, range: 0 }
        };
    }

    const scaledData = data.map(value => (value - min) / range);

    return {
        scaledData,
        scaler: {
            min,
            max,
            range,
            transform: (value) => (value - min) / range,
            inverseTransform: (scaledValue) => scaledValue * range + min
        }
    };
}

/**
 * Z-score normalization (standardization)
 * @param {Array} data - Input data array
 * @returns {Object} Normalized data and scaler parameters
 */
export function zScore(data) {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Input data must be a non-empty array');
    }

    const mean = data.reduce((sum, value) => sum + value, 0) / data.length;
    const variance = data.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) {
        // If all values are the same, return original data
        return {
            scaledData: data.map(() => 0),
            scaler: { mean, stdDev: 0 }
        };
    }

    const scaledData = data.map(value => (value - mean) / stdDev);

    return {
        scaledData,
        scaler: {
            mean,
            stdDev,
            transform: (value) => (value - mean) / stdDev,
            inverseTransform: (scaledValue) => scaledValue * stdDev + mean
        }
    };
}

/**
 * Calculate moving average
 * @param {Array} data - Input data array
 * @param {number} window - Window size for moving average
 * @returns {Array} Moving average values
 */
export function movingAverage(data, window) {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Input data must be a non-empty array');
    }

    if (window <= 0 || window > data.length) {
        throw new Error('Window size must be positive and not larger than data length');
    }

    const result = [];
    
    for (let i = window - 1; i < data.length; i++) {
        const sum = data.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / window);
    }

    return result;
}

/**
 * Calculate exponential moving average
 * @param {Array} data - Input data array
 * @param {number} period - Period for EMA calculation
 * @returns {Array} Exponential moving average values
 */
export function exponentialMovingAverage(data, period) {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Input data must be a non-empty array');
    }

    if (period <= 0 || period > data.length) {
        throw new Error('Period must be positive and not larger than data length');
    }

    const multiplier = 2 / (period + 1);
    const result = [data[0]]; // Start with first value

    for (let i = 1; i < data.length; i++) {
        const ema = (data[i] * multiplier) + (result[i - 1] * (1 - multiplier));
        result.push(ema);
    }

    return result;
}

/**
 * Calculate RSI (Relative Strength Index)
 * @param {Array} data - Input price data array
 * @param {number} period - Period for RSI calculation
 * @returns {Array} RSI values
 */
export function calculateRSI(data, period = 14) {
    if (!Array.isArray(data) || data.length < period + 1) {
        throw new Error(`Data must be an array with at least ${period + 1} elements`);
    }

    const gains = [];
    const losses = [];

    // Calculate price changes
    for (let i = 1; i < data.length; i++) {
        const change = data[i] - data[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const rsi = [];
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

    // Calculate first RSI
    const rs = avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));

    // Calculate subsequent RSI values
    for (let i = period; i < gains.length; i++) {
        avgGain = (avgGain * (period - 1) + gains[i]) / period;
        avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
        
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
    }

    return rsi;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * @param {Array} data - Input price data array
 * @param {number} fastPeriod - Fast EMA period
 * @param {number} slowPeriod - Slow EMA period
 * @param {number} signalPeriod - Signal line period
 * @returns {Object} MACD values
 */
export function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (!Array.isArray(data) || data.length < slowPeriod) {
        throw new Error(`Data must be an array with at least ${slowPeriod} elements`);
    }

    const fastEMA = exponentialMovingAverage(data, fastPeriod);
    const slowEMA = exponentialMovingAverage(data, slowPeriod);

    // Calculate MACD line
    const macdLine = [];
    for (let i = 0; i < slowEMA.length; i++) {
        const fastIndex = data.length - slowEMA.length + i;
        macdLine.push(fastEMA[fastIndex] - slowEMA[i]);
    }

    // Calculate signal line
    const signalLine = exponentialMovingAverage(macdLine, signalPeriod);

    // Calculate histogram
    const histogram = [];
    for (let i = 0; i < signalLine.length; i++) {
        const macdIndex = macdLine.length - signalLine.length + i;
        histogram.push(macdLine[macdIndex] - signalLine[i]);
    }

    return {
        macd: macdLine,
        signal: signalLine,
        histogram: histogram
    };
}

/**
 * Calculate Bollinger Bands
 * @param {Array} data - Input price data array
 * @param {number} period - Period for calculation
 * @param {number} stdDev - Standard deviation multiplier
 * @returns {Object} Bollinger Bands values
 */
export function calculateBollingerBands(data, period = 20, stdDev = 2) {
    if (!Array.isArray(data) || data.length < period) {
        throw new Error(`Data must be an array with at least ${period} elements`);
    }

    const sma = movingAverage(data, period);
    const upper = [];
    const lower = [];

    for (let i = 0; i < sma.length; i++) {
        const startIndex = data.length - sma.length + i - period + 1;
        const endIndex = data.length - sma.length + i + 1;
        const window = data.slice(startIndex, endIndex);
        
        const variance = window.reduce((sum, value) => sum + Math.pow(value - sma[i], 2), 0) / period;
        const standardDeviation = Math.sqrt(variance);
        
        upper.push(sma[i] + (standardDeviation * stdDev));
        lower.push(sma[i] - (standardDeviation * stdDev));
    }

    return {
        upper,
        middle: sma,
        lower
    };
}

/**
 * Split data into training and testing sets
 * @param {Array} data - Input data array
 * @param {number} trainingRatio - Ratio of data to use for training (0-1)
 * @returns {Object} Training and testing data
 */
export function splitData(data, trainingRatio = 0.8) {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Input data must be a non-empty array');
    }

    if (trainingRatio <= 0 || trainingRatio >= 1) {
        throw new Error('Training ratio must be between 0 and 1');
    }

    const splitIndex = Math.floor(data.length * trainingRatio);
    
    return {
        training: data.slice(0, splitIndex),
        testing: data.slice(splitIndex)
    };
}

/**
 * Create sequences for time series prediction
 * @param {Array} data - Input data array
 * @param {number} lookback - Number of previous values to use
 * @param {number} horizon - Number of future values to predict
 * @returns {Object} Input sequences and target sequences
 */
export function createSequences(data, lookback, horizon = 1) {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Input data must be a non-empty array');
    }

    if (lookback <= 0 || lookback >= data.length) {
        throw new Error('Lookback must be positive and less than data length');
    }

    const sequences = [];
    const targets = [];

    for (let i = lookback; i <= data.length - horizon; i++) {
        sequences.push(data.slice(i - lookback, i));
        targets.push(data.slice(i, i + horizon));
    }

    return { sequences, targets };
}

/**
 * Calculate prediction accuracy metrics
 * @param {Array} actual - Actual values
 * @param {Array} predicted - Predicted values
 * @returns {Object} Accuracy metrics
 */
export function calculateMetrics(actual, predicted) {
    if (!Array.isArray(actual) || !Array.isArray(predicted) || actual.length !== predicted.length) {
        throw new Error('Actual and predicted arrays must have the same length');
    }

    const n = actual.length;
    let mse = 0;
    let mae = 0;
    let rmse = 0;

    for (let i = 0; i < n; i++) {
        const error = actual[i] - predicted[i];
        mse += Math.pow(error, 2);
        mae += Math.abs(error);
    }

    mse /= n;
    mae /= n;
    rmse = Math.sqrt(mse);

    return {
        mse,
        mae,
        rmse,
        mape: (mae / (actual.reduce((sum, val) => sum + val, 0) / n)) * 100
    };
} 