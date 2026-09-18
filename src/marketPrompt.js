export function buildMarketPrompt(marketNote) {
  const note = normalizeMarketNote(marketNote);

  return `You are a local, private market-note classifier. Analyze the note for BTC, gold, XAUt/BTC, and macro/Fed relevance.

Return only valid JSON. Do not wrap it in markdown. Choose exactly one allowed value for category and signal. Do not copy the enum list into the value.

Schema:
{
  "category": "one of: macro, btc, gold, xaut-btc, mixed, noise",
  "signal": "one of: hawkish, dovish, risk-on, risk-off, neutral, unclear",
  "affectedAssets": ["zero or more of: BTC, Gold, XAUt/BTC"],
  "mechanism": "Write the actual causal chain from this note, not a template.",
  "xautBtcRead": "Say: xpb likely rises, xpb likely falls, or mixed. Then explain why.",
  "confidence": "integer from 0 to 100",
  "actionableSummary": "one short paragraph"
}

Rules:
- Do not give financial advice.
- Use concrete directional language where the note supports it.
- If the note is irrelevant or lacks market signal, category must be "noise" and confidence must be below 50.
- The XAUt/BTC ratio means XAUt per 1 BTC. xpb high means BTC is strong versus gold. xpb low means BTC is cheap versus gold.
- For macro: CPI hot usually means Fed more restrictive -> USD/yields up -> higher opportunity cost -> pressure on gold.
- CPI soft or weak employment usually means Fed less restrictive -> USD/yields down -> lower opportunity cost -> support for gold.
- If gold falls while BTC is flat or stronger, xpb usually rises because 1 BTC buys more XAUt.
- If gold rises more than BTC, xpb usually falls because 1 BTC buys fewer XAUt.

Market note:
"""
${note}
"""`;
}

export function normalizeMarketNote(marketNote) {
  const note = String(marketNote ?? '').trim();
  if (!note) {
    throw new Error('A market note is required. Paste a headline, macro note, or short article excerpt.');
  }
  return note.replace(/\r\n/g, '\n');
}

export function summarizeInputForDisplay(marketNote, maxLength = 120) {
  const oneLine = normalizeMarketNote(marketNote).replace(/\s+/g, ' ');
  if (oneLine.length <= maxLength) return oneLine;
  return `${oneLine.slice(0, maxLength)}…`;
}
