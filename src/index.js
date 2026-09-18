#!/usr/bin/env node
import { getMarketNoteFromArgs, printUsage, formatAnalysis, shouldUseLiveMode } from './cli.js';
import { buildLiveMarketNote, fetchLiveMarketData } from './liveData.js';
import { fetchMacroData, buildMacroNote } from './macroData.js';
import { createXpbAnalysis, buildTechnicalSummary } from './technicalIndicators.js';
import { fetchNews, aggregateSentimentByAsset, buildSentimentNote } from './sentimentAnalysis.js';
import { summarizeInputForDisplay } from './marketPrompt.js';
import { classifyMarketNote, DEFAULT_MODEL_LABEL } from './qvacAnalysis.js';

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    return;
  }

  let marketNote = getMarketNoteFromArgs(args);
  if (shouldUseLiveMode(args)) {
    process.stderr.write('Fetching live market data from Bitfinex and CoinGecko...\n');
    const liveData = await fetchLiveMarketData();
    marketNote = buildLiveMarketNote(liveData);

    // Optionally fetch macro data
    if (args.includes('--macro')) {
      process.stderr.write('Fetching macro data (DXY, yields, calendar)...\n');
      const macroData = await fetchMacroData();
      const macroNote = buildMacroNote(macroData);
      marketNote = `${marketNote}\n\n${macroNote}`;
      process.stderr.write(`Macro context added.\n`);
    }

    // Optionally add technical analysis
    if (args.includes('--tech') || args.includes('--technical')) {
      if (liveData.candles && liveData.candles.length > 0) {
        process.stderr.write('Analyzing technical levels...\n');
        const xpbAnalysis = createXpbAnalysis(liveData.candles);
        const techNote = buildTechnicalSummary(xpbAnalysis);
        marketNote = `${marketNote}\n\n${techNote}`;
        process.stderr.write(`Technical analysis added.\n`);
      } else {
        process.stderr.write('Warning: No candle data available for technical analysis.\n');
      }
    }

    // Optionally fetch sentiment analysis
    if (args.includes('--sentiment')) {
      process.stderr.write('Fetching news and sentiment analysis...\n');
      const newsData = await fetchNews();
      const sentimentByAsset = aggregateSentimentByAsset(newsData.items);
      const sentimentNote = buildSentimentNote(sentimentByAsset);
      marketNote = `${marketNote}\n\n${sentimentNote}`;
      if (newsData.source === 'mock') {
        process.stderr.write(`Sentiment analysis added (${newsData.source} data).\n`);
      } else {
        process.stderr.write(`Sentiment analysis added (${newsData.items.length} articles).\n`);
      }
    }

    process.stderr.write(`\nLive note:\n${marketNote}\n\n`);
  }

  if (!marketNote) {
    printUsage(process.stderr);
    process.exitCode = 1;
    return;
  }

  process.stderr.write(`Model: ${DEFAULT_MODEL_LABEL}\n`);
  process.stderr.write(`Input: ${summarizeInputForDisplay(marketNote)}\n\n`);

  const analysis = await classifyMarketNote(marketNote);
  process.stdout.write(`${formatAnalysis(analysis)}\n`);
}

main().catch((error) => {
  process.stderr.write(`\nError: ${error?.message ?? error}\n`);
  process.exit(1);
});
