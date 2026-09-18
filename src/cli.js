export function getMarketNoteFromArgs(args) {
  const noteFlagIndex = args.indexOf('--note');
  if (noteFlagIndex !== -1) {
    return args.slice(noteFlagIndex + 1).join(' ').trim();
  }

  return args
    .filter(
      (arg) =>
        arg !== '--' &&
        arg !== '--live' &&
        arg !== '--from-live' &&
        arg !== '--macro' &&
        arg !== '--tech' &&
        arg !== '--technical' &&
        arg !== '--sentiment'
    )
    .join(' ')
    .trim();
}

export function shouldUseLiveMode(args) {
  return args.includes('--live') || args.includes('--from-live');
}

export function formatAnalysis(analysis) {
  if (typeof analysis === 'string') return analysis.trim();
  return JSON.stringify(analysis, null, 2);
}

export function printUsage(output = process.stdout) {
  output.write(`QVAC Market Note Classifier\n\n`);
  output.write(`Usage:\n`);
  output.write(`  npm start -- --live\n`);
  output.write(`  npm start -- --live --macro\n`);
  output.write(`  npm start -- --live --tech\n`);
  output.write(`  npm start -- --live --sentiment\n`);
  output.write(`  npm start -- --live --macro --tech --sentiment\n`);
  output.write(`  npm start -- --note "US CPI came in hotter than expected..."\n`);
  output.write(`  npm start -- "BTC ETF inflows accelerated while gold held near highs"\n\n`);
  output.write(`Flags:\n`);
  output.write(`  --live                Fetch live Bitfinex XAUt/BTC and CoinGecko prices\n`);
  output.write(`  --macro               Add macro context (DXY, yields, calendar events)\n`);
  output.write(`  --tech, --technical   Add technical analysis (RSI, SMA, ATR, Fib, S/R)\n`);
  output.write(`  --sentiment           Add news sentiment analysis (BTC, gold, USD)\n`);
  output.write(`  --note <text>         Analyze a custom market note\n\n`);
  output.write(`Live mode fetches Bitfinex XAUt/BTC, CoinGecko BTC/XAUt USD data, builds a note, then analyzes it locally.\n`);
  output.write(`Optional --macro, --tech, and --sentiment flags enrich the note with additional context.\n`);
  output.write(`The first run downloads the selected local model. After that, inference runs on-device.\n`);
}
