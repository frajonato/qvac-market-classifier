import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLiveMarketNote, fetchLiveMarketData } from '../src/liveData.js';

const BITFINEX_TICKER = [17.699, 5.56, 17.73, 4.69, 0.12, 0.0068, 17.669, 0.122, 17.836, 17.504, 1633088731179];
const COINGECKO_PRICE = {
  bitcoin: { usd: 77725, usd_24h_change: 1.68 },
  'tether-gold': { usd: 4388.78, usd_24h_change: 1.42 },
};

test('fetchLiveMarketData reads Bitfinex xpb and CoinGecko BTC/XAUt prices', async () => {
  const calls = [];
  const fakeFetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes('bitfinex') && String(url).includes('ticker')) return jsonResponse(BITFINEX_TICKER);
    if (String(url).includes('bitfinex') && String(url).includes('candles')) return jsonResponse([]);
    if (String(url).includes('coingecko')) return jsonResponse(COINGECKO_PRICE);
    throw new Error(`unexpected URL ${url}`);
  };

  const data = await fetchLiveMarketData({ fetchImpl: fakeFetch, now: () => new Date('2026-09-18T07:30:00Z') });

  assert.equal(data.bitfinex.symbol, 'tBTC:XAUT');
  assert.equal(data.bitfinex.xpb, 17.669);
  assert.equal(data.prices.btcUsd, 77725);
  assert.equal(data.prices.xautUsd, 4388.78);
  assert.equal(data.relative.btcMinusXautChangePct, 0.26);
  assert.equal(data.relative.xpbBias, 'up');
  assert.equal(calls.length, 3); // ticker, coingecko, candles
});

test('buildLiveMarketNote writes a self-contained market note with sources and xpb bias', () => {
  const note = buildLiveMarketNote({
    timestamp: '2026-09-18T07:30:00.000Z',
    bitfinex: { symbol: 'tBTC:XAUT', xpb: 17.669, bid: 17.699, ask: 17.73, spreadPct: 0.18, volume: 0.122, dailyChangePct: 0.68 },
    prices: { btcUsd: 77725, btcUsd24hChangePct: 1.68, xautUsd: 4388.78, xautUsd24hChangePct: 1.42 },
    relative: { btcMinusXautChangePct: 0.26, xpbBias: 'up', explanation: 'BTC is outperforming XAUt over 24h.' },
  });

  assert.match(note, /Live market snapshot/);
  assert.match(note, /Bitfinex tBTC:XAUT xpb is 17\.669/);
  assert.match(note, /BTC\/USD is \$77,725/);
  assert.match(note, /XAUt\/USD is \$4,388\.78/);
  assert.match(note, /xpb live bias: up/i);
  assert.match(note, /Sources: Bitfinex public API and CoinGecko simple price API/);
});

function jsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    async json() {
      return payload;
    },
  };
}
