import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createXpbAnalysis, buildTechnicalSummary } from '../src/technicalIndicators.js';

test('XpbTechnicalAnalysis: constructor with OHLC data', () => {
  const candles = [
    { time: 1, open: 17.5, high: 17.6, low: 17.4, close: 17.55, volume: 100 },
    { time: 2, open: 17.55, high: 17.7, low: 17.5, close: 17.65, volume: 120 },
    { time: 3, open: 17.65, high: 17.8, low: 17.6, close: 17.75, volume: 110 },
  ];

  const analysis = createXpbAnalysis(candles);
  assert.ok(analysis);
  assert.equal(analysis.candles.length, 3);
});

test('XpbTechnicalAnalysis: constructor with empty data', () => {
  const analysis = createXpbAnalysis([]);
  assert.ok(analysis);
  assert.equal(analysis.candles.length, 0);
});

test('XpbTechnicalAnalysis: addCandles', () => {
  const analysis = createXpbAnalysis([]);
  analysis.addCandles([
    { time: 1, open: 17.5, high: 17.6, low: 17.4, close: 17.55, volume: 100 },
    { time: 2, open: 17.55, high: 17.7, low: 17.5, close: 17.65, volume: 120 },
  ]);

  assert.equal(analysis.candles.length, 2);
});

test('XpbTechnicalAnalysis: getSMA with sufficient data', () => {
  const candles = Array.from({ length: 50 }, (_, i) => ({
    time: i,
    open: 17.5 + i * 0.01,
    high: 17.6 + i * 0.01,
    low: 17.4 + i * 0.01,
    close: 17.55 + i * 0.01,
    volume: 100 + i,
  }));

  const analysis = createXpbAnalysis(candles);
  const sma20 = analysis.getSMA(20);
  assert.ok(sma20 !== null);
  assert.ok(typeof sma20 === 'number');
  assert.ok(sma20 > 17.5);
});

test('XpbTechnicalAnalysis: getSMA with insufficient data', () => {
  const analysis = createXpbAnalysis([
    { time: 1, open: 17.5, high: 17.6, low: 17.4, close: 17.55, volume: 100 },
  ]);

  const sma20 = analysis.getSMA(20);
  assert.equal(sma20, null);
});

test('XpbTechnicalAnalysis: getRSI with sufficient data', () => {
  const candles = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    open: 17.5 + Math.sin(i * 0.2) * 0.1,
    high: 17.6 + Math.sin(i * 0.2) * 0.1,
    low: 17.4 + Math.sin(i * 0.2) * 0.1,
    close: 17.55 + Math.sin(i * 0.2) * 0.1,
    volume: 100,
  }));

  const analysis = createXpbAnalysis(candles);
  const rsi = analysis.getRSI(14);
  assert.ok(rsi !== null);
  assert.ok(typeof rsi === 'number');
  assert.ok(rsi >= 0 && rsi <= 100);
});

test('XpbTechnicalAnalysis: getRSI with insufficient data', () => {
  const analysis = createXpbAnalysis([
    { time: 1, open: 17.5, high: 17.6, low: 17.4, close: 17.55, volume: 100 },
  ]);

  const rsi = analysis.getRSI(14);
  assert.equal(rsi, null);
});

test('XpbTechnicalAnalysis: getATR with sufficient data', () => {
  const candles = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    open: 17.5 + (i * 0.01) % 0.5,
    high: 17.7 + (i * 0.02) % 0.5,
    low: 17.3 - (i * 0.01) % 0.5,
    close: 17.55 + (i * 0.01) % 0.5,
    volume: 100,
  }));

  const analysis = createXpbAnalysis(candles);
  const atr = analysis.getATR(14);
  assert.ok(atr !== null);
  assert.ok(typeof atr === 'number');
  assert.ok(atr > 0);
});

test('XpbTechnicalAnalysis: getSupportResistance', () => {
  const candles = Array.from({ length: 25 }, (_, i) => ({
    time: i,
    open: 17.5,
    high: 17.5 + (i > 12 ? 0.2 : 0),
    low: 17.5 - (i > 12 ? 0.2 : 0),
    close: 17.55,
    volume: 100,
  }));

  const analysis = createXpbAnalysis(candles);
  const sr = analysis.getSupportResistance();
  assert.ok(sr);
  assert.ok(Array.isArray(sr.support));
  assert.ok(Array.isArray(sr.resistance));
  assert.ok(typeof sr.pivot === 'number');
});

test('XpbTechnicalAnalysis: getFibonacciLevels with uptrend', () => {
  const candles = Array.from({ length: 50 }, (_, i) => ({
    time: i,
    open: 17.0 + i * 0.01,
    high: 17.1 + i * 0.01,
    low: 16.9 + i * 0.01,
    close: 17.05 + i * 0.01,
    volume: 100,
  }));

  const analysis = createXpbAnalysis(candles);
  const fib = analysis.getFibonacciLevels();
  assert.ok(fib);
  assert.ok(['up', 'down'].includes(fib.trend));
  assert.ok(typeof fib.fib236 === 'number');
  assert.ok(typeof fib.fib618 === 'number');
});

test('XpbTechnicalAnalysis: getFullReport', () => {
  const candles = Array.from({ length: 50 }, (_, i) => ({
    time: i,
    open: 17.5 + i * 0.01,
    high: 17.6 + i * 0.01,
    low: 17.4 + i * 0.01,
    close: 17.55 + i * 0.01,
    volume: 100,
  }));

  const analysis = createXpbAnalysis(candles);
  const report = analysis.getFullReport();
  assert.ok(report);
  assert.ok(report.timestamp);
  assert.ok(typeof report.lastPrice === 'number');
  assert.ok(report.sma20 !== null);
  assert.ok(report.supportResistance);
  assert.ok(report.bollingerBands);
});

test('XpbTechnicalAnalysis: interpretSignals', () => {
  const candles = Array.from({ length: 50 }, (_, i) => ({
    time: i,
    open: 17.5 + Math.sin(i * 0.1) * 0.05,
    high: 17.6 + Math.sin(i * 0.1) * 0.05,
    low: 17.4 + Math.sin(i * 0.1) * 0.05,
    close: 17.55 + Math.sin(i * 0.1) * 0.05,
    volume: 100,
  }));

  const analysis = createXpbAnalysis(candles);
  const signals = analysis.interpretSignals();
  assert.ok(Array.isArray(signals));
});

test('buildTechnicalSummary with valid analysis', () => {
  const candles = Array.from({ length: 50 }, (_, i) => ({
    time: i,
    open: 17.5 + i * 0.01,
    high: 17.6 + i * 0.01,
    low: 17.4 + i * 0.01,
    close: 17.55 + i * 0.01,
    volume: 100,
  }));

  const analysis = createXpbAnalysis(candles);
  const summary = buildTechnicalSummary(analysis);
  assert.ok(typeof summary === 'string');
  assert.ok(summary.includes('Technical levels'));
  assert.ok(summary.includes('RSI'));
});

test('buildTechnicalSummary with null analysis', () => {
  const summary = buildTechnicalSummary(null);
  assert.equal(summary, 'Technical data unavailable.');
});

test('getBollingerBands', () => {
  const candles = Array.from({ length: 50 }, (_, i) => ({
    time: i,
    open: 17.5 + Math.sin(i * 0.1) * 0.05,
    high: 17.6 + Math.sin(i * 0.1) * 0.05,
    low: 17.4 + Math.sin(i * 0.1) * 0.05,
    close: 17.55 + Math.sin(i * 0.1) * 0.05,
    volume: 100,
  }));

  const analysis = createXpbAnalysis(candles);
  const bb = analysis.getBollingerBands(20, 2);
  assert.ok(bb);
  assert.ok(typeof bb.middle === 'number');
  assert.ok(bb.upper > bb.middle);
  assert.ok(bb.lower < bb.middle);
  assert.ok(typeof bb.bandwidth === 'number');
});
