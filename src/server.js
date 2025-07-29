import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import net from 'net';

// Import routes and middleware
import { setupRoutes } from './routes/index.js';
import { setupMiddleware } from './middleware/index.js';
import { setupWebSocket } from './websocket/index.js';
import { logger } from './utils/logger.js';
import { connectDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import marketDataBuffer from './libs/marketDataBuffer.js';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"]
    }
});

// --- Dynamic port selection logic ---
async function findAvailablePort(startPort = 8080, maxTries = 50) {
    let port = startPort;
    for (let i = 0; i < maxTries; i++) {
        const isFree = await new Promise((resolve) => {
            const tester = net.createServer()
                .once('error', err => err.code === 'EADDRINUSE' ? resolve(false) : resolve(false))
                .once('listening', () => tester.once('close', () => resolve(true)).close())
                .listen(port);
        });
        if (isFree) return port;
        port++;
    }
    throw new Error('No available port found');
}

let PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

// Setup middleware
setupMiddleware(app);

// Setup routes
setupRoutes(app);

// Setup WebSocket
setupWebSocket(io);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.originalUrl} not found`
    });
});

// Start market data polling for symbols (delayed to prevent startup conflicts)
setTimeout(() => {
    const symbolsToPoll = ['X:BTCUSD', 'X:ETHUSD'];
    marketDataBuffer.startPolling(symbolsToPoll);
    global._marketDataPollInterval = setInterval(() => {
        for (const symbol of symbolsToPoll) {
            const latest = marketDataBuffer.getLatestWindow(symbol, 1)[0];
            if (latest && global.broadcastMarketData) {
                global.broadcastMarketData(symbol, latest);
            }
        }
    }, 2 * 60 * 1000); // 2 minutes
}, 5000);

// Start server
async function startServer() {
    try {
        // Connect to databases
        await connectDatabase();
        await connectRedis();

        // Find available port
        PORT = await findAvailablePort(PORT);
        server.listen(PORT, () => {
            logger.info(`🚀 Crypto Prediction Server running on port ${PORT}`);
            logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
            logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});

startServer(); 