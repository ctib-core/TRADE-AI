import { logger } from '../utils/logger.js';

export const setupWebSocket = (io) => {
    logger.info('Setting up WebSocket connections');

    io.on('connection', (socket) => {
        logger.info(`Client connected: ${socket.id}`);

        // Handle client joining prediction room
        socket.on('join-prediction', (data) => {
            const { symbol } = data;
            socket.join(`prediction-${symbol}`);
            logger.info(`Client ${socket.id} joined prediction room for ${symbol}`);
            
            socket.emit('joined-prediction', {
                symbol,
                message: `Joined prediction room for ${symbol}`
            });
        });

        // Handle client joining trading room
        socket.on('join-trading', (data) => {
            const { symbol } = data;
            socket.join(`trading-${symbol}`);
            logger.info(`Client ${socket.id} joined trading room for ${symbol}`);
            
            socket.emit('joined-trading', {
                symbol,
                message: `Joined trading room for ${symbol}`
            });
        });

        // Handle client leaving rooms
        socket.on('leave-room', (data) => {
            const { room } = data;
            socket.leave(room);
            logger.info(`Client ${socket.id} left room: ${room}`);
        });

        // Handle client disconnection
        socket.on('disconnect', () => {
            logger.info(`Client disconnected: ${socket.id}`);
        });

        // Handle errors
        socket.on('error', (error) => {
            logger.error(`Socket error for ${socket.id}:`, error);
        });
    });

    // Broadcast prediction updates
    const broadcastPrediction = (symbol, predictionData) => {
        io.to(`prediction-${symbol}`).emit('prediction-update', {
            symbol,
            timestamp: new Date().toISOString(),
            ...predictionData
        });
    };

    // Broadcast trading signals
    const broadcastTradingSignal = (symbol, tradingSignal) => {
        io.to(`trading-${symbol}`).emit('trading-signal', {
            symbol,
            timestamp: new Date().toISOString(),
            ...tradingSignal
        });
    };

    // Broadcast market data updates
    const broadcastMarketData = (symbol, marketData) => {
        io.to(`prediction-${symbol}`).emit('market-data-update', {
            symbol,
            timestamp: new Date().toISOString(),
            ...marketData
        });
    };

    // Make broadcast functions available globally
    global.broadcastPrediction = broadcastPrediction;
    global.broadcastTradingSignal = broadcastTradingSignal;
    global.broadcastMarketData = broadcastMarketData;

    logger.info('WebSocket setup completed');
}; 