import test from 'node:test';
import assert from 'node:assert/strict';

import { getMarketNoteFromArgs, formatAnalysis, shouldUseLiveMode } from '../src/cli.js';

test('getMarketNoteFromArgs reads a note after --note', () => {
  assert.equal(
    getMarketNoteFromArgs(['--note', 'Gold rallies as yields fall']),
    'Gold rallies as yields fall',
  );
});

test('getMarketNoteFromArgs treats positional args as the note', () => {
  assert.equal(
    getMarketNoteFromArgs(['BTC', 'ETF', 'inflows', 'accelerate']),
    'BTC ETF inflows accelerate',
  );
});

test('getMarketNoteFromArgs ignores --live when positional note is also provided', () => {
  assert.equal(
    getMarketNoteFromArgs(['--live', 'BTC', 'ETF', 'inflows', 'accelerate']),
    'BTC ETF inflows accelerate',
  );
});

test('shouldUseLiveMode detects --live and --from-live', () => {
  assert.equal(shouldUseLiveMode(['--live']), true);
  assert.equal(shouldUseLiveMode(['--from-live']), true);
  assert.equal(shouldUseLiveMode(['--note', 'manual note']), false);
});

test('formatAnalysis prints JSON objects cleanly', () => {
  const formatted = formatAnalysis({ category: 'macro', confidence: 72 });

  assert.match(formatted, /"category": "macro"/);
  assert.match(formatted, /"confidence": 72/);
});

test('formatAnalysis returns text unchanged when the model emits a string', () => {
  assert.equal(formatAnalysis('Category: macro'), 'Category: macro');
});
