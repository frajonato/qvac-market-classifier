import test from 'node:test';
import assert from 'node:assert/strict';

import { buildMarketPrompt, summarizeInputForDisplay } from '../src/marketPrompt.js';

test('buildMarketPrompt asks for strict JSON and includes the market note', () => {
  const note = 'US CPI came in hotter than expected and Treasury yields rose.';

  const prompt = buildMarketPrompt(note);

  assert.match(prompt, /Return only valid JSON/i);
  assert.match(prompt, /category/i);
  assert.match(prompt, /xautBtcRead/i);
  assert.match(prompt, /US CPI came in hotter than expected/);
});

test('buildMarketPrompt rejects empty notes', () => {
  assert.throws(() => buildMarketPrompt('   '), /market note/i);
});

test('summarizeInputForDisplay trims long one-line previews', () => {
  const preview = summarizeInputForDisplay('  line one\nline two '.repeat(20), 40);

  assert.equal(preview.length, 41);
  assert.match(preview, /…$/);
  assert.doesNotMatch(preview, /\n/);
});
