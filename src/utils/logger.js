import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = process.env.LOG_FILE_PATH || './logs';
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({
        format: 'HH:mm:ss'
    }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            try {
                // Safely stringify meta to avoid circular references
                const safeMeta = JSON.parse(JSON.stringify(meta, (key, value) => {
                    // Remove circular references and complex objects
                    if (value && typeof value === 'object') {
                        if (key === 'config' || key === 'response' || key === 'request') {
                            return '[Object]';
                        }
                        if (value.constructor && value.constructor.name !== 'Object' && value.constructor.name !== 'Array') {
                            return `[${value.constructor.name}]`;
                        }
                    }
                    return value;
                }));
                msg += ` ${JSON.stringify(safeMeta)}`;
            } catch (error) {
                // Fallback if JSON.stringify fails
                msg += ` [Meta data unavailable due to circular reference]`;
            }
        }
        return msg;
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'crypto-prediction-server' },
    transports: [
        // Console transport
        new winston.transports.Console({
            format: consoleFormat
        }),
        
        // File transports
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        
        // Separate file for ML predictions
        new winston.transports.File({
            filename: path.join(logsDir, 'predictions.log'),
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        })
    ]
});

// Add stream for Morgan HTTP logging
logger.stream = {
    write: (message) => {
        logger.info(message.trim());
    }
};

// Helper methods for specific logging
logger.prediction = (message, data = {}) => {
    logger.info(`PREDICTION: ${message}`, { ...data, type: 'prediction' });
};

logger.trading = (message, data = {}) => {
    logger.info(`TRADING: ${message}`, { ...data, type: 'trading' });
};

logger.model = (message, data = {}) => {
    logger.info(`MODEL: ${message}`, { ...data, type: 'model' });
};

logger.api = (message, data = {}) => {
    logger.info(`API: ${message}`, { ...data, type: 'api' });
};

export { logger }; 