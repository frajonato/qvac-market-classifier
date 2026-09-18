# QVAC Market Classifier — Track B + C Implementation Summary

**Commit:** c348faf — "feat: add macro data + technical indicators modules (B + C)"

---

## What Was Built

### Module B: Macro Data (`src/macroData.js`)
Fetches and contextualizes macro signals relevant to XAUt/BTC ratio:

- **DXY** (Dollar Index) — via FRED API or TradingEconomics
- **US 10Y Yield** — via FRED API
- **Real Yields** — via FRED real fed funds rate
- **Economic Calendar** — upcoming CPI, NFP, Fed decisions (3-5 events, impact classification)

**Output:** Markdown text summary appended to live market note when `--macro` flag is used.

```
Macro context:
  DXY: 104.50 (+0.30% 24h)
  US 10Y yield: 4.251% (+0.15% 24h)
  Real yields (est.): 2.15%
  Next events: US CPI (1d, impact: high); US NFP (2d, impact: high)
```

### Module C: Technical Indicators (`src/technicalIndicators.js`)
Computes technical levels from 1-hour candle history (up to 1000 candles, ~42 days):

- **RSI(14)** — momentum + overbought/oversold detection
- **SMA** — 20, 50, 200-period moving averages (trend identification)
- **ATR(14)** — volatility measure for grid width
- **Support & Resistance** — pivot points, recent highs/lows
- **Fibonacci Retracement** — golden pocket levels (23.6%, 38.2%, 50%, 61.8%, 78.6%)
- **Bollinger Bands(20,2)** — upper/lower bands + bandwidth
- **Interpretation** — auto-generate signals (e.g., "RSI >70: overbought, potential pullback")

**Output:** Text summary with all levels + interpreted signals.

```
Technical levels (xpb):
  Last: 17.669
  RSI(14): 99.01 (overbought)
  SMA20: 17.6842
  SMA50: 17.7306
  ATR(14): 0.0826
  Pivot: 17.6687
  Support: 17.4583, 17.458
  Resistance: 17.8793, 17.879
  BB20(2): 17.5073 - 17.8611

Interpreted signals:
  - RSI >70: overbought, potential pullback
  - SMA20 < SMA50: short-term downtrend
  - Price < SMA20: below short-term average
```

### Module D: Sentiment Analysis (`src/sentimentAnalysis.js`) — NEW
Deterministic sentiment scoring for news and market signals (no ML dependencies):

- **Keyword-based scoring** — 40+ positive/negative keywords with per-match counting
- **Asset segmentation** — BTC, Gold, USD classification by headline keywords
- **Sentiment labels** — bullish, bearish, neutral with numeric score (-1 to +1)
- **Confidence calculation** — based on keyword density and sentiment strength
- **News fetching** — NewsAPI integration (graceful fallback to mock data)
- **Mock data** — 10 news items covering all assets when API unavailable

**Output:** Text summary of sentiment by asset.

```
Sentiment & news context:
  BTC: bullish (score 0.6, n=5 items)
  Gold: neutral (score 0, n=3 items)
  USD: bearish (score -0.4, n=4 items)
```

---

## Updated Core Modules

### `src/liveData.js` (extended)
- Now fetches **1-hour candles** from Bitfinex (`/candles/trade:1h:tBTC:XAUT/hist`)
- Returns up to 1000 candles (chronologically ordered)
- Added `settledToValue()` helper for graceful Promise.allSettled handling
- Candles optional via `includeCandles=true` flag (default: true)

### `src/index.js` (extended)
- New flags: `--macro` and `--tech` / `--technical`
- Conditional module loading (only fetches macro/tech if flags present)
- Builds enriched market note by concatenating live + macro + tech sections
- QVAC analysis runs on the full enriched note

### `src/marketRules.js` (extended)
- New export: `detectTechnicalContext(marketNote)` — extracts RSI/resistance/support from text
- Returns: `{ overbought, oversold, nearResistance, nearSupport, technicalBias }`
- Used for deterministic overlay when technical summary is included in the note

### `src/cli.js` (updated)
- Argument filtering now excludes `--macro`, `--tech`, `--technical`
- Updated help text with new flags and examples

---

## Usage Examples

### Live mode, all enhancements:
```bash
npm start -- --live --macro --tech --sentiment
```

**Flow:**
1. Fetch Bitfinex xpb + CoinGecko prices + 1000 1h candles
2. Fetch macro data (DXY, yields, calendar)
3. Compute technical indicators (RSI, SMA, ATR, Fib, S/R, BB)
4. Fetch news and analyze sentiment (BTC, Gold, USD)
5. Build integrated market note (live + macro + tech + sentiment sections)
6. Analyze with QVAC local model + deterministic rules
7. Return JSON classification with all context

### Individual flags:
```bash
npm start -- --live --tech          # price + technical only
npm start -- --live --macro         # price + macro only
npm start -- --live --sentiment     # price + sentiment only
```

### Baseline (price data only, no enrichment):
```bash
npm start -- --live
```

---

## Test Coverage

**74 tests total, all passing:**

- **cli.test.js** (6 tests) — argument parsing, live mode detection, formatting
- **liveData.test.js** (2 tests) — Bitfinex fetch, CoinGecko prices, note building
- **marketPrompt.test.js** (2 tests) — prompt construction, validation
- **marketRules.test.js** (10 tests) — macro/BTC/gold signals, XAUt/BTC bias, technical context detection
- **qvacAnalysis.test.js** (4 tests) — QVAC model parsing, output handling
- **macroData.test.js** (9 tests) — macro data fetching, note building, error handling
- **technicalIndicators.test.js** (18 tests) — RSI, SMA, ATR, Fib, S/R, BB, full report, interpretation
- **sentimentAnalysis.test.js** (23 tests) — sentiment scoring, asset segmentation, news fetch, integration

**Syntax check:** `npm run check` ✓

---

## File Manifest

**New files:**
- `src/macroData.js` (266 lines) — macro data fetching + formatting
- `src/technicalIndicators.js` (287 lines) — technical analysis class + helpers
- `src/sentimentAnalysis.js` (303 lines) — news sentiment scoring + aggregation
- `test/macroData.test.js` (158 lines) — 9 macro tests
- `test/technicalIndicators.test.js` (211 lines) — 18 technical tests
- `test/sentimentAnalysis.test.js` (189 lines) — 23 sentiment tests
- `test-data.js` (72 lines) — standalone data module test script
- `test-sentiment.js` (119 lines) — standalone sentiment demo
- `test-full-integration.js` (179 lines) — full B+C+D integration demo

**Modified files:**
- `src/liveData.js` — added Bitfinex candles, settled promise handling
- `src/index.js` — integrated macro/tech flags and module loading
- `src/cli.js` — updated arg filtering, help text
- `src/marketRules.js` — added `detectTechnicalContext()` export
- `test/liveData.test.js` — updated expectations (now 3 API calls, not 2)
- `test/marketRules.test.js` — added 6 tests for technical context detection
- `README.md` — documented new features and usage

---

## Architecture Layers (Track B + C + D)

```
Input Flow:
┌─────────────────────────────────────────────────────────────┐
│ User: npm start -- --live --macro --tech --sentiment        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Fetch Layer (liveData.js + macroData.js + sentimentAnalysis)│
│  ├─ Bitfinex xpb price + spread + 24h change               │
│  ├─ CoinGecko BTC/USD + XAUt/USD prices                    │
│  ├─ Bitfinex 1h candles (1000 max)                         │
│  ├─ DXY, yields, real yields (FRED/TE)                     │
│  ├─ Macro calendar (CPI, NFP, Fed dates)                   │
│  └─ News articles + asset classification                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Analysis Layer (technicalIndicators.js + sentimentAnalysis) │
│  ├─ RSI(14) → overbought/oversold reading                  │
│  ├─ SMA(20/50/200) → trend & momentum                      │
│  ├─ ATR(14) → volatility (grid width)                      │
│  ├─ Support/Resistance → pivot points                      │
│  ├─ Fibonacci → golden pocket retracement                  │
│  ├─ Bollinger Bands → volatility envelope                  │
│  ├─ Sentiment scoring → bullish/bearish/neutral per asset  │
│  └─ interpretSignals() → actionable text                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Note Construction (index.js + buildTechnicalSummary)        │
│  Live note + Macro note + Technical summary + Sentiment    │
│  = Single integrated market context                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ QVAC Classification (qvacAnalysis.js)                       │
│  + Deterministic Overlay (marketRules.js)                   │
│  → JSON: category, signal, mechanism, xautBtcRead, etc.     │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. Graceful Degradation
- Macro fetch failures don't block analysis (returns `{ status: 'error' }`)
- Candle fetch failures logged; analysis continues with available data
- FRED/TradingEconomics endpoints optional; demo keys trigger fallback

### 2. Deterministic + ML Hybrid
- Technical module computes *all* levels (no LLM needed)
- `detectTechnicalContext()` extracts text patterns for deterministic overlay
- QVAC still analyzes the rich note context (why levels matter)

### 3. Candle History via Bitfinex Public API
- 1-hour resolution optimizes for intraday gridding + technical signals
- 1000-candle limit = ~42 days of history
- No authentication required (public endpoint)

### 4. Modular Flag Architecture
- Each flag is independent (`--macro`, `--tech`, or both)
- Default behavior unchanged (backward compatible)
- Extensible for future flags (e.g., `--orderbook`, `--sentiment`)

---

## Next Steps (Recommended)

### A. Order-aware Grid (depends on Track A manual input)
```bash
npm start -- --live --orders "sell:18.20,buy:16.90"
```
Would calculate:
- Distance to each order (%)
- Nearest order + urgency
- Grid status vs xpb bias

### B. Multi-timeframe Technical
```bash
npm start -- --live --tech --tf 4h
```
Current: 1h candles only
Future: support 4h, daily, weekly via Bitfinex `/candles/...` adjustable interval

### C. Hermes Integration
Expose macro + tech + sentiment modules as Hermes providers for inline data fetch in chat:
```
User: What's the latest technical read on xpb?
Hermes: [calls technicalIndicators module] → RSI 99.01, overbought...
```

### D. Real NewsAPI Integration
```bash
NEWSAPI_KEY=xxx npm start -- --live --sentiment
```
When API key is set, fetch real news instead of mock data

### E. Webhook for Slack/Telegram
When xpb crosses certain levels or sentiment flips, send alert:
```
🔔 XPB broke above 18.00 | Technical: RSI overbought | Sentiment: BTC bullish, USD bearish
```

---

## Test Run Output (Reference)

```
$ node test-data.js
QVAC Market Classifier - Data Modules Test

=== Testing Live Data ===

Live market data fetched successfully:
  Timestamp: 2026-09-18T07:59:20.733Z
  XPB: 17.669
  Candles: 1000 1h candles loaded

Live Note:
Live market snapshot at 2026-09-18T07:59:20.733Z.
Bitfinex tBTC:XAUT xpb is 17.669 XAUt per 1 BTC; bid 17.693, ask 17.724, spread 0.175%, 24h change -0.19%, volume 0.120962 BTC-equivalent on the pair.
BTC/USD is $77,692 with 24h change +1.74%.
XAUt/USD is $4,387.59 with 24h change +1.52%.
Relative 24h performance: BTC minus XAUt is +0.22 percentage points; xpb live bias: mixed. BTC and XAUt are close on 24h relative performance, so the ratio signal is mixed.
Sources: Bitfinex public API and CoinGecko simple price API.

=== Testing Macro Data ===

Macro data fetched:
  Timestamp: 2026-09-18T07:59:21.594Z
  DXY status: fetch_error
  Yields status: fetch_error
  Calendar events: 0

Macro Note:
Macro context:

=== Testing Technical Analysis ===

Technical analysis computed:
  Last Price: 17.669
  RSI(14): 99.01
  SMA20: 17.6842
  SMA50: 17.7306
  ATR(14): 0.0826

Technical Summary:
Technical levels (xpb):
  Last: 17.669
  RSI(14): 99.01 (overbought)
  SMA20: 17.6842
  SMA50: 17.7306
  ATR(14): 0.0826
  Pivot: 17.6687
  Support: 17.4583, 17.458
  Resistance: 17.8793, 17.879
  BB20(2): 17.5073 - 17.8611

Interpreted signals:
  - RSI >70: overbought, potential pullback
  - SMA20 < SMA50: short-term downtrend
  - Price < SMA20: below short-term average

All tests completed.
```

---

## License

MIT
