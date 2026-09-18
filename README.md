# QVAC Market Note Classifier

A small local AI app that classifies short market notes for macro, BTC, gold, and **XAUt/BTC** relevance.

It uses Tether's QVAC SDK to run inference on-device. No cloud AI API is called, no API key is needed, and the text you analyze stays on your machine after the first model download.

## What it does

Paste a headline or short market note, or run live mode to fetch current BTC/XAUt data automatically.

Live mode currently fetches:

- Bitfinex public API `tBTC:XAUT` for live XAUt/BTC xpb, bid, ask, spread, 24h change, and volume
- CoinGecko simple price API for BTC/USD, XAUt/USD, and 24h changes
- Historical 1-hour candles from Bitfinex (up to ~42 days) for technical analysis (RSI, SMA, ATR, Fib, S/R, Bollinger Bands)
- **NEW:** Macro data (DXY, yields, real yields, upcoming economic calendar events)
- **NEW:** News sentiment analysis (deterministic scoring by asset: BTC, Gold, USD)

The app returns a structured classification:

- category: macro, BTC, gold, XAUt/BTC, mixed, or noise
- signal: hawkish, dovish, risk-on, risk-off, neutral, or unclear
- affected assets
- macro mechanism: data -> Fed expectations -> USD/yields -> opportunity cost/liquidity -> asset impact
- XAUt/BTC read, using xpb as XAUt per 1 BTC
- deterministic overlay: keyword/rule-based macro and XAUt/BTC sanity check
- actionable summary

This is not financial advice. It is a local classification demo for market notes.

## QVAC SDK usage

- SDK package: `@qvac/sdk`
- SDK version used: `^0.19.1`
- Required QVAC calls used by this app:
  - `loadModel`
  - `completion`
  - `unloadModel`
- Default model constant: `QWEN3_1_7B_INST_Q4`
- Qwen thinking is disabled with `modelConfig: { reasoning_budget: 0 }` for concise JSON output

The first run downloads the selected model. After the model is cached, inference runs locally on the device.

## Requirements

- Node.js `>=22.17.0`
- npm
- Internet connection for the first model download only

Tested locally with:

- Node.js `v26.8.1`
- npm `11.19.0`
- `@qvac/sdk` `0.19.1`

## Install

```bash
npm install
```

## Run live mode

```bash
npm start -- --live
```

Live mode fetches Bitfinex XAUt/BTC and CoinGecko BTC/XAUt USD data, builds a self-contained market note, and then analyzes that note locally with QVAC plus deterministic ratio rules.

### Optional flags for enriched analysis

Add `--macro` to include macro context (DXY, yields, economic calendar):

```bash
npm start -- --live --macro
```

Add `--tech` or `--technical` to include technical levels (RSI, SMA, ATR, support/resistance, Fibonacci):

```bash
npm start -- --live --tech
```

Add `--sentiment` to include news sentiment analysis (BTC, gold, USD):

```bash
npm start -- --live --sentiment
```

Combine multiple flags:

```bash
npm start -- --live --macro --tech --sentiment
```

## Run with your own note

```bash
npm start -- --note "US CPI came in hotter than expected while Treasury yields and DXY rose; gold slipped but BTC held flat."
```

You can also pass the note as positional text:

```bash
npm start -- "Weak US payrolls missed expectations, markets priced more Fed cuts, the dollar sold off, gold rallied, and BTC moved only slightly higher."
```

## Example output

The model returns JSON similar to:

```json
{
  "category": "macro",
  "signal": "hawkish",
  "affectedAssets": ["BTC", "Gold", "XAUt/BTC"],
  "mechanism": "Hot CPI increases expectations of restrictive Fed policy, lifting USD and yields, which raises the opportunity cost of holding gold while pressuring liquidity-sensitive assets.",
  "xautBtcRead": "Mixed to higher xpb if gold underperforms BTC after the hawkish shock.",
  "confidence": 72,
  "actionableSummary": "The note is mainly a hawkish macro signal with direct relevance for metals and the BTC-vs-gold ratio."
}
```

Exact wording varies because the LLM runs locally.

## Test and syntax check

```bash
npm test
npm run check
```

## Project structure

```text
src/
  cli.js                  CLI argument handling and formatting
  index.js                executable entrypoint
  liveData.js             Bitfinex XAUt/BTC + CoinGecko price fetching + candle history
  macroData.js            Macro context: DXY, yields, economic calendar
  technicalIndicators.js  Technical analysis: RSI, SMA, ATR, Fib, S/R, Bollinger Bands
  sentimentAnalysis.js    News sentiment: deterministic analysis by asset
  marketPrompt.js         Prompt construction and input cleanup
  marketRules.js          Deterministic ratio and macro signal rules
  qvacAnalysis.js         QVAC loadModel + completion integration
test/
  *.test.js               Node test runner tests (74 tests)
examples/
  sample-notes.txt        example market notes
```

## License

MIT
