import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/v1/trading';

// Test different scenarios for CFD trading
async function testCFDTrading() {
    console.log('🚀 Testing CFD Trading with Risk Ratios and Pip Calculations\n');

    const testCases = [
        {
            name: 'BTC Small Account (1:3 ratio)',
            data: {
                symbol: 'X:BTCUSD',
                accountBalance: 100,
                lotSize: 0.01, // 1000 units
                riskPercentage: 2,
                riskRatio: '1:3',
                maxLeverage: 10
            }
        },
        {
            name: 'ETH Medium Account (1:5 ratio)',
            data: {
                symbol: 'X:ETHUSD',
                accountBalance: 500,
                lotSize: 0.05, // 5000 units
                riskPercentage: 3,
                riskRatio: '1:5',
                maxLeverage: 20
            }
        },
        {
            name: 'BTC Large Account (1:7 ratio)',
            data: {
                symbol: 'X:BTCUSD',
                accountBalance: 2000,
                lotSize: 0.1, // 10000 units
                riskPercentage: 1.5,
                riskRatio: '1:7',
                maxLeverage: 50
            }
        }
    ];

    for (const testCase of testCases) {
        console.log(`\n🧪 Testing: ${testCase.name}`);
        console.log('Request data:', testCase.data);
        
        try {
            const response = await axios.post(`${BASE_URL}/signal`, testCase.data);
            const result = response.data;
            
            console.log('✅ Response received:');
            console.log(`Signal: ${result.signal.signal}`);
            console.log(`Entry: $${result.signal.entry}`);
            console.log(`Stop Loss: $${result.signal.stopLoss}`);
            console.log(`Take Profit: $${result.signal.takeProfit}`);
            console.log(`Risk/Reward Ratio: ${result.signal.riskRewardRatio}`);
            console.log(`Pips - Stop Loss: ${result.signal.pips.stopLoss}, Take Profit: ${result.signal.pips.takeProfit}`);
            console.log(`Confidence: ${result.prediction.confidence}`);
            console.log(`Lot Size: ${result.signal.positionSize.lotSize} (${result.signal.positionSize.units} units)`);
            console.log(`Potential Profit: $${result.signal.potentialProfit}`);
            console.log(`Potential Loss: $${result.signal.potentialLoss}`);
            console.log(`Margin Required: $${result.signal.marginRequired}`);
            console.log(`Free Margin: $${result.signal.freeMargin}`);
            console.log(`Risk Assessment: ${result.signal.analysis.riskAssessment}`);
            
        } catch (error) {
            console.error(`❌ Test failed:`, error.response?.data || error.message);
        }
    }
}

// Test position size calculation
async function testPositionSize() {
    console.log('\n🧪 Testing Position Size Calculation');
    
    try {
        const response = await axios.post(`${BASE_URL}/position-size`, {
            symbol: 'X:BTCUSD',
            entryPrice: 45000,
            stopLoss: 44800,
            accountBalance: 1000,
            riskPercentage: 2,
            leverage: 10
        });
        
        console.log('✅ Position size calculation:');
        console.log(response.data);
        
    } catch (error) {
        console.error('❌ Position size test failed:', error.response?.data || error.message);
    }
}

// Test different lot sizes
async function testLotSizes() {
    console.log('\n🧪 Testing Different Lot Sizes');
    
    const lotSizes = [0.01, 0.05, 0.1, 0.5, 1.0];
    
    for (const lotSize of lotSizes) {
        console.log(`\nTesting lot size: ${lotSize}`);
        
        try {
            const response = await axios.post(`${BASE_URL}/signal`, {
                symbol: 'X:ETHUSD',
                accountBalance: 1000,
                lotSize: lotSize,
                riskPercentage: 2,
                riskRatio: '1:3',
                maxLeverage: 10
            });
            
            const result = response.data;
            console.log(`Units: ${result.signal.positionSize.units}`);
            console.log(`Margin Required: $${result.signal.marginRequired}`);
            console.log(`Potential Profit: $${result.signal.potentialProfit}`);
            console.log(`Potential Loss: $${result.signal.potentialLoss}`);
            
        } catch (error) {
            console.error(`❌ Lot size ${lotSize} test failed:`, error.response?.data || error.message);
        }
    }
}

// Main test function
async function runAllTests() {
    try {
        await testCFDTrading();
        await testPositionSize();
        await testLotSizes();
        
        console.log('\n✅ All CFD trading tests completed!');
        
    } catch (error) {
        console.error('\n❌ Test suite failed:', error.message);
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests();
}

export { testCFDTrading, testPositionSize, testLotSizes, runAllTests };