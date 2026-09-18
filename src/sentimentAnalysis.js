// Sentiment analysis for market news and social signals
// Uses deterministic pattern matching + keyword scoring
// No external ML dependencies; works locally

const POSITIVE_KEYWORDS = [
  'bull', 'rally', 'jump', 'gain', 'higher', 'up', 'rise',
  'strong', 'bullish', 'buy', 'positive', 'optimistic', 'recovery',
  'breakthrough', 'outperform', 'exceed', 'beat', 'upside', 'momentum',
  'cooler', 'softer', // Good for gold/rates (dovish)
];

const NEGATIVE_KEYWORDS = [
  'bear', 'crash', 'plunge', 'fall', 'loss', 'lower', 'down',
  'weak', 'bearish', 'sell', 'negative', 'pessimistic', 'fear',
  'breakdown', 'underperform', 'miss', 'downside', 'reversal', 'capitulation',
  'hotter', 'hot', 'stronger', 'surge', // Bad for rates (hawkish = gold bearish)
];

const NEUTRAL_KEYWORDS = [
  'hold', 'steady', 'flat', 'sideways', 'consolidat', 'range', 'neutral',
  'mixed', 'uncertain', 'wait', 'cautious', 'stable',
];

// Asset-specific patterns
const BTC_KEYWORDS = ['bitcoin', 'btc', 'crypto', 'ethereum', 'altcoin', 'blockchain'];
const GOLD_KEYWORDS = ['gold', 'xau', 'precious metals', 'bullion', 'safe haven'];
const USD_KEYWORDS = ['dollar', 'dxy', 'usd', 'fed', 'yield', 'rate'];

/**
 * Analyze sentiment of a single headline/text
 * Returns: { sentiment: 'bullish' | 'bearish' | 'neutral', score: -1 to +1, keywords: [] }
 */
export function analyzeSentiment(text) {
  if (!text || typeof text !== 'string') {
    return { sentiment: 'neutral', score: 0, keywords: [], error: 'Invalid input' };
  }

  const lowerText = text.toLowerCase();
  const positiveMatches = countMatches(lowerText, POSITIVE_KEYWORDS);
  const negativeMatches = countMatches(lowerText, NEGATIVE_KEYWORDS);
  const neutralMatches = countMatches(lowerText, NEUTRAL_KEYWORDS);

  const totalMatches = positiveMatches + negativeMatches + neutralMatches;
  if (totalMatches === 0) {
    return { sentiment: 'neutral', score: 0, keywords: [], confidence: 0 };
  }

  const score = round2((positiveMatches - negativeMatches) / totalMatches);
  const sentiment = score > 0.2 ? 'bullish' : score < -0.2 ? 'bearish' : 'neutral';
  const confidence = round2(Math.min(100, Math.abs(score) * 100 + totalMatches * 10));

  const extractedKeywords = extractKeywords(lowerText, [POSITIVE_KEYWORDS, NEGATIVE_KEYWORDS, NEUTRAL_KEYWORDS]);

  return { sentiment, score, keywords: extractedKeywords, confidence: round2(confidence), totalMatches };
}

/**
 * Analyze multiple news items and aggregate by asset
 */
export function aggregateSentimentByAsset(newsItems = []) {
  if (!Array.isArray(newsItems)) {
    return { btc: null, gold: null, usd: null };
  }

  const btcNews = newsItems.filter((item) => containsAny(item.title?.toLowerCase?.() ?? '', BTC_KEYWORDS));
  const goldNews = newsItems.filter((item) => containsAny(item.title?.toLowerCase?.() ?? '', GOLD_KEYWORDS));
  const usdNews = newsItems.filter((item) => containsAny(item.title?.toLowerCase?.() ?? '', USD_KEYWORDS));

  return {
    btc: aggregateSentiments(btcNews),
    gold: aggregateSentiments(goldNews),
    usd: aggregateSentiments(usdNews),
  };
}

/**
 * Fetch news from NewsAPI (requires API key or returns mock data)
 * Mock data is used when no API key is available
 */
export async function fetchNews({ fetchImpl = globalThis.fetch, apiKey = '', maxResults = 10 } = {}) {
  if (!fetchImpl) {
    throw new Error('fetch is required to fetch news');
  }

  // If no API key, return mock data with disclaimer
  if (!apiKey || apiKey === 'demo') {
    return {
      source: 'mock',
      items: generateMockNews(),
      note: 'Using mock news data. Set NewsAPI key for real data.',
    };
  }

  try {
    const queries = [
      { q: 'bitcoin OR btc', category: 'btc' },
      { q: 'gold OR xau', category: 'gold' },
      { q: 'dollar OR dxy OR fed rate', category: 'usd' },
    ];

    const newsResults = await Promise.all(
      queries.map((q) =>
        fetchNewsQuery(fetchImpl, apiKey, q.q, maxResults).then((items) => ({ category: q.category, items }))
      )
    );

    const allNews = [];
    newsResults.forEach((result) => {
      result.items.forEach((item) => {
        allNews.push({ ...item, category: result.category });
      });
    });

    return {
      source: 'newsapi',
      items: allNews.slice(0, maxResults * 3),
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    // Fallback to mock data on error
    return {
      source: 'mock',
      items: generateMockNews(),
      error: err.message,
      note: 'Fell back to mock data due to fetch error.',
    };
  }
}

/**
 * Build a sentiment summary for the market note
 * With explicit interpretation and implications for gold/BTC
 */
export function buildSentimentNote(sentimentByAsset) {
  if (!sentimentByAsset) {
    return 'Sentiment context unavailable.';
  }

  const lines = ['Sentiment & news context:'];

  if (sentimentByAsset.btc && sentimentByAsset.btc.sentiment) {
    const btcSentiment = sentimentByAsset.btc.sentiment;
    const btcInterpretation = 
      btcSentiment === 'bullish' ? '(buyer interest, upside bias)' :
      btcSentiment === 'bearish' ? '(selling pressure, downside bias)' :
      '(neutral, no clear bias)';
    lines.push(`  BTC: ${btcSentiment} ${btcInterpretation} (score ${sentimentByAsset.btc.score}, n=${sentimentByAsset.btc.count} items)`);
  }

  if (sentimentByAsset.gold && sentimentByAsset.gold.sentiment) {
    const goldSentiment = sentimentByAsset.gold.sentiment;
    const goldInterpretation =
      goldSentiment === 'bullish' ? '(safe-haven demand, upside bias)' :
      goldSentiment === 'bearish' ? '(weak demand, downside bias)' :
      '(no clear direction from news)';
    lines.push(`  Gold: ${goldSentiment} ${goldInterpretation} (score ${sentimentByAsset.gold.score}, n=${sentimentByAsset.gold.count} items)`);
  }

  if (sentimentByAsset.usd && sentimentByAsset.usd.sentiment) {
    const usdSentiment = sentimentByAsset.usd.sentiment;
    const usdInterpretation =
      usdSentiment === 'bullish' ? '(strong USD, headwind for commodities)' :
      usdSentiment === 'bearish' ? '(weak USD, tailwind for gold/BTC)' :
      '(USD neutral, no commodity impact from sentiment)';
    lines.push(`  USD: ${usdSentiment} ${usdInterpretation} (score ${sentimentByAsset.usd.score}, n=${sentimentByAsset.usd.count} items)`);
  }

  return lines.join('\n');
}

// ============ Helpers ============

async function fetchNewsQuery(fetchImpl, apiKey, q, maxResults) {
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&sortBy=publishedAt&language=en&apiKey=${apiKey}&pageSize=${Math.min(maxResults, 100)}`;
  const response = await fetchImpl(url, { headers: { 'User-Agent': 'qvac-market-note-classifier/1.0' } });

  if (!response.ok) {
    throw new Error(`NewsAPI error: HTTP ${response.status}`);
  }

  const data = await response.json();
  return (data.articles || []).map((article) => ({
    title: article.title,
    description: article.description,
    source: article.source?.name,
    url: article.url,
    publishedAt: article.publishedAt,
  }));
}

function countMatches(text, keywords) {
  return keywords.reduce((count, keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = text.match(regex);
    return count + (matches ? matches.length : 0);
  }, 0);
}

function containsAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function extractKeywords(text, keywordGroups) {
  const found = [];
  keywordGroups.forEach((group) => {
    group.forEach((keyword) => {
      if (text.includes(keyword) && !found.includes(keyword)) {
        found.push(keyword);
      }
    });
  });
  return found.slice(0, 5); // Top 5 keywords
}

function aggregateSentiments(newsItems) {
  if (!Array.isArray(newsItems) || newsItems.length === 0) {
    return { sentiment: 'unknown', score: 0, count: 0 };
  }

  const sentiments = newsItems.map((item) => analyzeSentiment(item.title));
  const avgScore = round2(sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length);
  const sentiment = avgScore > 0.2 ? 'bullish' : avgScore < -0.2 ? 'bearish' : 'neutral';

  return { sentiment, score: avgScore, count: newsItems.length };
}

function generateMockNews() {
  return [
    { title: 'Bitcoin Rally Continues as ETF Inflows Accelerate', category: 'btc' },
    { title: 'Gold Prices Surge on Safe-Haven Demand', category: 'gold' },
    { title: 'US Dollar Weakens on Fed Rate Cut Expectations', category: 'usd' },
    { title: 'Crypto Market Shows Strong Bullish Momentum', category: 'btc' },
    { title: 'Precious Metals Break Higher amid Global Uncertainty', category: 'gold' },
    { title: 'Treasury Yields Fall, Supporting Gold and Crypto Assets', category: 'usd' },
    { title: 'Bitcoin Faces Resistance at Key Technical Level', category: 'btc' },
    { title: 'Gold Consolidates Near Record Highs', category: 'gold' },
    { title: 'Dollar Index Drops on Softer Economic Data', category: 'usd' },
    { title: 'Institutional Demand for Bitcoin Remains Strong', category: 'btc' },
  ];
}

function round2(value) {
  return Math.round(value * 100) / 100;
}
