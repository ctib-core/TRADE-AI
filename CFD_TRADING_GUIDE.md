# CFD Trading System Guide

This document explains the enhanced CFD trading system with proper risk ratios, pip calculations, and lot size management.

## 🔧 **Key Improvements**

### **1. Risk Ratios (1:3, 1:5, 1:7)**
Instead of fixed percentages, the system now uses proper risk:reward ratios:

- **1:3 Ratio**: For every 1 pip risked, aim for 3 pips profit
- **1:5 Ratio**: For every 1 pip risked, aim for 5 pips profit  
- **1:7 Ratio**: For every 1 pip risked, aim for 7 pips profit

### **2. Account Balance-Based Ratio Selection**
```javascript
function getOptimalRiskRatio(accountBalance) {
    if (accountBalance < 100) return '1:3';    // Small accounts
    if (accountBalance < 500) return '1:5';    // Medium accounts
    if (accountBalance < 2000) return '1:7';   // Large accounts
    return '1:5'; // Default for larger accounts
}
```

### **3. Proper Pip Calculations**
Different assets have different pip values:

```javascript
function getPipValue(symbol) {
    switch (symbol) {
        case 'X:BTCUSD': return 0.01; // $0.01 per pip
        case 'X:ETHUSD': return 0.01; // $0.01 per pip
        default: return 0.01; // Default for other crypto pairs
    }
}
```

## 📊 **API Request Format**

### **Trading Signal Request**
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

### **Response Format**
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
        "freeMargin": 3571.43
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
    "analysis": {
        "signalStrength": 2.22,
        "riskAssessment": "MEDIUM",
        "confidenceScore": 0.75
    }
}
```

## 🧮 **Calculation Examples**

### **Example 1: BTC Trade with 1:3 Ratio**
- **Entry**: $45,000
- **Stop Loss**: $44,800 (200 pips risk)
- **Take Profit**: $45,600 (600 pips reward)
- **Risk/Reward**: 200:600 = 1:3 ratio

### **Example 2: ETH Trade with 1:5 Ratio**
- **Entry**: $3,000
- **Stop Loss**: $2,980 (200 pips risk)
- **Take Profit**: $3,100 (1000 pips reward)
- **Risk/Reward**: 200:1000 = 1:5 ratio

## 💰 **Lot Size and Position Sizing**

### **Lot Size Conversion**
```javascript
// 1 standard lot = 100,000 units
const units = lotSize * 100000;

// Examples:
// 0.01 lot = 1,000 units
// 0.05 lot = 5,000 units
// 0.1 lot = 10,000 units
// 1.0 lot = 100,000 units
```

### **Profit/Loss Calculation**
```javascript
// Profit = Take Profit Pips × Units × Pip Value
const potentialProfit = takeProfitPips * units * pipValue;

// Loss = Stop Loss Pips × Units × Pip Value
const potentialLoss = stopLossPips * units * pipValue;
```

## 🎯 **Risk Management Features**

### **1. Dynamic Leverage**
```javascript
const leverage = Math.min(maxLeverage, Math.floor(confidence * 10));
// Higher confidence = higher leverage (up to max)
```

### **2. Margin Requirements**
```javascript
const marginRequired = (units * entryPrice) / leverage;
const freeMargin = accountBalance - marginRequired;
```

### **3. Risk Assessment**
```javascript
function assessRisk(confidence, priceChangePercent) {
    const riskScore = (1 - confidence) + (Math.abs(priceChangePercent) / 10);
    
    if (riskScore < 0.3) return 'LOW';
    if (riskScore < 0.6) return 'MEDIUM';
    return 'HIGH';
}
```

## 🔍 **Testing the System**

### **Run CFD Trading Tests**
```bash
npm run test:cfd
```

### **Test Different Scenarios**
```javascript
// Small account test
{
    symbol: 'X:BTCUSD',
    accountBalance: 100,
    lotSize: 0.01,
    riskPercentage: 2,
    riskRatio: '1:3'
}

// Large account test
{
    symbol: 'X:ETHUSD',
    accountBalance: 2000,
    lotSize: 0.1,
    riskPercentage: 1.5,
    riskRatio: '1:7'
}
```

## 🚨 **Key Issues Fixed**

### **1. Confidence Calculation**
- **Before**: `confidence: null`
- **After**: Proper confidence calculation with bounds (0-1)

### **2. Risk Ratios**
- **Before**: Fixed 1.5x take profit ratio
- **After**: Configurable 1:3, 1:5, 1:7 ratios

### **3. Lot Size**
- **Before**: ML-generated position sizing
- **After**: User-provided lot size with proper calculations

### **4. Pip Calculations**
- **Before**: Percentage-based calculations
- **After**: Proper pip-based calculations for different assets

### **5. Profit/Loss Calculations**
- **Before**: Generic calculations
- **After**: CFD-specific pip-based profit/loss calculations

## 📈 **Benefits of New System**

1. **Proper Risk Management**: Real risk:reward ratios
2. **Accurate Calculations**: Pip-based instead of percentage-based
3. **User Control**: Lot size provided by user, not ML
4. **Better Confidence**: Proper confidence calculation
5. **CFD Compliance**: Follows standard CFD trading practices
6. **Flexible Ratios**: Different ratios for different account sizes
7. **Accurate P&L**: Realistic profit and loss calculations

## 🔧 **Configuration Options**

### **Environment Variables**
```bash
# Trading Configuration
DEFAULT_LEVERAGE=10
MAX_POSITION_SIZE=1000
RISK_PERCENTAGE=2
```

### **Risk Ratio Guidelines**
- **Small Accounts (< $100)**: Use 1:3 ratio
- **Medium Accounts ($100-$500)**: Use 1:5 ratio  
- **Large Accounts ($500-$2000)**: Use 1:7 ratio
- **Very Large Accounts (> $2000)**: Use 1:5 ratio (conservative)

This enhanced system provides proper CFD trading functionality with accurate risk management, pip calculations, and user-controlled position sizing.