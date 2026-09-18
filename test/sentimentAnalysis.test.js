import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSentiment, aggregateSentimentByAsset, buildSentimentNote, fetchNews } from '../src/sentimentAnalysis.js';

test('analyzeSentiment: detects bullish sentiment', () => {
  const result = analyzeSentiment('Bitcoin rallies higher on strong ETF inflows');
  assert.equal(result.sentiment, 'bullish');
  assert.ok(result.score > 0);
  assert.ok(result.keywords.includes('rally') || result.keywords.includes('strong') || result.keywords.includes('inflows'));
});

test('analyzeSentiment: detects bearish sentiment', () => {
  const result = analyzeSentiment('Gold crashes on weak demand and selling pressure');
  assert.equal(result.sentiment, 'bearish');
  assert.ok(result.score < 0);
});

test('analyzeSentiment: detects neutral sentiment', () => {
  const result = analyzeSentiment('Markets consolidate in a narrow range');
  assert.equal(result.sentiment, 'neutral');
  assert.ok(Math.abs(result.score) <= 0.2);
});

test('analyzeSentiment: handles mixed signals', () => {
  const result = analyzeSentiment('Bitcoin rallied early but weakness emerged later');
  assert.ok(['bullish', 'bearish', 'neutral'].includes(result.sentiment));
  assert.ok(typeof result.score === 'number');
});

test('analyzeSentiment: returns confidence score', () => {
  const result = analyzeSentiment('Strong bullish rally with massive gains');
  assert.ok(result.confidence >= 0 && result.confidence <= 100);
});

test('analyzeSentiment: extracts keywords', () => {
  const result = analyzeSentiment('Bull market rally with strong gains and positive momentum');
  assert.ok(Array.isArray(result.keywords));
  assert.ok(result.keywords.length > 0);
});

test('analyzeSentiment: handles empty input', () => {
  const result = analyzeSentiment('');
  assert.equal(result.sentiment, 'neutral');
  assert.equal(result.score, 0);
});

test('analyzeSentiment: handles null/undefined', () => {
  const resultNull = analyzeSentiment(null);
  const resultUndef = analyzeSentiment(undefined);
  assert.equal(resultNull.sentiment, 'neutral');
  assert.equal(resultUndef.sentiment, 'neutral');
});

test('analyzeSentiment: case insensitive matching', () => {
  const lower = analyzeSentiment('bitcoin rally');
  const upper = analyzeSentiment('BITCOIN RALLY');
  const mixed = analyzeSentiment('Bitcoin Rally');

  assert.equal(lower.sentiment, upper.sentiment);
  assert.equal(lower.sentiment, mixed.sentiment);
});

test('aggregateSentimentByAsset: segments by asset', () => {
  const newsItems = [
    { title: 'Bitcoin rallies higher' },
    { title: 'Gold prices surge' },
    { title: 'Dollar weakens' },
    { title: 'BTC breaks through resistance' },
  ];

  const result = aggregateSentimentByAsset(newsItems);
  assert.ok(result.btc);
  assert.ok(result.gold);
  assert.ok(result.usd);
});

test('aggregateSentimentByAsse: counts items per asset', () => {
  const newsItems = [
    { title: 'Bitcoin rallies' },
    { title: 'Bitcoin surges' },
    { title: 'Gold rises' },
  ];

  const result = aggregateSentimentByAsset(newsItems);
  assert.ok(result.btc.count >= 2);
  assert.ok(result.gold.count >= 1);
});

test('aggregateSentimentByAsset: handles empty array', () => {
  const result = aggregateSentimentByAsset([]);
  assert.equal(result.btc.sentiment, 'unknown');
  assert.equal(result.gold.sentiment, 'unknown');
  assert.equal(result.usd.sentiment, 'unknown');
});

test('aggregateSentimentByAsset: handles null', () => {
  const result = aggregateSentimentByAsset(null);
  assert.equal(result.btc, null);
  assert.equal(result.gold, null);
  assert.equal(result.usd, null);
});

test('buildSentimentNote: includes BTC sentiment', () => {
  const sentimentByAsset = {
    btc: { sentiment: 'bullish', score: 0.6, count: 5 },
    gold: { sentiment: 'neutral', score: 0, count: 3 },
    usd: { sentiment: 'bearish', score: -0.4, count: 4 },
  };

  const note = buildSentimentNote(sentimentByAsset);
  assert.ok(note.includes('BTC'));
  assert.ok(note.includes('bullish'));
});

test('buildSentimentNote: includes all assets', () => {
  const sentimentByAsset = {
    btc: { sentiment: 'bullish', score: 0.5, count: 2 },
    gold: { sentiment: 'neutral', score: 0, count: 1 },
    usd: { sentiment: 'bearish', score: -0.3, count: 3 },
  };

  const note = buildSentimentNote(sentimentByAsset);
  assert.ok(note.includes('BTC'));
  assert.ok(note.includes('Gold'));
  assert.ok(note.includes('USD'));
});

test('buildSentimentNote: handles null input', () => {
  const note = buildSentimentNote(null);
  assert.equal(note, 'Sentiment context unavailable.');
});

test('buildSentimentNote: handles partial data', () => {
  const sentimentByAsset = {
    btc: { sentiment: 'bullish', score: 0.4, count: 2 },
    gold: null,
    usd: null,
  };

  const note = buildSentimentNote(sentimentByAsset);
  assert.ok(note.includes('BTC'));
  assert.ok(!note.includes('Gold'));
});

test('fetchNews: returns mock data when no API key', async () => {
  const result = await fetchNews({ fetchImpl: async () => ({ ok: false }), apiKey: '' });
  assert.equal(result.source, 'mock');
  assert.ok(Array.isArray(result.items));
  assert.ok(result.items.length > 0);
});

test('fetchNews: mock news includes BTC, Gold, USD articles', async () => {
  const result = await fetchNews({ apiKey: '' });
  const titles = result.items.map((item) => item.title.toLowerCase());
  assert.ok(titles.some((t) => t.includes('bitcoin') || t.includes('btc')));
  assert.ok(titles.some((t) => t.includes('gold')));
  assert.ok(titles.some((t) => t.includes('dollar') || t.includes('usd')));
});

test('fetchNews: handles fetch errors gracefully', async () => {
  const badFetch = async () => {
    throw new Error('Network error');
  };

  const result = await fetchNews({ fetchImpl: badFetch, apiKey: 'test' });
  assert.equal(result.source, 'mock');
  assert.ok(result.error);
  assert.ok(result.note.includes('Fell back to mock data'));
});

test('sentimentAnalysis integration: real headline example', () => {
  const headline = 'US CPI cooler than expected; gold rallies on rate cut expectations';
  const result = analyzeSentiment(headline);
  assert.equal(result.sentiment, 'bullish'); // Rate cuts are positive for gold
  assert.ok(result.score > 0);
});

test('sentimentAnalysis integration: mixed headline example', () => {
  const headline = 'Bitcoin crashes but recovers on strong institutional buying';
  const result = analyzeSentiment(headline);
  // Mixed signals, but more positive elements
  assert.ok(['bullish', 'neutral'].includes(result.sentiment));
});

test('sentimentAnalysis: confidence score correlates with match count', () => {
  const weak = analyzeSentiment('up');
  const strong = analyzeSentiment('Bitcoin strongly rallies higher with massive bullish gains');
  // More keywords = higher confidence due to totalMatches multiplication
  assert.ok(strong.confidence >= weak.confidence);
});
