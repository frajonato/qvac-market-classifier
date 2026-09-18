# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-18

### Added

#### Core Features
- **QVAC SDK Integration:** Local AI inference using Qwen 3.1 7B model
- **Live Market Mode:** Automatic fetching of market data and real-time analysis
- **Market Note Classification:** Classify market headlines/notes with AI
- **Four Analysis Layers:**
  - Live data (Bitfinex XAUt/BTC, CoinGecko prices)
  - Macro context (DXY, yields, economic calendar)
  - Technical indicators (RSI, SMA, ATR, Fibonacci, S/R, Bollinger Bands)
  - Sentiment analysis (deterministic keyword scoring, 40+ keywords)

#### Technical Capabilities
- RSI(14), SMA(20/50/200), ATR(14) momentum and trend analysis
- Fibonacci retracement levels (6 levels: 23.6%, 38.2%, 50%, 61.8%, 78.6%)
- Support & Resistance (pivot-based, recent highs/lows)
- Bollinger Bands(20, 2) for volatility measurement
- Deterministic sentiment scoring (no ML dependencies, offline-capable)
- NewsAPI integration with mock fallback
- Economic calendar event fetching and impact scoring

#### User Interface & Access
- CLI with modular flags: `--live`, `--macro`, `--tech`, `--sentiment`
- Custom market note analysis via positional arguments
- JSON structured output for classification, confidence, mechanism, and actionable summary
- Graceful API fallback (no crashes on network failure)

#### Testing & Quality
- 76 comprehensive tests (100% function coverage)
- 100% syntax validation (`npm run check`)
- Production-grade error handling
- Complete inline documentation

#### Documentation
- README.md with installation, usage, and examples
- IMPLEMENTATION.md with technical architecture and module breakdown
- RSI_ANALYSIS.md with market data verification
- CONTRIBUTING.md with contribution guidelines
- CHANGELOG.md (this file)
- MIT License

### Technical Details
- **Language:** JavaScript (Node.js)
- **Runtime:** Node.js 22.17.0 or higher
- **SDK:** @qvac/sdk 0.19.1
- **Model:** Qwen 3.1 7B Instruct Q4 (7 billion parameters, quantized)
- **Dependencies:** Single external dependency (QVAC SDK)
- **Data Sources:** Bitfinex (public API), CoinGecko (public API), FRED (public API)
- **Inference:** 100% on-device (no cloud AI calls)

### Testing
- 76 tests across 8 test suites
- Unit tests for all core modules
- Integration tests for data pipelines
- Technical indicator accuracy verified with real market data
- Sentiment scoring validated with news examples

### Known Limitations
- Single timeframe: 1-hour candles (future: 4h, daily, weekly)
- Sentiment: Deterministic keyword-based (by design for offline capability)
- Macro data fallback: Uses mock when FRED unavailable (documented)
- Grid integration: Not yet order-aware (recommended future feature)

### Future Enhancements (Planned)
- Multi-timeframe technical analysis (4h, daily, weekly candles)
- Order-aware grid calculations (integration with trading orders)
- Hermes platform integration (inline chat queries)
- Real-time NewsAPI support (when API key configured)
- Webhook alerts (Slack, Telegram on signal triggers)
- Backtesting engine (historical validation of signals)

### Fixed Issues
- Removed false promise of silver support from documentation
- Corrected market note construction for accurate QVAC classification
- Added comprehensive error handling for all API calls

### Security & Privacy
- No cloud inference: 100% local processing
- No API keys required (uses public endpoints only)
- No data persistence: Analysis happens in-memory only
- No external logging or telemetry

## Pre-Release Notes

This is the initial release (v1.0.0) of the QVAC Market Note Classifier. All major features are production-ready and tested.

## Getting Started

See [README.md](README.md) for installation and usage instructions.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute.
