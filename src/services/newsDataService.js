import axios from 'axios';
import { logger } from '../utils/logger.js';
import { getRedisClient } from '../config/redis.js';

class NewsDataService {
    constructor() {
        this.sources = {
            // Crypto-specific news sources
            coindesk: {
                name: 'CoinDesk',
                url: 'https://www.coindesk.com/api/v1',
                apiKey: process.env.COINDESK_API_KEY
            },
            cointelegraph: {
                name: 'CoinTelegraph',
                url: 'https://cointelegraph.com/api',
                apiKey: process.env.COINTELEGRAPH_API_KEY
            },
            cryptonews: {
                name: 'CryptoNews',
                url: 'https://cryptonews.com/api/v1',
                apiKey: process.env.CRYPTONEWS_API_KEY
            },
            // Financial news sources
            reuters: {
                name: 'Reuters',
                url: 'https://www.reuters.com/api',
                apiKey: process.env.REUTERS_API_KEY
            },
            bloomberg: {
                name: 'Bloomberg',
                url: 'https://www.bloomberg.com/api',
                apiKey: process.env.BLOOMBERG_API_KEY
            },
            // Alternative sources
            reddit: {
                name: 'Reddit',
                url: 'https://www.reddit.com/r/cryptocurrency/.json',
                apiKey: null
            },
            twitter: {
                name: 'Twitter',
                url: 'https://api.twitter.com/2',
                apiKey: process.env.TWITTER_API_KEY
            }
        };

        this.cacheTTL = 1800; // 30 minutes cache
        this.sentimentAnalyzer = null;
        
        logger.info('NewsDataService initialized');
    }

    /**
     * Get news articles for a specific cryptocurrency
     * @param {string} symbol - Crypto symbol (e.g., 'BTC', 'ETH')
     * @param {number} days - Number of days to look back
     * @returns {Promise<Array>} News articles with sentiment analysis
     */
    async getNewsForSymbol(symbol, days = 7) {
        const cacheKey = `news:${symbol}:${days}`;
        
        try {
            // Try to get from cache first
            const redisClient = getRedisClient();
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                logger.debug(`Cache hit for news: ${symbol}`);
                return JSON.parse(cachedData);
            }

            const articles = await this.fetchNewsFromSources(symbol, days);
            const articlesWithSentiment = await this.analyzeSentiment(articles);
            
            // Cache the results
            await redisClient.setex(cacheKey, this.cacheTTL, JSON.stringify(articlesWithSentiment));
            
            logger.info(`Fetched ${articlesWithSentiment.length} news articles for ${symbol}`);
            return articlesWithSentiment;
        } catch (error) {
            logger.error(`Error fetching news for ${symbol}:`, error);
            return [];
        }
    }

    /**
     * Fetch news from multiple sources
     */
    async fetchNewsFromSources(symbol, days) {
        const articles = [];
        const promises = [];

        // Fetch from each source
        for (const [sourceKey, source] of Object.entries(this.sources)) {
            if (source.apiKey || sourceKey === 'reddit') {
                promises.push(
                    this.fetchFromSource(sourceKey, source, symbol, days)
                        .then(articles => articles)
                        .catch(error => {
                            logger.warn(`Failed to fetch from ${source.name}:`, error.message);
                            return [];
                        })
                );
            }
        }

        const results = await Promise.all(promises);
        results.forEach(sourceArticles => articles.push(...sourceArticles));

        return articles;
    }

    /**
     * Fetch news from a specific source
     */
    async fetchFromSource(sourceKey, source, symbol, days) {
        const articles = [];

        try {
            switch (sourceKey) {
                case 'coindesk':
                    articles.push(...await this.fetchFromCoinDesk(symbol, days));
                    break;
                case 'cointelegraph':
                    articles.push(...await this.fetchFromCoinTelegraph(symbol, days));
                    break;
                case 'cryptonews':
                    articles.push(...await this.fetchFromCryptoNews(symbol, days));
                    break;
                case 'reddit':
                    articles.push(...await this.fetchFromReddit(symbol, days));
                    break;
                case 'twitter':
                    articles.push(...await this.fetchFromTwitter(symbol, days));
                    break;
                default:
                    logger.warn(`Unknown news source: ${sourceKey}`);
            }
        } catch (error) {
            logger.error(`Error fetching from ${source.name}:`, error);
        }

        return articles;
    }

    /**
     * Fetch from CoinDesk API
     */
    async fetchFromCoinDesk(symbol, days) {
        try {
            const response = await axios.get(`${this.sources.coindesk.url}/news`, {
                params: {
                    q: symbol,
                    days: days,
                    api_key: this.sources.coindesk.apiKey
                },
                timeout: 10000
            });

            return response.data.articles?.map(article => ({
                title: article.title,
                content: article.description,
                url: article.url,
                publishedAt: article.published_at,
                source: 'CoinDesk',
                author: article.author,
                sentiment: null // Will be analyzed later
            })) || [];
        } catch (error) {
            logger.error('CoinDesk API error:', error.message);
            return [];
        }
    }

    /**
     * Fetch from CoinTelegraph API
     */
    async fetchFromCoinTelegraph(symbol, days) {
        try {
            const response = await axios.get(`${this.sources.cointelegraph.url}/news`, {
                params: {
                    tag: symbol.toLowerCase(),
                    days: days,
                    api_key: this.sources.cointelegraph.apiKey
                },
                timeout: 10000
            });

            return response.data.articles?.map(article => ({
                title: article.title,
                content: article.description,
                url: article.url,
                publishedAt: article.published_at,
                source: 'CoinTelegraph',
                author: article.author,
                sentiment: null
            })) || [];
        } catch (error) {
            logger.error('CoinTelegraph API error:', error.message);
            return [];
        }
    }

    /**
     * Fetch from CryptoNews API
     */
    async fetchFromCryptoNews(symbol, days) {
        try {
            const response = await axios.get(`${this.sources.cryptonews.url}/news`, {
                params: {
                    ticker: symbol,
                    days: days,
                    api_key: this.sources.cryptonews.apiKey
                },
                timeout: 10000
            });

            return response.data.articles?.map(article => ({
                title: article.title,
                content: article.description,
                url: article.url,
                publishedAt: article.published_at,
                source: 'CryptoNews',
                author: article.author,
                sentiment: null
            })) || [];
        } catch (error) {
            logger.error('CryptoNews API error:', error.message);
            return [];
        }
    }

    /**
     * Fetch from Reddit
     */
    async fetchFromReddit(symbol, days) {
        try {
            const response = await axios.get(this.sources.reddit.url, {
                params: {
                    limit: 25,
                    t: 'week'
                },
                timeout: 10000
            });

            const posts = response.data.data.children || [];
            const symbolLower = symbol.toLowerCase();

            return posts
                .filter(post => {
                    const title = post.data.title.toLowerCase();
                    const selftext = post.data.selftext.toLowerCase();
                    return title.includes(symbolLower) || selftext.includes(symbolLower);
                })
                .map(post => ({
                    title: post.data.title,
                    content: post.data.selftext,
                    url: `https://reddit.com${post.data.permalink}`,
                    publishedAt: new Date(post.data.created_utc * 1000).toISOString(),
                    source: 'Reddit',
                    author: post.data.author,
                    score: post.data.score,
                    sentiment: null
                }));
        } catch (error) {
            logger.error('Reddit API error:', error.message);
            return [];
        }
    }

    /**
     * Fetch from Twitter
     */
    async fetchFromTwitter(symbol, days) {
        try {
            const response = await axios.get(`${this.sources.twitter.url}/tweets/search/recent`, {
                params: {
                    query: `${symbol} crypto`,
                    max_results: 100,
                    'tweet.fields': 'created_at,author_id,public_metrics'
                },
                headers: {
                    'Authorization': `Bearer ${this.sources.twitter.apiKey}`
                },
                timeout: 10000
            });

            return response.data.data?.map(tweet => ({
                title: tweet.text.substring(0, 100) + '...',
                content: tweet.text,
                url: `https://twitter.com/user/status/${tweet.id}`,
                publishedAt: tweet.created_at,
                source: 'Twitter',
                author: tweet.author_id,
                score: tweet.public_metrics?.retweet_count || 0,
                sentiment: null
            })) || [];
        } catch (error) {
            logger.error('Twitter API error:', error.message);
            return [];
        }
    }

    /**
     * Analyze sentiment of news articles
     */
    async analyzeSentiment(articles) {
        if (!articles.length) return articles;

        const articlesWithSentiment = [];

        for (const article of articles) {
            try {
                const sentiment = await this.analyzeTextSentiment(article.title + ' ' + article.content);
                articlesWithSentiment.push({
                    ...article,
                    sentiment: sentiment
                });
            } catch (error) {
                logger.warn('Sentiment analysis failed for article:', error.message);
                articlesWithSentiment.push({
                    ...article,
                    sentiment: { score: 0, label: 'neutral' }
                });
            }
        }

        return articlesWithSentiment;
    }

    /**
     * Analyze text sentiment using a simple approach
     * In production, you'd use a proper NLP service like AWS Comprehend or Google NLP
     */
    async analyzeTextSentiment(text) {
        // Simple keyword-based sentiment analysis
        const positiveWords = [
            'bullish', 'surge', 'rally', 'gain', 'profit', 'positive', 'growth',
            'adoption', 'institutional', 'partnership', 'upgrade', 'innovation',
            'success', 'breakthrough', 'milestone', 'record', 'high'
        ];

        const negativeWords = [
            'bearish', 'crash', 'drop', 'loss', 'negative', 'decline',
            'regulation', 'ban', 'hack', 'scam', 'fraud', 'sell-off',
            'correction', 'downtrend', 'resistance', 'failure', 'low'
        ];

        const textLower = text.toLowerCase();
        let positiveScore = 0;
        let negativeScore = 0;

        positiveWords.forEach(word => {
            const regex = new RegExp(word, 'gi');
            const matches = textLower.match(regex);
            if (matches) positiveScore += matches.length;
        });

        negativeWords.forEach(word => {
            const regex = new RegExp(word, 'gi');
            const matches = textLower.match(regex);
            if (matches) negativeScore += matches.length;
        });

        const totalScore = positiveScore + negativeScore;
        let sentimentScore = 0;
        let label = 'neutral';

        if (totalScore > 0) {
            sentimentScore = (positiveScore - negativeScore) / totalScore;
            if (sentimentScore > 0.1) label = 'positive';
            else if (sentimentScore < -0.1) label = 'negative';
        }

        return {
            score: sentimentScore,
            label: label,
            positiveCount: positiveScore,
            negativeCount: negativeScore
        };
    }

    /**
     * Get sentiment summary for a symbol
     */
    async getSentimentSummary(symbol, days = 7) {
        const articles = await this.getNewsForSymbol(symbol, days);
        
        if (!articles.length) {
            return {
                symbol,
                totalArticles: 0,
                averageSentiment: 0,
                sentimentDistribution: { positive: 0, negative: 0, neutral: 0 },
                topPositiveNews: [],
                topNegativeNews: []
            };
        }

        const sentiments = articles.map(article => article.sentiment.score);
        const averageSentiment = sentiments.reduce((sum, score) => sum + score, 0) / sentiments.length;

        const sentimentDistribution = {
            positive: articles.filter(a => a.sentiment.label === 'positive').length,
            negative: articles.filter(a => a.sentiment.label === 'negative').length,
            neutral: articles.filter(a => a.sentiment.label === 'neutral').length
        };

        const topPositiveNews = articles
            .filter(a => a.sentiment.label === 'positive')
            .sort((a, b) => b.sentiment.score - a.sentiment.score)
            .slice(0, 5);

        const topNegativeNews = articles
            .filter(a => a.sentiment.label === 'negative')
            .sort((a, b) => a.sentiment.score - b.sentiment.score)
            .slice(0, 5);

        return {
            symbol,
            totalArticles: articles.length,
            averageSentiment,
            sentimentDistribution,
            topPositiveNews,
            topNegativeNews,
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Get fundamental analysis combining news sentiment with technical data
     */
    async getFundamentalAnalysis(symbol, technicalData) {
        const sentimentSummary = await this.getSentimentSummary(symbol);
        const news = await this.getNewsForSymbol(symbol, 3); // Last 3 days

        // Calculate fundamental score
        const fundamentalScore = this.calculateFundamentalScore(sentimentSummary, technicalData);

        return {
            symbol,
            timestamp: new Date().toISOString(),
            fundamentalScore,
            sentimentAnalysis: sentimentSummary,
            recentNews: news.slice(0, 10),
            analysis: {
                newsImpact: this.assessNewsImpact(sentimentSummary),
                marketSentiment: this.assessMarketSentiment(sentimentSummary, technicalData),
                recommendation: this.generateFundamentalRecommendation(fundamentalScore)
            }
        };
    }

    /**
     * Calculate fundamental score based on sentiment and technical data
     */
    calculateFundamentalScore(sentimentSummary, technicalData) {
        let score = 0.5; // Neutral starting point

        // Sentiment impact (40% weight)
        const sentimentImpact = sentimentSummary.averageSentiment * 0.4;
        score += sentimentImpact;

        // News volume impact (20% weight)
        const newsVolumeScore = Math.min(sentimentSummary.totalArticles / 50, 1) * 0.2;
        score += newsVolumeScore;

        // Technical data impact (40% weight)
        if (technicalData) {
            const technicalScore = this.calculateTechnicalImpact(technicalData) * 0.4;
            score += technicalScore;
        }

        return Math.max(0, Math.min(1, score)); // Clamp between 0 and 1
    }

    /**
     * Calculate technical impact on fundamental score
     */
    calculateTechnicalImpact(technicalData) {
        let impact = 0;

        // Volume analysis
        if (technicalData.volume && technicalData.averageVolume) {
            const volumeRatio = technicalData.volume / technicalData.averageVolume;
            impact += Math.min(volumeRatio - 1, 0.5) * 0.3;
        }

        // Price momentum
        if (technicalData.priceChangePercent) {
            impact += (technicalData.priceChangePercent / 10) * 0.3;
        }

        // Volatility impact
        if (technicalData.volatility) {
            impact += (1 - Math.min(technicalData.volatility / 100, 1)) * 0.2;
        }

        return impact;
    }

    /**
     * Assess news impact on market
     */
    assessNewsImpact(sentimentSummary) {
        const { averageSentiment, totalArticles } = sentimentSummary;

        if (totalArticles < 5) return 'LOW';
        if (Math.abs(averageSentiment) < 0.1) return 'NEUTRAL';
        if (averageSentiment > 0.1) return 'POSITIVE';
        return 'NEGATIVE';
    }

    /**
     * Assess overall market sentiment
     */
    assessMarketSentiment(sentimentSummary, technicalData) {
        const newsSentiment = sentimentSummary.averageSentiment;
        const technicalSentiment = technicalData?.priceChangePercent ? 
            Math.tanh(technicalData.priceChangePercent / 10) : 0;

        const combinedSentiment = (newsSentiment + technicalSentiment) / 2;

        if (combinedSentiment > 0.2) return 'BULLISH';
        if (combinedSentiment < -0.2) return 'BEARISH';
        return 'NEUTRAL';
    }

    /**
     * Generate fundamental recommendation
     */
    generateFundamentalRecommendation(fundamentalScore) {
        if (fundamentalScore > 0.7) return 'STRONG_BUY';
        if (fundamentalScore > 0.6) return 'BUY';
        if (fundamentalScore > 0.4) return 'HOLD';
        if (fundamentalScore > 0.3) return 'SELL';
        return 'STRONG_SELL';
    }
}

// Create and export a singleton instance
const newsDataService = new NewsDataService();
export default newsDataService; 