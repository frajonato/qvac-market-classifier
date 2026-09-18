// Technical indicators for xpb/XAUt-BTC ratio
// Computes RSI, SMA, ATR, Fibonacci, support/resistance levels
// Designed to work with historical OHLC data (or candle snapshots)

export class XpbTechnicalAnalysis {
  constructor(ohlcData = []) {
    if (!Array.isArray(ohlcData)) {
      throw new Error('ohlcData must be an array of { time, open, high, low, close } candles');
    }
    this.candles = ohlcData;
  }

  // Add new candle(s) to the dataset
  addCandles(newCandles) {
    if (Array.isArray(newCandles)) {
      this.candles.push(...newCandles);
    }
  }

  // RSI(14) on close prices
  getRSI(period = 14) {
    const closes = this.candles.map((c) => c.close);
    if (closes.length < period + 1) {
      return null; // Not enough data
    }

    const changes = [];
    for (let i = 1; i < closes.length; i++) {
      changes.push(closes[i] - closes[i - 1]);
    }

    let gains = 0,
      losses = 0;
    for (let i = 0; i < period; i++) {
      if (changes[i] > 0) gains += changes[i];
      else losses += Math.abs(changes[i]);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period; i < changes.length; i++) {
      avgGain = (avgGain * (period - 1) + (changes[i] > 0 ? changes[i] : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (changes[i] < 0 ? Math.abs(changes[i]) : 0)) / period;
    }

    const rs = avgLoss === 0 ? 100 : (avgGain / avgLoss) * 100;
    const rsi = 100 - 100 / (1 + rs);

    return round2(rsi);
  }

  // Simple Moving Average
  getSMA(period) {
    const closes = this.candles.map((c) => c.close);
    if (closes.length < period) return null;

    const sum = closes.slice(-period).reduce((a, b) => a + b, 0);
    return round4(sum / period);
  }

  // Average True Range
  getATR(period = 14) {
    if (this.candles.length < period + 1) return null;

    const trueRanges = [];
    for (let i = 1; i < this.candles.length; i++) {
      const prev = this.candles[i - 1];
      const curr = this.candles[i];
      const tr = Math.max(curr.high - curr.low, Math.abs(curr.high - prev.close), Math.abs(curr.low - prev.close));
      trueRanges.push(tr);
    }

    let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < trueRanges.length; i++) {
      atr = (atr * (period - 1) + trueRanges[i]) / period;
    }

    return round4(atr);
  }

  // Support & Resistance (basic: recent highs/lows + pivot points)
  getSupportResistance() {
    if (this.candles.length < 20) {
      return { support: [], resistance: [], pivot: null };
    }

    const recent = this.candles.slice(-20);
    const highs = recent.map((c) => c.high);
    const lows = recent.map((c) => c.low);
    const closes = recent.map((c) => c.close);

    const maxHigh = Math.max(...highs);
    const minLow = Math.min(...lows);

    // Pivot Point = (H + L + C) / 3
    const pivot = (maxHigh + minLow + closes[closes.length - 1]) / 3;
    const r1 = 2 * pivot - minLow;
    const s1 = 2 * pivot - maxHigh;

    return {
      support: [round4(s1), round4(minLow)],
      resistance: [round4(r1), round4(maxHigh)],
      pivot: round4(pivot),
    };
  }

  // Fibonacci retracement (from recent swing low to high, or vice versa)
  getFibonacciLevels() {
    if (this.candles.length < 2) return null;

    const recent = this.candles.slice(-50); // Last 50 candles
    const highs = recent.map((c, i) => ({ price: c.high, idx: i }));
    const lows = recent.map((c, i) => ({ price: c.low, idx: i }));

    // Find most recent swing high and low
    const swingHigh = highs.reduce((max, curr) => (curr.price > max.price ? curr : max));
    const swingLow = lows.reduce((min, curr) => (curr.price < min.price ? curr : min));

    if (swingHigh.idx < swingLow.idx) {
      // Low came after high: uptrend, measure from low to high
      const range = swingHigh.price - swingLow.price;
      return {
        trend: 'up',
        low: round4(swingLow.price),
        high: round4(swingHigh.price),
        fib236: round4(swingLow.price + range * 0.236),
        fib382: round4(swingLow.price + range * 0.382),
        fib50: round4(swingLow.price + range * 0.5),
        fib618: round4(swingLow.price + range * 0.618),
        fib786: round4(swingLow.price + range * 0.786),
      };
    } else {
      // High came after low: downtrend, measure from high to low
      const range = swingHigh.price - swingLow.price;
      return {
        trend: 'down',
        high: round4(swingHigh.price),
        low: round4(swingLow.price),
        fib236: round4(swingHigh.price - range * 0.236),
        fib382: round4(swingHigh.price - range * 0.382),
        fib50: round4(swingHigh.price - range * 0.5),
        fib618: round4(swingHigh.price - range * 0.618),
        fib786: round4(swingHigh.price - range * 0.786),
      };
    }
  }

  // Bollinger Bands (20, 2 std deviations)
  getBollingerBands(period = 20, stdDev = 2) {
    const closes = this.candles.map((c) => c.close);
    if (closes.length < period) return null;

    const recentCloses = closes.slice(-period);
    const sma = recentCloses.reduce((a, b) => a + b, 0) / period;
    const variance = recentCloses.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const sigma = Math.sqrt(variance);

    return {
      middle: round4(sma),
      upper: round4(sma + stdDev * sigma),
      lower: round4(sma - stdDev * sigma),
      bandwidth: round4((2 * stdDev * sigma) / sma),
    };
  }

  // Full report
  getFullReport() {
    const latest = this.candles[this.candles.length - 1];
    return {
      timestamp: new Date().toISOString(),
      lastPrice: latest ? latest.close : null,
      rsi: this.getRSI(14),
      sma20: this.getSMA(20),
      sma50: this.getSMA(50),
      sma200: this.getSMA(200),
      atr: this.getATR(14),
      supportResistance: this.getSupportResistance(),
      fibonacci: this.getFibonacciLevels(),
      bollingerBands: this.getBollingerBands(20, 2),
    };
  }

  // Interpretation helper
  interpretSignals() {
    const rsi = this.getRSI(14);
    const sma20 = this.getSMA(20);
    const sma50 = this.getSMA(50);
    const latest = this.candles[this.candles.length - 1]?.close;

    const signals = [];

    // RSI interpretation
    if (rsi !== null) {
      if (rsi > 70) signals.push('RSI >70: overbought, potential pullback');
      else if (rsi > 65) signals.push('RSI 65-70: approaching overbought');
      else if (rsi < 30) signals.push('RSI <30: oversold, potential bounce');
      else if (rsi < 35) signals.push('RSI 30-35: approaching oversold');
      else if (rsi > 50) signals.push('RSI >50: bullish momentum');
      else if (rsi < 50) signals.push('RSI <50: bearish momentum');
    }

    // SMA trend
    if (latest !== null && sma20 !== null && sma50 !== null) {
      if (sma20 > sma50) signals.push('SMA20 > SMA50: short-term uptrend');
      else if (sma20 < sma50) signals.push('SMA20 < SMA50: short-term downtrend');
      else signals.push('SMA20 ≈ SMA50: neutral crossover zone');

      if (latest > sma20) signals.push('Price > SMA20: above short-term average');
      else if (latest < sma20) signals.push('Price < SMA20: below short-term average');
    }

    return signals;
  }
}

// Convenience factory
export function createXpbAnalysis(ohlcData) {
  return new XpbTechnicalAnalysis(ohlcData);
}

// Build a text summary of technical levels with explicit action signals
export function buildTechnicalSummary(analysis) {
  if (!analysis) return 'Technical data unavailable.';

  const report = analysis.getFullReport();
  const lines = ['Technical levels (xpb):'];

  if (report.lastPrice) {
    lines.push(`  Last: ${formatNumber(report.lastPrice, 4)}`);
  }

  // RSI with explicit action
  if (report.rsi !== null) {
    const rsiStatus = report.rsi > 70 ? 'OVERBOUGHT (pullback risk)' : report.rsi < 30 ? 'OVERSOLD (bounce risk)' : 'neutral';
    const rsiAction = report.rsi > 70 ? '→ consider selling into strength' : report.rsi < 30 ? '→ consider buying dips' : '→ no extreme signal';
    lines.push(`  RSI(14): ${formatNumber(report.rsi, 2)} (${rsiStatus}) ${rsiAction}`);
  }

  // SMA trend analysis
  if (report.sma20 !== null && report.sma50 !== null) {
    const trend = report.sma20 > report.sma50 ? 'UPTREND (SMA20 > SMA50)' : report.sma20 < report.sma50 ? 'DOWNTREND (SMA20 < SMA50)' : 'neutral';
    const trendAction = report.sma20 > report.sma50 ? '→ bullish bias' : report.sma20 < report.sma50 ? '→ bearish bias' : '→ no trend';
    lines.push(`  Trend: ${trend} ${trendAction}`);
    lines.push(`    SMA20: ${formatNumber(report.sma20, 4)} | SMA50: ${formatNumber(report.sma50, 4)}`);
  }

  // Price vs SMA
  if (report.lastPrice && report.sma20) {
    const priceVsSMA = report.lastPrice > report.sma20 ? 'ABOVE SMA20 (bullish)' : report.lastPrice < report.sma20 ? 'BELOW SMA20 (bearish)' : 'AT SMA20';
    lines.push(`  Price: ${priceVsSMA}`);
  }

  if (report.atr !== null) {
    lines.push(`  ATR(14): ${formatNumber(report.atr, 4)} (volatility/grid-width measure)`);
  }

  // Support & Resistance as zones
  if (report.supportResistance?.pivot) {
    lines.push(`  Pivot: ${formatNumber(report.supportResistance.pivot, 4)}`);
    if (report.supportResistance.support.length > 0) {
      const supportZones = report.supportResistance.support.map(s => `${formatNumber(s, 4)} (BUY zone)`).join(', ');
      lines.push(`  Support: ${supportZones}`);
    }
    if (report.supportResistance.resistance.length > 0) {
      const resistanceZones = report.supportResistance.resistance.map(r => `${formatNumber(r, 4)} (SELL zone)`).join(', ');
      lines.push(`  Resistance: ${resistanceZones}`);
    }
  }

  // Bollinger Bands
  if (report.bollingerBands) {
    const bbStatus = report.lastPrice > report.bollingerBands.upper ? 'ABOVE upper (extreme)' : report.lastPrice < report.bollingerBands.lower ? 'BELOW lower (extreme)' : 'within bands';
    lines.push(`  Bollinger Bands(20,2): ${formatNumber(report.bollingerBands.lower, 4)} - ${formatNumber(report.bollingerBands.upper, 4)} (${bbStatus})`);
  }

  // Fibonacci levels
  if (report.fibonacci) {
    lines.push(`  Fibonacci levels (trend: ${report.fibonacci.trend}):`);
    if (report.fibonacci.trend === 'up') {
      lines.push(`    23.6%: ${formatNumber(report.fibonacci.fib236, 4)} | 38.2%: ${formatNumber(report.fibonacci.fib382, 4)} | 50%: ${formatNumber(report.fibonacci.fib50, 4)} | 61.8%: ${formatNumber(report.fibonacci.fib618, 4)} | 78.6%: ${formatNumber(report.fibonacci.fib786, 4)}`);
    } else {
      lines.push(`    High: ${formatNumber(report.fibonacci.high, 4)} | Golden Pocket: 50-61.8% retracement = ${formatNumber(report.fibonacci.fib50, 4)}-${formatNumber(report.fibonacci.fib618, 4)}`);
    }
  }

  // Actionable summary
  const signals = analysis.interpretSignals();
  if (signals.length > 0) {
    lines.push(`\n  Action signals:`);
    signals.forEach(sig => lines.push(`    • ${sig}`));
  }

  return lines.join('\n');
}

// Helpers
function round2(value) {
  return Math.round(value * 100) / 100;
}

function round4(value) {
  return Math.round(value * 10000) / 10000;
}

function formatNumber(value, digits) {
  return Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}
