# 🚀 Advanced Crypto Prediction Server

A sophisticated AI/ML crypto prediction server built with Node.js, TensorFlow.js, and advanced machine learning libraries for CFD trading signals with self-learning capabilities and fundamental analysis.

## 🌟 Features

- **Advanced ML Models**: TensorFlow.js LSTM with batch normalization, Random Forest with hyperparameter optimization, SVM with advanced kernels
- **Self-Learning System**: Models continuously improve based on prediction accuracy and market performance
- **Ensemble Learning**: Dynamic weighted ensemble of multiple models with performance-based adjustments
- **Fundamental Analysis**: News sentiment analysis from trusted sources (CoinDesk, CoinTelegraph, Reddit, Twitter)
- **Real-time Data**: Polygon.io integration for live crypto market data with 15+ years of historical data
- **CFD Trading Signals**: Advanced stop-loss, take-profit, position sizing with risk assessment
- **Technical Indicators**: Comprehensive technical analysis with RSI, MACD, Bollinger Bands, moving averages
- **WebSocket Support**: Real-time prediction updates and trading signals
- **Model Management**: Save, load, and version control ML models with performance tracking
- **Caching**: Redis-based caching for improved performance
- **Comprehensive Logging**: Winston-based logging with multiple transports
- **Security**: Rate limiting, CORS, helmet security headers
- **API Documentation**: Complete REST API with validation and comprehensive examples

### 🎯 **Enhanced CFD Trading Features**

- **Risk Ratios**: Configurable 1:3, 1:5, 1:7 risk:reward ratios
- **Pip Calculations**: Proper pip-based calculations for different crypto assets
- **Lot Size Management**: User-controlled lot sizes with standard lot conversions
- **Dynamic Leverage**: Confidence-based leverage calculation
- **Margin Requirements**: Accurate margin and free margin calculations
- **Profit/Loss Projections**: Realistic CFD profit and loss calculations
- **Risk Assessment**: LOW/MEDIUM/HIGH risk classification
- **Account Balance Optimization**: Automatic risk ratio selection based on account size

## 🏗️ Architecture

```
src/
├── server.js                 # Main server entry point
├── config/
│   ├── database.js          # MongoDB connection
│   └── redis.js             # Redis connection and caching
├── ml/
│   ├── CryptoPredictionEngine.js  # Enhanced ML prediction engine with self-learning
│   ├── modelTrainer.js      # Advanced model training with hyperparameter optimization
│   ├── dataPreprocessor.js  # Comprehensive data preprocessing
│   └── tradingSignalGenerator.js  # Advanced trading signal generation
├── services/
│   ├── polygonService.js    # Enhanced Polygon.io service
│   ├── marketDataService.js # Market data aggregation
│   └── newsDataService.js   # News sentiment analysis for fundamental analysis
├── routes/
│   ├── index.js             # Route setup
│   ├── prediction.js        # Prediction endpoints
│   ├── trading.js          # Advanced trading signal endpoints
│   ├── data.js             # Market data endpoints
│   ├── models.js           # Model management endpoints
│   └── symbols.js          # Market symbols endpoints
├── middleware/
│   └── index.js            # Security, validation, logging middleware
├── utils/
│   └── logger.js           # Winston logging configuration
├── websocket/
│   └── index.js            # WebSocket setup for real-time updates
└── trading/
    └── tradingSignalGenerator.js  # Advanced CFD trading logic
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB (local or cloud)
- Redis (local or cloud)
- Polygon.io API key

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd crypto-prediction-server
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
```bash
cp env.example .env
```

Edit `.env` with your configuration:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Polygon.io API Configuration
POLYGON_API_KEY=your_polygon_api_key_here

# News API Keys (Optional)
COINDESK_API_KEY=your_coindesk_api_key
COINTELEGRAPH_API_KEY=your_cointelegraph_api_key
CRYPTONEWS_API_KEY=your_cryptonews_api_key
TWITTER_API_KEY=your_twitter_api_key

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/crypto_prediction
REDIS_URL=redis://localhost:6379

# Model Configuration
MODEL_SAVE_PATH=./models
DATA_CACHE_PATH=./data_cache

# Trading Configuration
DEFAULT_LEVERAGE=10
MAX_POSITION_SIZE=1000
RISK_PERCENTAGE=2

# Self-Learning Configuration
ENABLE_SELF_LEARNING=true
RETRAIN_INTERVAL=86400000
PERFORMANCE_THRESHOLD=0.6
```

4. **Start the server**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will be available at `http://localhost:3000`

## 📊 API Documentation

### Health Check
```bash
GET /api/v1/health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

### Documentation
```bash
GET /api/v1/docs
```

**Response:**
```json
{
  "name": "Advanced AI/ML Trading Prediction API",
  "version": "2.0.0",
  "description": "Production-ready AI/ML trading prediction server with comprehensive market data and CFD trading signals",
  "endpoints": {
    "/api/v1/symbols": "Market symbols (crypto, stocks, forex)",
    "/api/v1/prediction": "AI/ML prediction endpoints",
    "/api/v1/trading": "CFD trading signal endpoints",
    "/api/v1/data": "Market data endpoints",
    "/api/v1/models": "Model management endpoints"
  },
  "features": [
    "15+ years of historical data analysis",
    "TensorFlow.js LSTM with advanced architecture",
    "Ensemble learning (Random Forest, SVM)",
    "Self-learning models with continuous improvement",
    "Fundamental analysis with news sentiment",
    "Comprehensive technical indicators",
    "Real-time market data from Polygon.io",
    "CFD trading with proper lot sizing",
    "Advanced risk management",
    "Limit orders and advanced order types",
    "Production-ready model persistence",
    "WebSocket real-time updates"
  ]
}
```

### Trading Endpoints

#### Generate CFD Trading Signal
```bash
POST /api/v1/trading/signal
Content-Type: application/json

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

#### Calculate Position Size
```bash
POST /api/v1/trading/position-size
Content-Type: application/json

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

#### Train Advanced Model
```bash
POST /api/v1/trading/train-advanced
Content-Type: application/json

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
  "config": {
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
  },
  "modelInfo": {
    "isTrained": true,
    "lastTraining": "2025-07-28T12:03:33.141Z",
    "modelType": "ensemble",
    "useAdvancedModel": true,
    "enableSelfLearning": true
  },
  "performance": {
    "featureColumns": 245,
    "predictionHistory": 0,
    "performanceMetrics": {}
  }
}
```

#### Get Model Status
```bash
GET /api/v1/trading/model-status/X:BTCUSD
```

**Response:**
```json
{
  "status": "success",
  "symbol": "X:BTCUSD",
  "isTrained": true,
  "lastTraining": "2025-07-28T12:03:33.141Z",
  "lastRetrain": "2025-07-28T11:45:02.316Z",
  "config": {
    "modelType": "ensemble",
    "useAdvancedModel": true,
    "enableSelfLearning": true,
    "models": ["lstm", "randomForest"]
  },
  "performance": {
    "predictionCount": 2,
    "performanceMetrics": {},
    "overallPerformance": 0.5
  },
  "features": {
    "featureColumns": 245,
    "featureImportance": {
      "price_momentum": 0.15,
      "volume_change": 0.12,
      "rsi": 0.10
    }
  }
}
```

### Prediction Endpoints

#### Train a Model
```bash
POST /api/v1/prediction/train
Content-Type: application/json

{
  "symbol": "X:BTCUSD",
  "epochs": 200,
  "batchSize": 32,
  "learningRate": 0.001,
  "lstmUnits": [256, 128, 64, 32],
  "dropoutRate": 0.3
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Model trained successfully for X:BTCUSD",
  "symbol": "X:BTCUSD",
  "config": {
    "symbol": "X:BTCUSD",
    "epochs": 200,
    "batchSize": 32,
    "learningRate": 0.001,
    "lstmUnits": [256, 128, 64, 32],
    "dropoutRate": 0.3
  },
  "trainingCompleted": "2024-01-15T10:30:00.000Z"
}
```

#### Make Prediction
```bash
POST /api/v1/prediction/predict
Content-Type: application/json

{
  "symbol": "X:BTCUSD",
  "lookbackPeriod": 60,
  "predictionHorizon": 5,
  "models": ["lstm", "randomForest", "svm"],
  "useEnsemble": true
}
```

**Response:**
```json
{
  "status": "success",
  "symbol": "X:BTCUSD",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "currentPrice": 50000,
  "prediction": {
    "predictions": {
      "lstm": [52000, 52500, 53000, 53500, 54000],
      "randomForest": [51800, 52200, 52600, 53000, 53400],
      "svm": [52200, 52800, 53400, 54000, 54600]
    },
    "ensemble": 52000,
    "confidence": 0.75
  },
  "tradingSignal": {
    "signal": "BUY",
    "entry": 50000,
    "predictedPrice": 52000,
    "stopLoss": 49000,
    "takeProfit": 51500,
    "priceChangePercent": 4.0,
    "confidence": 0.75,
    "riskRewardRatio": 1.5,
    "leverage": 7,
    "analysis": {
      "signalStrength": 2.67,
      "confidenceScore": 0.75,
      "riskAssessment": "MEDIUM"
    }
  },
  "marketData": {
    "lastUpdate": "2024-01-15",
    "dataPoints": 60
  },
  "modelInfo": {
    "isTrained": true,
    "lastTraining": "2024-01-15T09:00:00.000Z",
    "lastRetrain": "2024-01-15T08:00:00.000Z",
    "predictionCount": 150,
    "performanceMetrics": {
      "lstm": { "accuracy": 0.72 },
      "randomForest": { "accuracy": 0.68 },
      "svm": { "accuracy": 0.65 }
    }
  }
}
```

#### Get Latest Prediction
```bash
GET /api/v1/prediction/X:BTCUSD
```

**Response:**
```json
{
  "status": "success",
  "symbol": "X:BTCUSD",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "currentPrice": 50000,
  "prediction": {
    "predictions": {
      "lstm": [52000],
      "randomForest": [51800],
      "svm": [52200]
    },
    "ensemble": 52000,
    "confidence": 0.75
  },
  "tradingSignal": {
    "signal": "BUY",
    "entry": 50000,
    "predictedPrice": 52000,
    "stopLoss": 49000,
    "takeProfit": 51500,
    "priceChangePercent": 4.0,
    "confidence": 0.75,
    "riskRewardRatio": 1.5,
    "leverage": 7
  },
  "marketData": {
    "lastUpdate": "2024-01-15",
    "dataPoints": 60
  }
}
```

### Data Endpoints

#### Get Historical Data
```bash
POST /api/v1/data/historical
Content-Type: application/json

{
  "symbol": "X:BTCUSD",
  "timespan": "day",
  "fromDate": "2023-01-01",
  "toDate": "2023-12-31",
  "multiplier": 1
}
```

**Response:**
```json
{
  "status": "success",
  "symbol": "X:BTCUSD",
  "dataPoints": 365,
  "fromDate": "2023-01-01",
  "toDate": "2023-12-31",
  "timespan": "day",
  "data": [
    {
      "timestamp": 1672531200000,
      "date": "2023-01-01",
      "open": 16500,
      "high": 16700,
      "low": 16400,
      "close": 16650,
      "volume": 2500000000,
      "vwap": 16550,
      "transactions": 150000,
      "priceChange": 150,
      "priceChangePercent": 0.91,
      "volatility": 1.82,
      "volumeWeightedPrice": 16550
    }
  ]
}
```

#### Get Market Data with Indicators
```bash
POST /api/v1/data/indicators
Content-Type: application/json

{
  "symbol": "X:BTCUSD",
  "timespan": "day",
  "fromDate": "2023-12-01",
  "toDate": "2023-12-31"
}
```

**Response:**
```json
{
  "status": "success",
  "symbol": "X:BTCUSD",
  "dataPoints": 31,
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
      "date": "2023-12-31",
      "open": 42000,
      "high": 42500,
      "low": 41800,
      "close": 42200,
      "volume": 3000000000,
      "indicators": {
        "sma10": 42050,
        "sma20": 41800,
        "ema10": 42100,
        "ema20": 41900,
        "rsi": 65.5,
        "macd": 150,
        "macdSignal": 120,
        "macdHistogram": 30,
        "bbUpper": 43000,
        "bbMiddle": 42000,
        "bbLower": 41000
      }
    }
  ]
}
```

### Model Management Endpoints

#### List All Models
```bash
GET /api/v1/models
```

**Response:**
```json
{
  "status": "success",
  "models": [
    {
      "name": "BTCUSD_ensemble_v1",
      "symbol": "X:BTCUSD",
      "version": "1.0.0",
      "description": "Ensemble model for Bitcoin USD",
      "size": 5242880,
      "lastModified": "2024-01-15T10:30:00.000Z",
      "config": {
        "modelType": "ensemble",
        "useAdvancedModel": true,
        "enableSelfLearning": true
      }
    }
  ],
  "totalModels": 1
}
```

#### Save Model
```bash
POST /api/v1/models/save
Content-Type: application/json

{
  "symbol": "X:BTCUSD",
  "modelName": "BTCUSD_ensemble_v1",
  "description": "Ensemble model for Bitcoin USD",
  "version": "1.0.0"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Model BTCUSD_ensemble_v1 saved successfully",
  "fileName": "BTCUSD_ensemble_v1_X_BTCUSD.json",
  "modelData": {
    "symbol": "X:BTCUSD",
    "modelName": "BTCUSD_ensemble_v1",
    "description": "Ensemble model for Bitcoin USD",
    "version": "1.0.0",
    "savedAt": "2024-01-15T10:30:00.000Z",
    "config": {
      "symbol": "X:BTCUSD",
      "version": "1.0.0"
    }
  }
}
```

## 🔧 Advanced Features

### Self-Learning System

The system includes a sophisticated self-learning mechanism:

1. **Continuous Performance Monitoring**: Models track prediction accuracy over time
2. **Automatic Retraining**: Models retrain when performance drops below threshold
3. **Dynamic Weight Adjustment**: Ensemble weights adjust based on individual model performance
4. **Performance Metrics**: Comprehensive tracking of accuracy, directional accuracy, and profit/loss

### Advanced Model Architecture

- **LSTM with Batch Normalization**: Advanced neural network with regularization
- **Random Forest with Hyperparameter Optimization**: Enhanced tree-based model
- **SVM with Advanced Kernels**: Support vector machine with RBF kernel
- **Ensemble Learning**: Dynamic weighted combination of all models

### Fundamental Analysis

- **News Sentiment Analysis**: Real-time analysis from trusted sources
- **Social Media Monitoring**: Reddit and Twitter sentiment tracking
- **Market Sentiment Scoring**: Combined technical and fundamental analysis
- **Risk Assessment**: Comprehensive risk evaluation based on multiple factors

## 📈 Usage Examples

### Basic Trading Signal
```bash
curl -X POST http://localhost:3000/api/v1/trading/signal \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "X:BTCUSD",
    "accountBalance": 10000,
    "riskPercentage": 2,
    "useAdvancedModel": true
  }'
```

### Advanced Model Training
```bash
curl -X POST http://localhost:3000/api/v1/trading/train-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "X:BTCUSD",
    "modelType": "ensemble",
    "useAdvancedModel": true,
    "enableSelfLearning": true,
    "epochs": 200
  }'
```

### Get Model Status
```bash
curl http://localhost:3000/api/v1/trading/model-status/X:BTCUSD
```

## 🚀 Deployment

### Production Setup

1. **Environment Variables**
```bash
NODE_ENV=production
PORT=3000
POLYGON_API_KEY=your_production_key
MONGODB_URI=your_production_mongodb_uri
REDIS_URL=your_production_redis_url
```

2. **PM2 Configuration**
```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

3. **Docker Deployment**
```bash
docker build -t crypto-prediction-server .
docker run -p 3000:3000 crypto-prediction-server
```

## 📊 Monitoring

### Health Checks
```bash
curl http://localhost:3000/api/v1/health
```

### Model Performance
```bash
curl http://localhost:3000/api/v1/trading/model-status/X:BTCUSD
```

### Logs
```bash
# View application logs
tail -f logs/combined.log

# View prediction logs
tail -f logs/predictions.log

# View error logs
tail -f logs/error.log
```

## 🔒 Security

- **Rate Limiting**: 100 requests per minute per IP
- **Input Validation**: Comprehensive request validation with Joi
- **CORS Protection**: Configurable cross-origin resource sharing
- **Helmet Security**: HTTP security headers
- **API Key Authentication**: Optional API key validation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the API documentation at `/api/v1/docs`
- Review the logs for debugging information

---

**Note**: This is a production-ready system designed for real trading. Always test thoroughly in a demo environment before using with real funds. The system includes advanced risk management, but trading cryptocurrencies involves significant risk. 

🧠 What Does "Spot Trading" Mean (vs. CFDs)?
🔹 Spot Trading (Binance, Coinbase APIs)
You buy or sell the actual asset (e.g., Bitcoin, Ethereum).

When you place an order on Binance or Coinbase, you're transferring ownership of that crypto.

Example: Buy 0.1 BTC at $60,000 → you now own 0.1 BTC in your exchange wallet.

Prices reflect real supply and demand on the exchange.

There's no leverage by default.

APIs reflect actual market data: order books, trades, tickers, candlesticks.

👉 These APIs give you real-time snapshots of:

What people are bidding/offering (order book)

Latest trades and prices (ticker/trade feed)

Historical price data (candlesticks)

🔹 CFD Trading (Contracts for Difference)
You do NOT own the asset.

You're trading a contract that mirrors the asset’s price — basically a bet on price movement.

You can go long or short, use leverage, and often never touch the underlying asset.

Your profit = (exit price - entry price) × size, potentially adjusted for leverage.

Example:

Open CFD long on BTC at $60,000 with x10 leverage

BTC goes to $61,000 → you earn 10× the 1.6% gain

But you don’t own BTC, you’re just gaining/losing based on the price move

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Test Specific Components
```bash
# Test chat functionality
npm run test:chat

# Test LLM chat
npm run test:llm

# Test advanced chat with LangGraph
npm run test:advanced-chat

# Test CFD trading with risk ratios and pip calculations
npm run test:cfd
```

### CFD Trading Test Examples

The CFD trading tests cover various scenarios:

```javascript
// Small account test (1:3 ratio)
{
    symbol: 'X:BTCUSD',
    accountBalance: 100,
    lotSize: 0.01,
    riskPercentage: 2,
    riskRatio: '1:3'
}

// Medium account test (1:5 ratio)
{
    symbol: 'X:ETHUSD',
    accountBalance: 500,
    lotSize: 0.05,
    riskPercentage: 3,
    riskRatio: '1:5'
}

// Large account test (1:7 ratio)
{
    symbol: 'X:BTCUSD',
    accountBalance: 2000,
    lotSize: 0.1,
    riskPercentage: 1.5,
    riskRatio: '1:7'
}
```

### Test Different Lot Sizes
The system supports various lot sizes:
- **0.01 lot** = 1,000 units
- **0.05 lot** = 5,000 units  
- **0.1 lot** = 10,000 units
- **0.5 lot** = 50,000 units
- **1.0 lot** = 100,000 units

