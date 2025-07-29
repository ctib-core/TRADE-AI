# Crypto Prediction API Endpoints

## Base URL
`http://localhost:3001/api/v1`

## 🎯 **Enhanced CFD Trading Features**

### **Risk Ratios**
- **1:3 Ratio**: For every 1 pip risked, aim for 3 pips profit
- **1:5 Ratio**: For every 1 pip risked, aim for 5 pips profit  
- **1:7 Ratio**: For every 1 pip risked, aim for 7 pips profit

### **Account Balance-Based Ratio Selection**
- **Small Accounts (< $100)**: Use 1:3 ratio
- **Medium Accounts ($100-$500)**: Use 1:5 ratio  
- **Large Accounts ($500-$2000)**: Use 1:7 ratio
- **Very Large Accounts (> $2000)**: Use 1:5 ratio (conservative)

### **Pip Calculations**
Different assets have different pip values:
- **X:BTCUSD**: $0.01 per pip
- **X:ETHUSD**: $0.01 per pip
- **Other crypto pairs**: $0.01 per pip (default)

### **Lot Size Management**
- **0.01 lot** = 1,000 units
- **0.05 lot** = 5,000 units  
- **0.1 lot** = 10,000 units
- **0.5 lot** = 50,000 units
- **1.0 lot** = 100,000 units

### **Profit/Loss Calculation**
```javascript
// Profit = Take Profit Pips × Units × Pip Value
const potentialProfit = takeProfitPips * units * pipValue;

// Loss = Stop Loss Pips × Units × Pip Value
const potentialLoss = stopLossPips * units * pipValue;
```

## WebSocket Connection

### WebSocket URL
`ws://localhost:3000` or `http://localhost:3000` (for socket.io clients)

### Connection Example
```javascript
// Browser or Node.js with socket.io-client
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

// Listen for connection
socket.on("connect", () => {
    console.log("Connected to WebSocket server");
});

// Listen for disconnection
socket.on("disconnect", () => {
    console.log("Disconnected from WebSocket server");
});
```

### WebSocket Events

#### Join Trading Room
**Event:** `join-trading`
**Data:** `{ symbol: "X:BTCUSD" }`
**Response:** `joined-trading` event with confirmation

```javascript
// Join trading room for BTCUSD
socket.emit("join-trading", { symbol: "X:BTCUSD" });

// Listen for confirmation
socket.on("joined-trading", (data) => {
    console.log("Joined trading room:", data);
    // Response: { symbol: "X:BTCUSD", message: "Joined trading room for X:BTCUSD" }
});
```

#### Join Prediction Room
**Event:** `join-prediction`
**Data:** `{ symbol: "X:BTCUSD" }`
**Response:** `joined-prediction` event with confirmation

```javascript
// Join prediction room for BTCUSD
socket.emit("join-prediction", { symbol: "X:BTCUSD" });

// Listen for confirmation
socket.on("joined-prediction", (data) => {
    console.log("Joined prediction room:", data);
    // Response: { symbol: "X:BTCUSD", message: "Joined prediction room for X:BTCUSD" }
});
```

#### Leave Room
**Event:** `leave-room`
**Data:** `{ room: "trading-X:BTCUSD" }`

```javascript
// Leave a specific room
socket.emit("leave-room", { room: "trading-X:BTCUSD" });
```

#### Trading Signal Updates
**Event:** `trading-signal`
**Data:** Real-time trading signal information

```javascript
// Listen for trading signals
socket.on("trading-signal", (data) => {
    console.log("Received trading signal:", data);
    // Data includes: symbol, timestamp, signal, entry, stopLoss, takeProfit, etc.
});
```

#### Prediction Updates
**Event:** `prediction-update`
**Data:** Real-time prediction information

```javascript
// Listen for prediction updates
socket.on("prediction-update", (data) => {
    console.log("Received prediction update:", data);
    // Data includes: symbol, timestamp, currentPrice, prediction, confidence, etc.
});
```

#### Market Data Updates
**Event:** `market-data-update`
**Data:** Real-time market data information

```javascript
// Listen for market data updates
socket.on("market-data-update", (data) => {
    console.log("Received market data update:", data);
    // Data includes: symbol, timestamp, price, volume, indicators, etc.
});
```

### Complete WebSocket Example
```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

// Connection events
socket.on("connect", () => {
    console.log("Connected to WebSocket server");
    
    // Join rooms for BTCUSD
    socket.emit("join-trading", { symbol: "X:BTCUSD" });
    socket.emit("join-prediction", { symbol: "X:BTCUSD" });
});

socket.on("disconnect", () => {
    console.log("Disconnected from WebSocket server");
});

// Room confirmations
socket.on("joined-trading", (data) => {
    console.log("Joined trading room:", data);
});

socket.on("joined-prediction", (data) => {
    console.log("Joined prediction room:", data);
});

// Real-time updates
socket.on("trading-signal", (data) => {
    console.log("Trading signal received:", data);
    // Handle trading signal
});

socket.on("prediction-update", (data) => {
    console.log("Prediction update received:", data);
    // Handle prediction update
});

socket.on("market-data-update", (data) => {
    console.log("Market data update received:", data);
    // Handle market data update
});

// Error handling
socket.on("error", (error) => {
    console.error("WebSocket error:", error);
});
```

### WebSocket Rooms
- **Trading Room:** `trading-{symbol}` (e.g., `trading-X:BTCUSD`)
- **Prediction Room:** `prediction-{symbol}` (e.g., `prediction-X:BTCUSD`)

### WebSocket Features
- **Real-time Updates:** Receive live trading signals, predictions, and market data
- **Room-based Broadcasting:** Join specific symbol rooms to receive targeted updates
- **Automatic Reconnection:** Socket.io handles reconnection automatically
- **Error Handling:** Built-in error handling and logging
- **Scalable:** Supports multiple clients and symbols simultaneously

## Health & Status

### GET /health
**Description:** Health check endpoint
**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-01-11T20:30:00.000Z",
  "uptime": 123.45,
  "environment": "development"
}
```

### GET /docs
**Description:** API documentation
**Response:**
```json
{
  "name": "Advanced AI/ML Trading Prediction API",
  "version": "2.0.0",
  "description": "Production-ready AI/ML trading prediction server",
  "endpoints": {
    "/api/v1/symbols": "Market symbols",
    "/api/v1/prediction": "AI/ML prediction endpoints",
    "/api/v1/trading": "CFD trading signal endpoints",
    "/api/v1/data": "Market data endpoints",
    "/api/v1/models": "Model management endpoints",
    "/api/v1/news": "News sentiment analysis"
  }
}
```

## Prediction Endpoints

### GET /prediction/status
**Description:** Get prediction engine status
**Response:**
```json
{
  "status": "OK",
  "engines": [
    {
      "symbol": "X:BTCUSD",
      "isTrained": true,
      "config": {...},
      "lastTraining": "2025-01-11T20:30:00.000Z"
    }
  ],
  "totalEngines": 1
}
```

### POST /prediction/train
**Description:** Train a new prediction model
**Request:**
```json
{
  "symbol": "X:BTCUSD",
  "epochs": 100,
  "batchSize": 32,
  "learningRate": 0.001,
  "lstmUnits": [128, 64, 32],
  "dropoutRate": 0.2
}
```
**Response:**
```json
{
  "status": "success",
  "message": "Model trained successfully for X:BTCUSD",
  "symbol": "X:BTCUSD",
  "config": {...},
  "trainingCompleted": "2025-01-11T20:30:00.000Z"
}
```

### POST /prediction/predict
**Description:** Make a prediction for a symbol
**Request:**
```json
{
  "symbol": "X:BTCUSD",
  "lookbackPeriod": 60,
  "predictionHorizon": 5,
  "models": ["lstm", "randomForest"],
  "useEnsemble": true
}
```
**Response:**
```json
{
  "status": "success",
  "symbol": "X:BTCUSD",
  "timestamp": "2025-01-11T20:30:00.000Z",
  "currentPrice": 45000,
  "prediction": {
    "ensemble": 46500,
    "confidence": 0.75,
    "individualPredictions": {
      "lstm": [46000],
      "randomForest": [47000]
    }
  },
  "tradingSignal": {
    "signal": "BUY",
    "entry": 45000,
    "stopLoss": 44100,
    "takeProfit": 46350,
    "confidence": 0.75
  }
}
```

### GET /prediction/:symbol
**Description:** Get latest prediction for a symbol
**Response:** Same as POST /prediction/predict

### GET /prediction/:symbol/analysis
**Description:** Get detailed analysis for a symbol
**Response:**
```json
{
  "status": "success",
  "symbol": "X:BTCUSD",
  "lastUpdate": "2025-01-11T20:30:00.000Z",
  "marketData": {
    "dataPoints": 730,
    "latestPrice": 45000,
    "priceChange": 2.5,
    "volume": 1234567
  },
  "modelInfo": {
    "isTrained": true,
    "lastTraining": "2025-01-11T20:30:00.000Z",
    "config": {...},
    "featureColumns": 435
  },
  "technicalIndicators": {
    "sma10": 44800,
    "ema20": 44900,
    "rsi": 65,
    "macd": 150
  }
}
```

### DELETE /prediction/:symbol
**Description:** Remove a prediction model
**Response:**
```json
{
  "status": "success",
  "message": "Model for X:BTCUSD removed successfully"
}
```

## Trading Endpoints

### POST /trading/signal
**Description:** Generate CFD trading signal with risk ratios and pip calculations
**Request:**
```json
{
  "symbol": "X:BTCUSD",
  "accountBalance": 1000,
  "lotSize": 0.01,           // Required: Lot size in standard lots
  "riskPercentage": 2,        // Risk percentage of account
  "riskRatio": "1:3",        // Risk:Reward ratio (1:3, 1:5, 1:7)
  "maxLeverage": 10,         // Maximum leverage allowed
  "useAdvancedModel": true,
  "enableSelfLearning": true
}
```
**Response:**
```json
{
  "status": "success",
  "symbol": "X:BTCUSD",
  "timestamp": "2025-07-28T12:03:33.141Z",
  "signal": {
    "signal": "BUY",
    "entry": 45000.00,
    "predictedPrice": 46500.00,
    "stopLoss": 44800.00,
    "takeProfit": 45600.00,
    "priceChangePercent": 3.33,
    "confidence": 0.75,
    "riskRewardRatio": 3.0,
    "leverage": 7,
    "pips": {
      "stopLoss": 200,
      "takeProfit": 600,
      "riskReward": 3.0
    },
    "positionSize": {
      "units": 1000,
      "marginRequired": 6428.57,
      "leverage": 7,
      "riskAmount": 20,
      "priceDifference": 200,
      "pipsRisked": 200,
      "riskPerPip": 10,
      "lotSize": 0.01
    },
    "potentialProfit": 6000,
    "potentialLoss": 2000,
    "marginRequired": 6428.57,
    "freeMargin": 3571.43,
    "analysis": {
      "signalStrength": 2.22,
      "confidenceScore": 0.75,
      "riskAssessment": "MEDIUM"
    }
  },
  "prediction": {
    "currentPrice": 45000.00,
    "predictedPrice": 46500.00,
    "confidence": 0.75,
    "individualPredictions": {
      "lstm": [46500.00],
      "randomForest": [46450.00]
    }
  },
  "modelInfo": {
    "isTrained": true,
    "lastTraining": "2025-07-28T11:45:02.315Z",
    "lastRetrain": "2025-07-28T11:45:02.316Z",
    "predictionCount": 2,
    "performanceMetrics": {}
  },
  "analysis": {
    "signalStrength": 2.22,
    "riskAssessment": "MEDIUM",
    "confidenceScore": 0.75
  }
}
```

### POST /trading/train-advanced
**Description:** Train advanced model with comprehensive configuration
**Request:**
```json
{
  "symbol": "X:BTCUSD",
  "modelType": "ensemble",
  "useAdvancedModel": true,
  "enableSelfLearning": true,
  "epochs": 200,
  "batchSize": 32,
  "learningRate": 0.001,
  "lstmUnits": [256, 128, 64, 32],
  "dropoutRate": 0.3,
  "retrainInterval": 86400000,
  "performanceThreshold": 0.6
}
```
**Response:**
```json
{
  "status": "success",
  "message": "Advanced model trained successfully for X:BTCUSD",
  "symbol": "X:BTCUSD",
  "config": {...},
  "modelInfo": {
    "isTrained": true,
    "lastTraining": "2025-01-11T20:30:00.000Z",
    "modelType": "ensemble",
    "useAdvancedModel": true,
    "enableSelfLearning": true
  },
  "performance": {
    "featureColumns": 435,
    "predictionHistory": 1,
    "performanceMetrics": {}
  }
}
```

### POST /trading/position-size
**Description:** Calculate optimal position size for CFD trading
**Request:**
```json
{
  "symbol": "X:BTCUSD",
  "entryPrice": 45000,
  "stopLoss": 44800,
  "accountBalance": 1000,
  "riskPercentage": 2,
  "leverage": 10
}
```
**Response:**
```json
{
  "status": "success",
  "symbol": "X:BTCUSD",
  "positionSize": {
    "units": 2.0,
    "marginRequired": 9000,
    "leverage": 10,
    "riskAmount": 20,
    "priceDifference": 200,
    "riskPerUnit": 200,
    "maxUnits": 0.1,
    "marginRequired": 9000,
    "freeMargin": 1000
  },
  "riskCalculator": {
    "accountBalance": 1000,
    "riskPercentage": 2,
    "riskAmount": 20,
    "entryPrice": 45000,
    "stopLoss": 44800,
    "priceDifference": 200,
    "maxUnits": 0.1,
    "leverageUsed": 10,
    "marginRequired": 9000,
    "freeMargin": 1000
  }
}
```

### GET /trading/risk-calculator
**Description:** Risk calculator for CFD trading
**Query Parameters:**
- `accountBalance` (default: 10000)
- `riskPercentage` (default: 2)
- `entryPrice` (default: 50000)
- `stopLoss` (default: 49000)
- `leverage` (default: 10)

**Response:**
```json
{
  "status": "success",
  "riskCalculator": {
    "accountBalance": 10000,
    "riskPercentage": 2,
    "riskAmount": 200,
    "entryPrice": 50000,
    "stopLoss": 49000,
    "priceDifference": 1000,
    "maxUnits": 0.2,
    "leverage": 10,
    "marginRequired": 1000,
    "freeMargin": 9000,
    "marginUtilization": 10
  }
}
```

### GET /trading/signals/:symbol
**Description:** Get trading signals history for a symbol
**Query Parameters:**
- `limit` (default: 10)

**Response:**
```json
{
  "status": "success",
  "symbol": "X:BTCUSD",
  "signals": [
    {
      "id": "signal_1234567890_123",
      "symbol": "X:BTCUSD",
      "timestamp": "2025-01-11T20:30:00.000Z",
      "signal": "BUY",
      "entry": 45000,
      "predictedPrice": 46500,
      "confidence": 0.75,
      "status": "OPEN"
    }
  ],
  "totalSignals": 1,
  "modelInfo": {
    "isTrained": true,
    "lastTraining": "2025-01-11T20:30:00.000Z",
    "predictionCount": 1
  }
}
```

### POST /trading/backtest
**Description:** Backtest trading strategy with advanced models
**Request:**
```json
{
  "symbol": "X:BTCUSD",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "initialBalance": 10000,
  "riskPercentage": 2,
  "useAdvancedModel": true
}
```
**Response:**
```json
{
  "status": "success",
  "backtestResults": {
    "symbol": "X:BTCUSD",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "initialBalance": 10000,
    "finalBalance": 12000,
    "totalTrades": 45,
    "winningTrades": 27,
    "losingTrades": 18,
    "winRate": 0.6,
    "maxDrawdown": 0.12,
    "sharpeRatio": 1.8,
    "profitFactor": 1.5,
    "modelType": "ensemble",
    "useAdvancedModel": true
  }
}
```

### GET /trading/model-status/:symbol
**Description:** Get detailed model status for a symbol
**Response:**
```json
{
  "status": "success",
  "symbol": "X:BTCUSD",
  "isTrained": true,
  "lastTraining": "2025-01-11T20:30:00.000Z",
  "lastRetrain": null,
  "config": {
    "modelType": "ensemble",
    "useAdvancedModel": true,
    "enableSelfLearning": true,
    "models": ["lstm", "randomForest"]
  },
  "performance": {
    "predictionCount": 1,
    "performanceMetrics": {},
    "overallPerformance": 0.5
  },
  "features": {
    "featureColumns": 435,
    "featureImportance": {}
  }
}
```

## Data Endpoints

### GET /data/symbols
**Description:** Get available crypto symbols
**Response:**
```json
{
  "status": "success",
  "symbols": [
    {
      "ticker": "X:BTCUSD",
      "name": "Bitcoin",
      "market": "crypto",
      "locale": "us",
      "primary_exchange": "CRYPTO",
      "type": "CS",
      "active": true,
      "currency_name": "US Dollar",
      "cik": null,
      "composite_figi": null,
      "share_class_figi": null,
      "market_cap": null,
      "phone_number": null,
      "address": null,
      "description": null,
      "sic_code": null,
      "sic_description": null,
      "ticker_root": null,
      "homepage_url": null,
      "total_employees": null,
      "list_date": null,
      "branding": null,
      "share_class_shares_outstanding": null,
      "weighted_shares_outstanding": null
    }
  ],
  "totalSymbols": 1
}
```

### POST /data/historical
**Description:** Get historical market data
**Request:**
```json
{
  "symbol": "X:BTCUSD",
  "timespan": "day",
  "fromDate": "2024-01-01",
  "toDate": "2024-12-31",
  "multiplier": 1
}
```
**Response:**
```json
{
  "status": "success",
  "symbol": "X:BTCUSD",
  "dataPoints": 365,
  "fromDate": "2024-01-01",
  "toDate": "2024-12-31",
  "timespan": "day",
  "data": [
    {
      "timestamp": 1704067200000,
      "date": "2024-01-01",
      "open": 45000,
      "high": 45500,
      "low": 44800,
      "close": 45200,
      "volume": 1234567,
      "vwap": 45100,
      "transactions": 1234,
      "priceChange": 200,
      "priceChangePercent": 0.44,
      "volatility": 1.56,
      "volumeWeightedPrice": 45100
    }
  ]
}
```

### POST /data/realtime
**Description:** Get real-time market data
**Request:**
```json
{
  "symbol": "X:BTCUSD"
}
```
**Response:**
```json
{
  "status": "success",
  "symbol": "X:BTCUSD",
  "timestamp": 1704067200000,
  "date": "2024-01-01",
  "open": 45000,
  "high": 45500,
  "low": 44800,
  "close": 45200,
  "volume": 1234567,
  "vwap": 45100,
  "transactions": 1234,
  "priceChange": 200,
  "priceChangePercent": 0.44
}
```

### POST /data/indicators
**Description:** Get market data with technical indicators
**Request:**
```json
{
  "symbol": "X:BTCUSD",
  "timespan": "day",
  "fromDate": "2024-01-01",
  "toDate": "2024-12-31"
}
```
**Response:**
```json
{
  "status": "success",
  "symbol": "X:BTCUSD",
  "dataPoints": 365,
  "indicators": {
    "sma": "Simple Moving Average",
    "ema": "Exponential Moving Average",
    "rsi": "Relative Strength Index",
    "macd": "Moving Average Convergence Divergence",
    "bollinger": "Bollinger Bands"
  },
  "data": [
    {
      "timestamp": 1704067200000,
      "date": "2024-01-01",
      "open": 45000,
      "high": 45500,
      "low": 44800,
      "close": 45200,
      "volume": 1234567,
      "indicators": {
        "sma10": 44800,
        "sma20": 44900,
        "ema10": 44850,
        "ema20": 44950,
        "rsi": 65,
        "macd": 150,
        "macdSignal": 100,
        "bbUpper": 46000,
        "bbMiddle": 45000,
        "bbLower": 44000,
        "macdHistogram": 50
      }
    }
  ]
}
```

### GET /data/validate/:symbol
**Description:** Validate if a symbol exists and is tradeable
**Response:**
```json
{
  "status": "success",
  "symbol": "X:BTCUSD",
  "isValid": true,
  "message": "Symbol is valid and tradeable"
}
```

### GET /data/cache/status
**Description:** Get cache status and statistics
**Response:**
```json
{
  "status": "success",
  "cacheStats": {
    "totalKeys": 150,
    "memoryUsage": 25,
    "hitRate": 0.85,
    "lastCleanup": "2025-01-11T20:30:00.000Z"
  }
}
```

### DELETE /data/cache/clear
**Description:** Clear all cached data
**Response:**
```json
{
  "status": "success",
  "message": "Cache cleared successfully"
}
```

### GET /data/market/summary
**Description:** Get market summary for major cryptocurrencies
**Response:**
```json
{
  "status": "success",
  "timestamp": "2025-01-11T20:30:00.000Z",
  "summary": [
    {
      "symbol": "X:BTCUSD",
      "price": 45000,
      "change": 500,
      "changePercent": 1.12,
      "volume": 1234567,
      "timestamp": 1704067200000
    }
  ]
}
```

## Model Management Endpoints

### GET /models
**Description:** List all available models
**Response:**
```json
{
  "status": "success",
  "models": [
    {
      "name": "btc_model",
      "symbol": "X:BTCUSD",
      "version": "1.0.0",
      "description": "BTC prediction model",
      "size": 1024,
      "lastModified": "2025-01-11T20:30:00.000Z",
      "config": {...}
    }
  ],
  "totalModels": 1
}
```

### POST /models/save
**Description:** Save a trained model
**Request:**
```json
{
  "symbol": "X:BTCUSD",
  "modelName": "btc_model",
  "description": "BTC prediction model",
  "version": "1.0.0"
}
```
**Response:**
```json
{
  "status": "success",
  "message": "Model btc_model saved successfully",
  "fileName": "btc_model_X_BTCUSD.json",
  "modelData": {...}
}
```

### POST /models/load
**Description:** Load a saved model
**Request:**
```json
{
  "symbol": "X:BTCUSD",
  "modelName": "btc_model"
}
```
**Response:**
```json
{
  "status": "success",
  "message": "Model btc_model loaded successfully",
  "modelData": {...}
}
```

### DELETE /models/:modelName
**Description:** Delete a saved model
**Query Parameters:**
- `symbol` (required)

**Response:**
```json
{
  "status": "success",
  "message": "Model btc_model deleted successfully"
}
```

### GET /models/status
**Description:** Get model management status
**Response:**
```json
{
  "status": "success",
  "modelsDirectory": "./models",
  "exists": true,
  "stats": {
    "totalModels": 1,
    "totalSize": 1024,
    "lastModified": "2025-01-11T20:30:00.000Z"
  }
}
```

## News Endpoints

### GET /news/sentiment/:symbol
**Description:** Get news sentiment analysis for a symbol
**Query Parameters:**
- `limit` (default: 10)

**Response:**
```json
{
  "status": "success",
  "symbol": "X:BTCUSD",
  "sentiment": {
    "overall": "positive",
    "score": 0.75,
    "articles": [
      {
        "title": "Bitcoin reaches new highs",
        "sentiment": "positive",
        "score": 0.8,
        "publishedAt": "2025-01-11T20:30:00.000Z"
      }
    ]
  }
}
```

### GET /news/fundamental/:symbol
**Description:** Get fundamental analysis for a symbol
**Response:**
```json
{
  "status": "success",
  "symbol": "X:BTCUSD",
  "fundamental": {
    "marketCap": 850000000000,
    "volume24h": 25000000000,
    "dominance": 48.5,
    "trending": "bullish",
    "analysis": "Strong fundamentals with increasing adoption"
  }
}
```

## Error Responses

All endpoints may return error responses in this format:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (validation error)
- `404` - Not Found
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error 