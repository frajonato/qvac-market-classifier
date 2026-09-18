const HAWKISH_PATTERNS = [
  /cpi\s+(came\s+in\s+)?hotter/i,
  /inflation\s+(came\s+in\s+)?hotter/i,
  /yields?\s+(rose|up|higher|jumped|surged)/i,
  /dxy\s+(rose|up|higher|jumped|surged)/i,
  /dollar\s+(rose|up|higher|strengthened|jumped|surged)/i,
];

const DOVISH_PATTERNS = [
  /weak\s+.*payrolls/i,
  /payrolls\s+(missed|weaker|fell|slowed)/i,
  /employment\s+(missed|weaker|fell|slowed)/i,
  /priced\s+more\s+fed\s+cuts/i,
  /fed\s+cuts/i,
  /dollar\s+(sold\s+off|fell|weakened|lower)/i,
  /dxy\s+(fell|down|lower|weakened)/i,
  /yields?\s+(fell|down|lower)/i,
];

const GOLD_UP_PATTERNS = [/gold\s+(rallied|rose|up|higher|jumped|surged)/i, /xau\s+(rallied|rose|up|higher)/i];
const GOLD_DOWN_PATTERNS = [/gold\s+(slipped|fell|down|lower|dropped|sold\s+off)/i, /xau\s+(fell|down|lower|dropped)/i];
const GOLD_FLAT_PATTERNS = [/gold\s+(was\s+)?flat/i, /gold\s+(unchanged|held\s+steady|held\s+flat)/i];

const BTC_UP_PATTERNS = [/btc\s+(rallied|rose|up|higher|jumped|surged)/i, /bitcoin\s+(rallied|rose|up|higher|jumped|surged)/i, /bitcoin\s+etf\s+inflows/i, /btc\s+etf\s+inflows/i];
const BTC_DOWN_PATTERNS = [/btc\s+(fell|down|lower|dropped|sold\s+off)/i, /bitcoin\s+(fell|down|lower|dropped|sold\s+off)/i];
const BTC_FLAT_PATTERNS = [/btc\s+(held\s+flat|was\s+flat|flat|unchanged)/i, /bitcoin\s+(held\s+flat|was\s+flat|flat|unchanged)/i];
const BTC_SLIGHT_UP_PATTERNS = [/btc\s+moved\s+only\s+slightly\s+higher/i, /bitcoin\s+moved\s+only\s+slightly\s+higher/i];
const XPB_BIAS_UP_PATTERNS = [/xpb\s+live\s+bias:\s*up/i, /xpb\s+(likely\s+)?rises/i];
const XPB_BIAS_DOWN_PATTERNS = [/xpb\s+live\s+bias:\s*down/i, /xpb\s+(likely\s+)?falls/i];

export function deriveDeterministicSignals(marketNote) {
  const note = String(marketNote ?? '');
  const gold = detectAssetMove(note, GOLD_UP_PATTERNS, GOLD_DOWN_PATTERNS, GOLD_FLAT_PATTERNS);
  const btc = detectAssetMove(note, BTC_UP_PATTERNS, BTC_DOWN_PATTERNS, BTC_FLAT_PATTERNS, BTC_SLIGHT_UP_PATTERNS);
  const macroSignal = deriveMacroSignal(note);
  const explicitXpbBias = detectExplicitXpbBias(note);
  const { xpbBias, ratioRule } = explicitXpbBias ?? deriveXpbBias({ gold, btc });

  return {
    macroSignal,
    goldMove: gold,
    btcMove: btc,
    xpbBias,
    ratioRule,
    notes: buildNotes({ macroSignal, gold, btc, xpbBias }),
  };
}

export function mergeDeterministicSignals(modelAnalysis, deterministicSignals) {
  if (!isPlainObject(modelAnalysis)) return modelAnalysis;

  const merged = { ...modelAnalysis };
  if (deterministicSignals.macroSignal && ['hawkish', 'dovish'].includes(deterministicSignals.macroSignal)) {
    merged.signal = deterministicSignals.macroSignal;
  }

  if (deterministicSignals.xpbBias && deterministicSignals.xpbBias !== 'unknown') {
    const deterministicRead = formatXpbRead(deterministicSignals.xpbBias, deterministicSignals.ratioRule);
    merged.xautBtcRead = deterministicRead;
    merged.affectedAssets = mergeAffectedAssets(merged.affectedAssets, 'XAUt/BTC');
    merged.actionableSummary = `Deterministic XAUt/BTC overlay: ${deterministicRead}`;
  }

  merged.deterministicOverlay = deterministicSignals;
  return merged;
}

function mergeAffectedAssets(current, asset) {
  const assets = Array.isArray(current) ? current : [];
  return assets.includes(asset) ? assets : [...assets, asset];
}

function deriveMacroSignal(note) {
  if (matchesAny(note, HAWKISH_PATTERNS)) return 'hawkish';
  if (matchesAny(note, DOVISH_PATTERNS)) return 'dovish';
  return 'unknown';
}

function detectAssetMove(note, upPatterns, downPatterns, flatPatterns, slightUpPatterns = []) {
  if (matchesAny(note, slightUpPatterns)) return 'slightly_up';
  if (matchesAny(note, upPatterns)) return 'up';
  if (matchesAny(note, downPatterns)) return 'down';
  if (matchesAny(note, flatPatterns)) return 'flat';
  return 'unknown';
}

function detectExplicitXpbBias(note) {
  if (matchesAny(note, XPB_BIAS_UP_PATTERNS)) {
    return {
      xpbBias: 'up',
      ratioRule: 'The live data note explicitly reports xpb live bias up from current BTC versus XAUt relative performance.',
    };
  }
  if (matchesAny(note, XPB_BIAS_DOWN_PATTERNS)) {
    return {
      xpbBias: 'down',
      ratioRule: 'The live data note explicitly reports xpb live bias down from current BTC versus XAUt relative performance.',
    };
  }
  return null;
}

function deriveXpbBias({ gold, btc }) {
  if (gold === 'down' && ['flat', 'up', 'slightly_up'].includes(btc)) {
    return {
      xpbBias: 'up',
      ratioRule: 'Gold weakens while BTC is flat or stronger, so 1 BTC buys more XAUt and xpb likely rises.',
    };
  }

  if (['up'].includes(gold) && ['flat', 'down', 'slightly_up'].includes(btc)) {
    return {
      xpbBias: 'down',
      ratioRule: 'Gold outperforms BTC, so 1 BTC buys fewer XAUt and xpb likely falls.',
    };
  }

  if (['flat', 'down'].includes(gold) && ['up', 'slightly_up'].includes(btc)) {
    return {
      xpbBias: 'up',
      ratioRule: 'BTC demand improves while gold is flat or weaker, so xpb likely rises.',
    };
  }

  if (['flat', 'up'].includes(gold) && btc === 'down') {
    return {
      xpbBias: 'down',
      ratioRule: 'BTC weakens while gold is flat or stronger, so xpb likely falls.',
    };
  }

  return {
    xpbBias: 'unknown',
    ratioRule: 'The note does not give enough relative BTC versus gold direction to infer xpb deterministically.',
  };
}

function formatXpbRead(xpbBias, ratioRule) {
  if (xpbBias === 'up') return `xpb likely rises. ${ratioRule}`;
  if (xpbBias === 'down') return `xpb likely falls. ${ratioRule}`;
  return `mixed. ${ratioRule}`;
}

function buildNotes({ macroSignal, gold, btc, xpbBias }) {
  const notes = [];
  if (macroSignal !== 'unknown') notes.push(`macro=${macroSignal}`);
  if (gold !== 'unknown') notes.push(`gold=${gold}`);
  if (btc !== 'unknown') notes.push(`btc=${btc}`);
  if (xpbBias !== 'unknown') notes.push(`xpb=${xpbBias}`);
  return notes;
}

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Detect technical signals from the market note (if it includes technical summary)
export function detectTechnicalContext(marketNote) {
  const note = String(marketNote ?? '');

  const overbought = matchesAny(note, [/rsi\s*>\s*70/i, /overbought/i]);
  const oversold = matchesAny(note, [/rsi\s*<\s*30/i, /oversold/i]);
  const nearResistance = matchesAny(note, [/resistance/i, /near\s+resistance/i]);
  const nearSupport = matchesAny(note, [/support/i, /near\s+support/i]);

  return {
    overbought,
    oversold,
    nearResistance,
    nearSupport,
    technicalBias: overbought ? 'bearish' : oversold ? 'bullish' : 'neutral',
  };
}
