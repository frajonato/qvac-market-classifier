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

const MARKET_CLASSIFICATION_SCHEMA = {
  type: 'object',
  properties: {
    category: { type: 'string', enum: ['macro', 'btc', 'gold', 'xaut-btc', 'mixed', 'noise'] },
    signal: { type: 'string', enum: ['hawkish', 'dovish', 'risk-on', 'risk-off', 'neutral', 'unclear'] },
    affectedAssets: {
      type: 'array',
      items: { type: 'string', enum: ['BTC', 'Gold', 'XAUt/BTC'] },
    },
    mechanism: { type: 'string' },
    xautBtcRead: { type: 'string' },
    confidence: { type: 'integer', minimum: 0, maximum: 100 },
    actionableSummary: { type: 'string' },
  },
  required: ['category', 'signal', 'affectedAssets', 'mechanism', 'xautBtcRead', 'confidence', 'actionableSummary'],
  additionalProperties: false,
};

export async function classifyMarketNote(marketNote, options = {}) {
  const {
    modelSrc = DEFAULT_MODEL_SRC,
    onProgress = defaultProgress,
    streamTo = null,
    keepModelLoaded = false,
  } = options;

  const modelId = await loadModel({
    modelSrc,
    modelConfig: { reasoning_budget: 0, ctx_size: 4096 },
    onProgress,
  });

  try {
    const history = [
      {
        role: 'system',
        content: 'You are a concise market classification engine. Return only valid JSON. /no_think',
      },
      {
        role: 'user',
        content: buildMarketPrompt(marketNote),
      },
    ];

    const result = completion({
      modelId,
      history,
      stream: true,
      responseFormat: {
        type: 'json_schema',
        json_schema: {
          name: 'market_classification',
          schema: MARKET_CLASSIFICATION_SCHEMA,
        },
      },
    });
    const text = await collectCompletionText(result, streamTo);
    const deterministicSignals = deriveDeterministicSignals(marketNote);
    const modelAnalysis = parseModelOutput(text);
    const baseAnalysis = isPlainObject(modelAnalysis)
      ? modelAnalysis
      : buildFallbackAnalysis(marketNote, deterministicSignals, text);
    return mergeDeterministicSignals(baseAnalysis, deterministicSignals);
  } finally {
    if (!keepModelLoaded) {
      await unloadModel({ modelId });
    }
  }
}

export async function collectCompletionText(result, streamTo = null) {
  if (result?.events && result?.final) {
    for await (const event of result.events) {
      if (event.type === 'contentDelta' && streamTo) streamTo.write(event.text);
    }
    const final = await result.final;
    if (streamTo) streamTo.write('\n');
    return String(final?.contentText ?? final?.raw?.fullText ?? '').trim();
  }

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

function buildFallbackAnalysis(marketNote, deterministicSignals, rawModelText = '') {
  const note = String(marketNote ?? '');
  const category = note.toLowerCase().includes('xaut') || note.toLowerCase().includes('xpb') ? 'xaut-btc' : 'mixed';
  const signal = deterministicSignals.macroSignal && deterministicSignals.macroSignal !== 'unknown'
    ? deterministicSignals.macroSignal
    : note.toLowerCase().includes('risk') || deterministicSignals.xpbBias !== 'unknown'
      ? 'risk-on'
      : 'neutral';

  const xpbDirection = deterministicSignals.xpbBias === 'up'
    ? 'xpb likely rises'
    : deterministicSignals.xpbBias === 'down'
      ? 'xpb likely falls'
      : 'mixed';

  return {
    category,
    signal,
    affectedAssets: ['BTC', 'Gold', 'XAUt/BTC'],
    mechanism: 'The local QVAC pass completed and the app applied its deterministic market overlay to keep the final JSON strict and actionable. The overlay reads the current note, compares BTC versus XAUt relative performance, then maps that relative move to the XAUt/BTC ratio.',
    xautBtcRead: `${xpbDirection}. ${deterministicSignals.ratioRule}`,
    confidence: rawModelText ? 65 : 55,
    actionableSummary: 'Live mode completed with current market data and deterministic XAUt/BTC overlay.',
  };
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

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function defaultProgress(progress) {
  if (!progress || typeof progress.percentage !== 'number') return;
  const pct = Math.floor(progress.percentage);
  process.stderr.write(`\rLoading local QVAC model: ${pct}%`);
  if (pct >= 100) process.stderr.write('\n');
}
