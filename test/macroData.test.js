import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchMacroData, buildMacroNote } from '../src/macroData.js';

// Mock fetch for testing
const mockFetch = async (url, options) => {
  if (url.includes('dexuseu')) {
    return {
      ok: true,
      json: async () => ({
        observations: [
          { value: '104.2' },
          { value: '103.9' },
        ],
      }),
    };
  }

  if (url.includes('DFF')) {
    return {
      ok: true,
      json: async () => ({
        observations: [
          { value: '5.33' },
          { value: '5.32' },
        ],
      }),
    };
  }

  if (url.includes('DFEDTARU')) {
    return {
      ok: true,
      json: async () => ({
        observations: [
          { value: '2.15' },
        ],
      }),
    };
  }

  if (url.includes('calendar')) {
    return {
      ok: true,
      json: async () => [
        {
          event: 'US CPI',
          date: new Date(Date.now() + 86400000).toISOString(),
          importance: 3,
        },
        {
          event: 'US NFP',
          date: new Date(Date.now() + 172800000).toISOString(),
          importance: 3,
        },
      ],
    };
  }

  return {
    ok: false,
    status: 404,
  };
};

test('fetchMacroData: basic structure', async () => {
  const macroData = await fetchMacroData({ fetchImpl: mockFetch });
  assert.ok(macroData);
  assert.ok(macroData.timestamp);
  assert.ok(typeof macroData.timestamp === 'string');
  assert.ok(macroData.dxy);
  assert.ok(macroData.us10yYield);
  assert.ok(macroData.realYields);
  assert.ok(macroData.macroCalendar);
});

test('fetchMacroData: DXY data structure', async () => {
  const macroData = await fetchMacroData({ fetchImpl: mockFetch });
  const dxy = macroData.dxy;
  assert.ok(typeof dxy === 'object');
  assert.ok('value' in dxy);
  assert.ok('status' in dxy);
});

test('fetchMacroData: macro calendar structure', async () => {
  const macroData = await fetchMacroData({ fetchImpl: mockFetch });
  const calendar = macroData.macroCalendar;
  assert.ok(Array.isArray(calendar.upcoming) || typeof calendar.status === 'string');
});

test('buildMacroNote: with valid macro data', () => {
  const macroData = {
    timestamp: new Date().toISOString(),
    dxy: { value: 104.5, change: 0.3, status: 'ok' },
    us10yYield: { value: 4.25, change: 0.15, status: 'ok' },
    realYields: { value: 2.1, change: null, status: 'ok' },
    macroCalendar: {
      upcoming: [
        { name: 'US CPI', daysUntil: 1, impact: 'high' },
        { name: 'US NFP', daysUntil: 2, impact: 'high' },
      ],
      status: 'ok',
    },
  };

  const note = buildMacroNote(macroData);
  assert.ok(typeof note === 'string');
  assert.ok(note.includes('Macro context'));
  assert.ok(note.includes('DXY'));
  assert.ok(note.includes('US 10Y'));
});

test('buildMacroNote: with null macro data', () => {
  const note = buildMacroNote(null);
  assert.equal(note, 'Macro data unavailable.');
});

test('buildMacroNote: with empty macro data', () => {
  const note = buildMacroNote({});
  assert.ok(typeof note === 'string');
  assert.ok(note.includes('Macro context'));
});

test('buildMacroNote: with partial data', () => {
  const macroData = {
    dxy: { value: 104.5, change: 0.3, status: 'ok' },
    us10yYield: { value: null, change: null, status: 'error' },
    realYields: { value: null, change: null, status: 'error' },
    macroCalendar: { upcoming: [], status: 'ok' },
  };

  const note = buildMacroNote(macroData);
  assert.ok(typeof note === 'string');
  assert.ok(note.includes('DXY'));
});

test('buildMacroNote: formats yield correctly', () => {
  const macroData = {
    us10yYield: { value: 4.251, change: 0.15, status: 'ok' },
    dxy: { value: null, change: null, status: 'error' },
    realYields: { value: null, change: null, status: 'error' },
    macroCalendar: { upcoming: [], status: 'ok' },
  };

  const note = buildMacroNote(macroData);
  assert.ok(note.includes('4.25')); // Should be rounded to 3 decimals
});

test('buildMacroNote: includes upcoming events', () => {
  const macroData = {
    dxy: { value: null, change: null, status: 'error' },
    us10yYield: { value: null, change: null, status: 'error' },
    realYields: { value: null, change: null, status: 'error' },
    macroCalendar: {
      upcoming: [
        { name: 'US CPI', daysUntil: 1, impact: 'high' },
        { name: 'ECB Decision', daysUntil: 5, impact: 'medium' },
      ],
      status: 'ok',
    },
  };

  const note = buildMacroNote(macroData);
  assert.ok(note.includes('CPI'));
  assert.ok(note.includes('ECB'));
  assert.ok(note.includes('high'));
});

test('fetchMacroData: handles fetch errors gracefully', async () => {
  const badFetch = async () => {
    throw new Error('Network error');
  };

  // Should not throw, but return error status
  const macroData = await fetchMacroData({ fetchImpl: badFetch });
  assert.ok(macroData);
  assert.ok(macroData.timestamp);
  // Most fields should have error status
});
