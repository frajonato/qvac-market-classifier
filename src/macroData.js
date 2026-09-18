// Macro data fetching and formatting
// Fetches: DXY, US yields, real yields, economic calendar
// With explicit interpretation of implications for gold/BTC

const FRED_API_BASE = 'https://api.stlouisfed.org/fred/series/data';
const TRADINGECONOMICS_BASE = 'https://api.tradingeconomics.com';
const NEWSAPI_BASE = 'https://newsapi.org/v2';

const FRED_KEY = 'demo'; // Replace with env var FRED_API_KEY in production

export async function fetchMacroData({ fetchImpl = globalThis.fetch, cache = {} } = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch is required to load macro data. Use Node.js 22+ or pass fetchImpl.');
  }

  const [dxyData, yields10yData, realYieldsData, macroCalendar] = await Promise.allSettled([
    fetchDXY(fetchImpl, cache),
    fetchUS10YYield(fetchImpl, cache),
    fetchRealYields(fetchImpl, cache),
    fetchMacroCalendar(fetchImpl, cache),
  ]);

  return {
    timestamp: new Date().toISOString(),
    dxy: settlledToValue(dxyData, { value: null, change: null, status: 'error' }),
    us10yYield: settlledToValue(yields10yData, { value: null, change: null, status: 'error' }),
    realYields: settlledToValue(realYieldsData, { value: null, change: null, status: 'error' }),
    macroCalendar: settlledToValue(macroCalendar, { upcoming: [], status: 'error' }),
  };
}

/**
 * Build a macro summary for the market note
 * With explicit interpretation of implications (hawkish/dovish, magnitude, gold/BTC impact)
 */
export function buildMacroNote(macroData) {
  if (!macroData || !isPlainObject(macroData)) {
    return 'Macro data unavailable.';
  }

  const lines = ['Macro context:'];

  // DXY (Dollar Index)
  if (macroData.dxy && macroData.dxy.value) {
    const dxyDirection = macroData.dxy.change > 0 ? 'stronger' : macroData.dxy.change < 0 ? 'weaker' : 'unchanged';
    const dxyMagnitude = Math.abs(macroData.dxy.change) > 0.5 ? 'SIGNIFICANT' : 'modest';
    const dxyImplication = macroData.dxy.change > 0 ? '(hawkish → headwind for gold)' : '(dovish → tailwind for gold)';
    lines.push(`  DXY: ${formatNumber(macroData.dxy.value, 2)} (${dxyMagnitude} ${dxyDirection} ${formatSigned(macroData.dxy.change)}%) ${dxyImplication}`);
  }

  // US 10Y Yield
  if (macroData.us10yYield && macroData.us10yYield.value) {
    const yieldDirection = macroData.us10yYield.change > 0 ? 'rising' : macroData.us10yYield.change < 0 ? 'falling' : 'unchanged';
    const yieldMagnitude = Math.abs(macroData.us10yYield.change) > 0.1 ? 'SIGNIFICANT' : 'modest';
    const yieldImplication = macroData.us10yYield.change > 0 ? '(restrictive → raises opportunity cost for non-yielding assets)' : '(accommodative → lowers opportunity cost)';
    lines.push(`  US 10Y yield: ${formatNumber(macroData.us10yYield.value, 3)}% (${yieldMagnitude} ${yieldDirection} ${formatSigned(macroData.us10yYield.change)}%) ${yieldImplication}`);
  }

  // Real yields
  if (macroData.realYields && macroData.realYields.value !== null) {
    const realYieldContext = 
      macroData.realYields.value > 2.0 ? '(restrictive → pressures gold)' : 
      macroData.realYields.value < 0 ? '(very accommodative → supports gold)' : 
      '(neutral → mixed impact)';
    lines.push(`  Real yields (est.): ${formatNumber(macroData.realYields.value, 3)}% ${realYieldContext}`);
  }

  // Upcoming macro events
  if (Array.isArray(macroData.macroCalendar?.upcoming) && macroData.macroCalendar.upcoming.length > 0) {
    const upcomingList = macroData.macroCalendar.upcoming
      .slice(0, 3)
      .map((ev) => `${ev.name} (${ev.daysUntil}d, impact: ${ev.impact})`)
      .join('; ');
    lines.push(`  Next events: ${upcomingList} → expect volatility`);
  }

  if (lines.length === 1) {
    lines.push('  No live macro fields available from public endpoints in this run.');
  }

  return lines.join('\n');
}

async function fetchDXY(fetchImpl, cache) {
  try {
    const url = `${TRADINGECONOMICS_BASE}/indicators/?country=us&calendar=true`;
    const response = await fetchImpl(url, { headers: { 'User-Agent': 'qvac-market-note-classifier/1.0' } });

    if (!response.ok) {
      return { value: null, change: null, status: 'fetch_error' };
    }

    const data = await response.json();
    const dxyIndicator = Array.isArray(data) ? data.find((d) => d.indicator?.toLowerCase?.()?.includes('dxy') || d.indicator?.toLowerCase?.()?.includes('dollar')) : null;

    if (dxyIndicator) {
      return { value: dxyIndicator.value, change: dxyIndicator.change, status: 'ok' };
    }

    return { value: null, change: null, status: 'not_found' };
  } catch (err) {
    return { value: null, change: null, status: 'error', error: err.message };
  }
}

async function fetchUS10YYield(fetchImpl, cache) {
  try {
    const seriesId = 'DFF';
    const url = `${FRED_API_BASE}?series_id=${seriesId}&api_key=${FRED_KEY}&limit=1&sort_order=desc`;
    const response = await fetchImpl(url, { headers: { 'User-Agent': 'qvac-market-note-classifier/1.0' } });

    if (!response.ok) {
      return { value: null, change: null, status: 'fetch_error' };
    }

    const data = await response.json();
    const observations = data?.observations;
    if (Array.isArray(observations) && observations.length > 0) {
      const latest = observations[0];
      const previous = observations[1];
      const value = parseFloat(latest.value);
      const prevValue = parseFloat(previous?.value ?? latest.value);
      const change = round2((value - prevValue) / prevValue * 100);

      return { value, change, status: 'ok' };
    }

    return { value: null, change: null, status: 'not_found' };
  } catch (err) {
    return { value: null, change: null, status: 'error', error: err.message };
  }
}

async function fetchRealYields(fetchImpl, cache) {
  try {
    const seriesId = 'DFEDTARU';
    const url = `${FRED_API_BASE}?series_id=${seriesId}&api_key=${FRED_KEY}&limit=1&sort_order=desc`;
    const response = await fetchImpl(url, { headers: { 'User-Agent': 'qvac-market-note-classifier/1.0' } });

    if (!response.ok) {
      return { value: null, change: null, status: 'fetch_error' };
    }

    const data = await response.json();
    const observations = data?.observations;
    if (Array.isArray(observations) && observations.length > 0) {
      const latest = observations[0];
      const value = parseFloat(latest.value);
      return { value, change: null, status: 'ok' };
    }

    return { value: null, change: null, status: 'not_found' };
  } catch (err) {
    return { value: null, change: null, status: 'error', error: err.message };
  }
}

async function fetchMacroCalendar(fetchImpl, cache) {
  try {
    const url = `${TRADINGECONOMICS_BASE}/calendar/?country=us&category=cpi,nfp,fed&limit=10`;
    const response = await fetchImpl(url, { headers: { 'User-Agent': 'qvac-market-note-classifier/1.0' } });

    if (!response.ok) {
      return { upcoming: [], status: 'fetch_error' };
    }

    const data = await response.json();
    const events = Array.isArray(data)
      ? data
          .filter((ev) => new Date(ev.date) > new Date())
          .slice(0, 5)
          .map((ev) => ({
            name: ev.event || 'Unknown',
            date: ev.date,
            daysUntil: daysUntilEvent(ev.date),
            impact: classifyImpact(ev.importance),
          }))
      : [];

    return { upcoming: events, status: 'ok' };
  } catch (err) {
    return { upcoming: [], status: 'error', error: err.message };
  }
}

// Helpers
function settlledToValue(settledPromise, defaultValue) {
  if (settledPromise.status === 'fulfilled') return settledPromise.value;
  return defaultValue;
}

function daysUntilEvent(dateStr) {
  const eventDate = new Date(dateStr);
  const today = new Date();
  const diffMs = eventDate - today;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function classifyImpact(importanceLevel) {
  if (importanceLevel >= 3) return 'high';
  if (importanceLevel === 2) return 'medium';
  return 'low';
}

function formatNumber(value, digits) {
  return Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

function formatSigned(value) {
  const rounded = formatNumber(value, 2);
  return value > 0 ? `+${rounded}` : rounded;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function round2(value) {
  return Math.round(value * 100) / 100;
}
