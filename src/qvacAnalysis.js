import {
  completion,
  loadModel,
  QWEN3_1_7B_INST_Q4,
  unloadModel,
} from '@qvac/sdk';

import { buildMarketPrompt } from './marketPrompt.js';
import { deriveDeterministicSignals, mergeDeterministicSignals } from './marketRules.js';

export const DEFAULT_MODEL_SRC = QWEN3_1_7B_INST_Q4;
export const DEFAULT_MODEL_LABEL = 'QWEN3_1_7B_INST_Q4';

export async function classifyMarketNote(marketNote, options = {}) {
  const {
    modelSrc = DEFAULT_MODEL_SRC,
    onProgress = defaultProgress,
    streamTo = null,
    keepModelLoaded = false,
  } = options;

  const modelId = await loadModel({
    modelSrc,
    modelConfig: { reasoning_budget: 0 },
    onProgress,
  });

  try {
    const history = [
      {
        role: 'system',
        content: 'You are a concise market classification engine. Return only valid JSON.',
      },
      {
        role: 'user',
        content: buildMarketPrompt(marketNote),
      },
    ];

    const result = completion({ modelId, history, stream: true });
    const text = await collectCompletionText(result, streamTo);
    const modelAnalysis = parseModelOutput(text);
    const deterministicSignals = deriveDeterministicSignals(marketNote);
    return mergeDeterministicSignals(modelAnalysis, deterministicSignals);
  } finally {
    if (!keepModelLoaded) {
      await unloadModel({ modelId });
    }
  }
}

export async function collectCompletionText(result, streamTo = null) {
  if (result?.tokenStream) {
    let text = '';
    for await (const token of result.tokenStream) {
      text += token;
      if (streamTo) streamTo.write(token);
    }
    if (streamTo) streamTo.write('\n');
    return text.trim();
  }

  if (typeof result?.content === 'string') return result.content.trim();
  if (typeof result?.text === 'string') return result.text.trim();
  if (typeof result === 'string') return result.trim();

  return JSON.stringify(result);
}

export function parseModelOutput(text) {
  const cleaned = stripMarkdownFence(String(text ?? '').trim());
  const withoutThinking = stripThinkingBlocks(cleaned);
  try {
    return JSON.parse(withoutThinking);
  } catch {
    return cleaned;
  }
}

function stripMarkdownFence(text) {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function stripThinkingBlocks(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

function defaultProgress(progress) {
  if (!progress || typeof progress.percentage !== 'number') return;
  const pct = Math.floor(progress.percentage);
  process.stderr.write(`\rLoading local QVAC model: ${pct}%`);
  if (pct >= 100) process.stderr.write('\n');
}
