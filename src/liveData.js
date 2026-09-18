const BITFINEX_XPB_URL = 'https://api-pub.bitfinex.com/v2/ticker/tBTC%3AXAUT';
const BITFINEX_CANDLES_URL = 'https://api-pub.bitfinex.com/v2/candles/trade:1h:tBTC:XAUT/hist'; // 1h candles
const COINGECKO_PRICE_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,tether-gold&vs_currencies=usd&include_24hr_change=true';

export async function fetchLiveMarketData({ fetchImpl = globalThis.fetch, now = () => new Date(), includeCandles = true } = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch is required to load live market data. Use Node.js 22+ or pass fetchImpl.');
  }

  const requests = [
    fetchJson(fetchImpl, BITFINEX_XPB_URL),
    fetchJson(fetchImpl, COINGECKO_PRICE_URL),
  ];

  if (includeCandles) {
    requests.push(fetchBitfinexCandles(fetchImpl));
  }

  const results = await Promise.allSettled(requests);

  const bitfinexTicker = settledToValue(results[0]);
  const coingeckoPrice = settledToValue(results[1]);
  const candles = includeCandles ? settledToValue(results[2], []) : [];

  if (!bitfinexTicker || !coingeckoPrice) {
    throw new Error('Failed to fetch live market data from Bitfinex or CoinGecko');
  }

  const bitfinex = parseBitfinexTicker(bitfinexTicker);
  const prices = parseCoinGeckoPrice(coingeckoPrice);
  const btcMinusXautChangePct = round2(prices.btcUsd24hChangePct - prices.xautUsd24hChangePct);
  const xpbBias = deriveLiveXpbBias(btcMinusXautChangePct);

  return {
    timestamp: now().toISOString(),
    bitfinex,
    prices,
    relative: {
      btcMinusXautChangePct,
      xpbBias,
      explanation: explainLiveBias(xpbBias, btcMinusXautChangePct),
    },
    candles, // Raw Bitfinex candles for technical analysis
  };
}

export function buildLiveMarketNote(data) {
  return [
    `Live market snapshot at ${data.timestamp}.`,
    `Bitfinex tBTC:XAUT xpb is ${formatNumber(data.bitfinex.xpb, 6)} XAUt per 1 BTC; bid ${formatNumber(data.bitfinex.bid, 6)}, ask ${formatNumber(data.bitfinex.ask, 6)}, spread ${formatNumber(data.bitfinex.spreadPct, 3)}%, 24h change ${formatSigned(data.bitfinex.dailyChangePct)}%, volume ${formatNumber(data.bitfinex.volume, 6)} BTC-equivalent on the pair.`,
    `BTC/USD is $${formatUsd(data.prices.btcUsd)} with 24h change ${formatSigned(data.prices.btcUsd24hChangePct)}%.`,
    `XAUt/USD is $${formatUsd(data.prices.xautUsd)} with 24h change ${formatSigned(data.prices.xautUsd24hChangePct)}%.`,
    `Relative 24h performance: BTC minus XAUt is ${formatSigned(data.relative.btcMinusXautChangePct)} percentage points; xpb live bias: ${data.relative.xpbBias}. ${data.relative.explanation}`,
    'Sources: Bitfinex public API and CoinGecko simple price API.',
  ].join('\n');
}

async function fetchJson(fetchImpl, url) {
  const response = await fetchImpl(url, { headers: { 'User-Agent': 'qvac-market-note-classifier/1.0' } });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }
  return response.json();
}

async function fetchBitfinexCandles(fetchImpl) {
  // Fetch up to 1000 1-hour candles (last ~42 days of data)
  const url = `${BITFINEX_CANDLES_URL}?limit=1000`;
  const response = await fetchImpl(url, { headers: { 'User-Agent': 'qvac-market-note-classifier/1.0' } });
  if (!response.ok) {
    throw new Error(`Failed to fetch Bitfinex candles: HTTP ${response.status}`);
  }
  const data = await response.json();

  // Bitfinex returns [timestamp, open, close, high, low, volume]
  if (!Array.isArray(data)) {
    throw new Error('Unexpected Bitfinex candles response');
  }

  return data
    .filter((candle) => Array.isArray(candle) && candle.length >= 6)
    .map((candle) => ({
      time: candle[0], // timestamp in ms
      open: candle[1],
      close: candle[2],
      high: candle[3],
      low: candle[4],
      volume: candle[5],
    }))
    .sort((a, b) => a.time - b.time); // Ensure chronological order
}

function settledToValue(settledPromise, defaultValue = null) {
  if (settledPromise.status === 'fulfilled') return settledPromise.value;
  return defaultValue;
}

function parseBitfinexTicker(ticker) {
  if (!Array.isArray(ticker) || ticker.length < 10) {
    throw new Error('Unexpected Bitfinex ticker response for tBTC:XAUT.');
  }

  const [bid, bidSize, ask, askSize, dailyChange, dailyChangeRelative, last, volume, high, low] = ticker;
  return {
    symbol: 'tBTC:XAUT',
    bid,
    bidSize,
    ask,
    askSize,
    dailyChange,
    dailyChangePct: round2(dailyChangeRelative * 100),
    xpb: last,
    volume,
    high,
    low,
    spreadPct: round4(((ask - bid) / last) * 100),
  };
}

function parseCoinGeckoPrice(price) {
  const btc = price?.bitcoin;
  const xaut = price?.['tether-gold'];
  if (!btc?.usd || !xaut?.usd) {
    throw new Error('Unexpected CoinGecko response for bitcoin/tether-gold.');
  }

  return {
    btcUsd: btc.usd,
    btcUsd24hChangePct: round2(btc.usd_24h_change ?? 0),
    xautUsd: xaut.usd,
    xautUsd24hChangePct: round2(xaut.usd_24h_change ?? 0),
  };
}

function deriveLiveXpbBias(relativePerformancePct) {
  if (relativePerformancePct > 0.25) return 'up';
  if (relativePerformancePct < -0.25) return 'down';
  return 'mixed';
}

function explainLiveBias(xpbBias, relativePerformancePct) {
  if (xpbBias === 'up') return `BTC is outperforming XAUt over 24h by ${formatNumber(relativePerformancePct, 2)} pp, so 1 BTC tends to buy more XAUt.`;
  if (xpbBias === 'down') return `XAUt is outperforming BTC over 24h by ${formatNumber(Math.abs(relativePerformancePct), 2)} pp, so 1 BTC tends to buy fewer XAUt.`;
  return 'BTC and XAUt are close on 24h relative performance, so the ratio signal is mixed.';
}

function formatUsd(value) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: value < 100 ? 2 : 0, maximumFractionDigits: value < 100 ? 2 : 2 }).format(value);
}

function formatSigned(value) {
  const rounded = formatNumber(value, 2);
  return value > 0 ? `+${rounded}` : rounded;
}

function formatNumber(value, digits) {
  return Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function round4(value) {
  return Math.round(value * 10000) / 10000;
}
