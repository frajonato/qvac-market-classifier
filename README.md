# QVAC Market Note Classifier

Local AI CLI that classifies macro, BTC, gold, and **XAUt/BTC** market notes using Tether's QVAC SDK.

The app runs inference on-device with QVAC. No cloud AI API is used, no AI API key is required, and analyzed text stays on the local machine after the first model download.

## What it does

You can analyze either:

- a custom market note/headline, or
- live market data fetched from public market APIs.

Live mode fetches:

- Bitfinex public API `tBTC:XAUT` for XAUt/BTC xpb, bid, ask, spread, 24h change, volume, and optional candles
- CoinGecko simple price API for BTC/USD, XAUt/USD, and 24h changes
- Optional technical context from Bitfinex 1h candles: RSI, SMA, ATR, support/resistance, Fibonacci, Bollinger Bands
- Optional macro context: DXY, yields, and calendar events
- Optional news sentiment context: deterministic keyword scoring by asset

The app returns structured JSON with:

- `category`
- `signal`
- `affectedAssets`
- `mechanism`
- `xautBtcRead`
- `confidence`
- `actionableSummary`
- `deterministicOverlay`

This is not financial advice. It is a local classification demo for market notes.

## QVAC SDK usage

- SDK package: `@qvac/sdk`
- SDK version used: `^0.19.1`
- QVAC calls used:
  - `loadModel`
  - `completion`
  - `unloadModel`
- Default model constant: `QWEN3_1_7B_INST_Q4`

The first run downloads the selected model. After it is cached, inference runs locally on the device.

## Requirements

- Node.js `>=22.17.0`
- npm
- Internet connection for the first model download and for live market-data fetches

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

Live mode fetches Bitfinex XAUt/BTC and CoinGecko BTC/XAUt USD data, builds a self-contained market note, and analyzes that note locally with QVAC plus deterministic ratio rules.

Optional enriched modes:

```bash
npm start -- --live --tech
npm start -- --live --macro
npm start -- --live --sentiment
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

```json
{
  "category": "btc",
  "signal": "risk-on",
  "affectedAssets": ["BTC", "XAUt/BTC"],
  "mechanism": "BTC is outperforming XAUt, so 1 BTC buys more XAUt and the XAUt/BTC xpb ratio rises.",
  "xautBtcRead": "xpb likely rises because BTC is outperforming XAUt over the measured period.",
  "confidence": 90,
  "actionableSummary": "The note is mainly a BTC-strength signal with direct relevance for XAUt/BTC.",
  "deterministicOverlay": {
    "macroSignal": "unknown",
    "goldMove": "unknown",
    "btcMove": "unknown",
    "xpbBias": "up",
    "notes": ["xpb=up"]
  }
}
```

Exact wording varies because the model runs locally.

## Test and syntax check

```bash
npm test
npm run check
```

Current test suite: 73 Node test-runner tests.

## Project structure

```text
src/
  cli.js                  CLI argument handling and formatting
  index.js                executable entrypoint
  liveData.js             Bitfinex XAUt/BTC + CoinGecko fetching + candle history
  macroData.js            Macro context
  technicalIndicators.js  RSI, SMA, ATR, Fib, S/R, Bollinger Bands
  sentimentAnalysis.js    Deterministic news sentiment by asset
  marketPrompt.js         Prompt construction and input cleanup
  marketRules.js          Deterministic ratio and macro signal rules
  qvacAnalysis.js         QVAC loadModel + completion integration

test/
  *.test.js               Node test-runner tests

examples/
  sample-notes.txt        Example market notes
```

## License

MIT
