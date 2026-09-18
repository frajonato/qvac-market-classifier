import test from 'node:test';
import assert from 'node:assert/strict';

import { collectCompletionText, parseModelOutput } from '../src/qvacAnalysis.js';

test('parseModelOutput parses fenced JSON emitted by a model', () => {
  const parsed = parseModelOutput('```json\n{"category":"macro","confidence":72}\n```');

  assert.deepEqual(parsed, { category: 'macro', confidence: 72 });
});

test('parseModelOutput removes Qwen thinking blocks before parsing JSON', () => {
  const parsed = parseModelOutput('<think>private reasoning</think>\n{"category":"gold"}');

  assert.deepEqual(parsed, { category: 'gold' });
});

test('parseModelOutput returns raw text when JSON parsing fails', () => {
  assert.equal(parseModelOutput('Category: macro'), 'Category: macro');
});

test('collectCompletionText joins streamed tokens', async () => {
  async function* tokens() {
    yield 'Gold';
    yield ' down';
  }

  const text = await collectCompletionText({ tokenStream: tokens() });

  assert.equal(text, 'Gold down');
});
