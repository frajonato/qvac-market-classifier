import test from 'node:test';
import assert from 'node:assert/strict';

import { deriveDeterministicSignals, mergeDeterministicSignals, detectTechnicalContext } from '../src/marketRules.js';

test('deriveDeterministicSignals marks hawkish CPI with gold down and BTC flat as xpb up', () => {
  const signals = deriveDeterministicSignals('US CPI came in hotter than expected while Treasury yields and DXY rose; gold slipped but BTC held flat.');

  assert.equal(signals.macroSignal, 'hawkish');
  assert.equal(signals.xpbBias, 'up');
  assert.match(signals.ratioRule, /gold weakens while BTC is flat/i);
});

test('deriveDeterministicSignals marks weak payrolls with gold up more than BTC as xpb down', () => {
  const signals = deriveDeterministicSignals('Weak US payrolls missed expectations, markets priced more Fed cuts, the dollar sold off, gold rallied, and BTC moved only slightly higher.');

  assert.equal(signals.macroSignal, 'dovish');
  assert.equal(signals.xpbBias, 'down');
  assert.match(signals.ratioRule, /gold outperforms BTC/i);
});

test('deriveDeterministicSignals marks BTC ETF inflows with gold flat as xpb up', () => {
  const signals = deriveDeterministicSignals('Spot Bitcoin ETF inflows accelerated for a fourth day while gold was flat and real yields were unchanged.');

  assert.equal(signals.xpbBias, 'up');
  assert.match(signals.ratioRule, /BTC demand improves while gold is flat/i);
});

test('deriveDeterministicSignals honors explicit live xpb bias from fetched note', () => {
  const signals = deriveDeterministicSignals('Relative 24h performance: BTC minus XAUt is +0.42 percentage points; xpb live bias: up.');

  assert.equal(signals.xpbBias, 'up');
  assert.match(signals.ratioRule, /live data note explicitly reports/i);
});

test('mergeDeterministicSignals overrides weak model xautBtcRead with deterministic read', () => {
  const merged = mergeDeterministicSignals(
    { category: 'mixed', signal: 'neutral', xautBtcRead: 'mixed', confidence: 60 },
    { macroSignal: 'hawkish', xpbBias: 'up', ratioRule: 'Gold down, BTC flat.', notes: [] },
  );

  assert.equal(merged.signal, 'hawkish');
  assert.match(merged.xautBtcRead, /xpb likely rises/i);
  assert.equal(merged.deterministicOverlay.xpbBias, 'up');
});

test('detectTechnicalContext detects overbought RSI', () => {
  const context = detectTechnicalContext('RSI > 70: overbought, potential pullback');
  assert.equal(context.overbought, true);
  assert.equal(context.oversold, false);
  assert.equal(context.technicalBias, 'bearish');
});

test('detectTechnicalContext detects oversold RSI', () => {
  const context = detectTechnicalContext('RSI < 30: oversold, potential bounce');
  assert.equal(context.oversold, true);
  assert.equal(context.overbought, false);
  assert.equal(context.technicalBias, 'bullish');
});

test('detectTechnicalContext detects near resistance', () => {
  const context = detectTechnicalContext('Price near resistance at 18.50');
  assert.equal(context.nearResistance, true);
  assert.equal(context.technicalBias, 'neutral');
});

test('detectTechnicalContext detects near support', () => {
  const context = detectTechnicalContext('Price near support at 17.20');
  assert.equal(context.nearSupport, true);
  assert.equal(context.technicalBias, 'neutral');
});

test('detectTechnicalContext handles empty input', () => {
  const context = detectTechnicalContext('');
  assert.equal(context.overbought, false);
  assert.equal(context.oversold, false);
  assert.equal(context.nearResistance, false);
  assert.equal(context.nearSupport, false);
});
