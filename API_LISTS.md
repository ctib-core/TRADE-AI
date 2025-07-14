# Crypto Prediction API Endpoints

## Base URL
`http://localhost:3001/api/v1`

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
**Description:** Generate trading signal for CFD trading
**Request:**
```json
{
  "symbol": "X:BTCUSD",
  "accountBalance": 10000,
  "riskPercentage": 2,
  "maxLeverage": 10,
  "takeProfitRatio": 1.5,
  "useAdvancedModel": true,
  "enableSelfLearning": true
}
```
**Response:**
```json
{
  "status": "success",
  "symbol": "X:BTCUSD",
  "timestamp": "2025-01-11T20:30:00.000Z",
  "signal": {
    "signal": "BUY",
    "entry": 45000,
    "predictedPrice": 46500,
    "stopLoss": 44100,
    "takeProfit": 46350,
    "priceChangePercent": 3.33,
    "confidence": 0.75,
    "riskRewardRatio": 1.5,
    "leverage": 8,
    "analysis": {
      "signalStrength": 2.22,
      "confidenceScore": 0.75,
      "riskAssessment": "MEDIUM"
    },
    "positionSize": {
      "units": 2.5,
      "marginRequired": 1125,
      "leverage": 8,
      "riskAmount": 200,
      "priceDifference": 900
    },
    "potentialProfit": 375,
    "potentialLoss": 200,
    "marginRequired": 1125,
    "freeMargin": 8875
  },
  "prediction": {
    "currentPrice": 45000,
    "predictedPrice": 46500,
    "confidence": 0.75,
    "individualPredictions": {
      "lstm": [46000],
      "randomForest": [47000]
    }
  },
  "modelInfo": {
    "isTrained": true,
    "lastTraining": "2025-01-11T20:30:00.000Z",
    "predictionCount": 1,
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
  "stopLoss": 44100,
  "accountBalance": 10000,
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
    "units": 2.5,
    "marginRequired": 1125,
    "leverage": 10,
    "riskAmount": 200,
    "priceDifference": 900
  },
  "riskAnalysis": {
    "riskAmount": 200,
    "riskPerUnit": 900,
    "maxUnits": 2.5,
    "leverageUsed": 10,
    "marginRequired": 1125,
    "freeMargin": 8875
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