// In-memory buffer for latest market data per symbol
import axios from "axios";

const buffer = {};
const LOOKBACK = 60; // Default lookback period, can be parameterized
const POLL_INTERVAL = 2 * 60 * 1000; // 2 minutes

async function fetchLatestCandle(symbol) {
    try {
        // Replace with your Polygon endpoint and API key logic
        const apiKey = process.env.POLYGON_API_KEY;
        
        // Get current date and previous day for the range
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString().split('T')[0]; // 1 day ago
        
        const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/minute/${startDate}/${endDate}?adjusted=true&sort=desc&limit=1&apiKey=${apiKey}`;
        const resp = await axios.get(url);
        
        if (resp.data && resp.data.results && resp.data.results.length > 0) {
            return resp.data.results[0];
        }
        return null;
    } catch (error) {
        console.error(`Error fetching candle for ${symbol}:`, error.message);
        return null;
    }
}

async function pollSymbol(symbol) {
    try {
        const candle = await fetchLatestCandle(symbol);
        if (candle) {
            if (!buffer[symbol]) buffer[symbol] = [];
            
            buffer[symbol].push(candle);
            
            // Keep only the latest LOOKBACK candles
            if (buffer[symbol].length > LOOKBACK) {
                buffer[symbol] = buffer[symbol].slice(-LOOKBACK);
            }
        }
    } catch (err) {
        console.error(`Error polling symbol ${symbol}:`, err.message);
    }
}

function startPolling(symbols) {
    if (!Array.isArray(symbols) || symbols.length === 0) {
        console.warn('No symbols provided for polling');
        return;
    }
    
    // Poll immediately on start (silently)
    symbols.forEach(symbol => pollSymbol(symbol));
    
    // Then poll at regular intervals
    const intervalId = setInterval(() => {
        symbols.forEach(symbol => pollSymbol(symbol));
    }, POLL_INTERVAL);
    
    return intervalId; // Return interval ID so it can be cleared if needed
}

function getLatestWindow(symbol, lookback = LOOKBACK) {
    if (!buffer[symbol]) {
        return [];
    }
    return buffer[symbol].slice(-lookback);
}

function getBufferStats() {
    const stats = {};
    Object.keys(buffer).forEach(symbol => {
        stats[symbol] = {
            length: buffer[symbol].length,
            oldest: buffer[symbol][0]?.t || null,
            newest: buffer[symbol][buffer[symbol].length - 1]?.t || null
        };
    });
    return stats;
}

function clearBuffer(symbol = null) {
    if (symbol) {
        delete buffer[symbol];
    } else {
        Object.keys(buffer).forEach(key => delete buffer[key]);
    }
}

// ES module exports
export {
    startPolling,
    getLatestWindow,
    getBufferStats,
    clearBuffer,
    pollSymbol
};

export default {
    startPolling,
    getLatestWindow,
    getBufferStats,
    clearBuffer,
    pollSymbol
};