import { describe, it, expect } from 'vitest';
import { filterSavedByBeat, beatsForFilter, savedCountByBeat } from './savedFilter';
import type { BeatId, DigestItem } from './types';

/** A saved dispatch with only the fields this rule reads. */
function saved(id: string, beat: BeatId): DigestItem {
  return {
    id,
    source: 'Test Wire',
    date: '2026-11-10',
    headline: `Headline ${id}`,
    summary: 'Summary text.',
    beat,
    column: 'venture',
    scores: {
      authority: 8,
      corroboration: 8,
      novelty: 8,
      magnitude: 8,
      relevance: 8,
      total: 8,
    },
  };
}

const SAVES: DigestItem[] = [
  saved('a', 'ai-venture'),
  saved('b', 'ai-venture'),
  saved('c', 'ai-venture'),
  saved('d', 'politics'),
  saved('e', 'politics'),
];

describe('filterSavedByBeat', () => {
  it('returns only the dispatches in the chosen beat', () => {
    const result = filterSavedByBeat(SAVES, 'ai-venture');
    expect(result).toHaveLength(3);
    expect(result.every((item) => item.beat === 'ai-venture')).toBe(true);
  });

  it('returns every saved dispatch when no beat is chosen', () => {
    expect(filterSavedByBeat(SAVES, null)).toHaveLength(5);
  });

  it('returns nothing for a beat the reader has no saves in', () => {
    expect(filterSavedByBeat(SAVES, 'science')).toEqual([]);
  });

  it('does not mutate the list it is given', () => {
    const before = [...SAVES];
    filterSavedByBeat(SAVES, 'politics');
    expect(SAVES).toEqual(before);
  });
});

describe('beatsForFilter', () => {
  it('includes a followed beat even with nothing saved in it', () => {
    const beats = beatsForFilter(['ai-venture', 'science'], SAVES);
    expect(beats).toContain('science');
  });

  it('includes a beat the reader holds a save from but no longer follows', () => {
    const beats = beatsForFilter(['ai-venture'], SAVES);
    expect(beats).toContain('politics');
  });

  it('returns beats in catalog order, not save order', () => {
    const beats = beatsForFilter(['markets', 'ai-venture'], []);
    expect(beats).toEqual(['ai-venture', 'markets']);
  });

  it('lists each beat once when it is both followed and saved from', () => {
    const beats = beatsForFilter(['ai-venture'], SAVES);
    expect(beats.filter((b) => b === 'ai-venture')).toHaveLength(1);
  });
});

describe('savedCountByBeat', () => {
  it('counts the saves in each beat', () => {
    expect(savedCountByBeat(SAVES)).toEqual({ 'ai-venture': 3, politics: 2 });
  });

  it('omits beats with no saves rather than reporting zero', () => {
    expect(savedCountByBeat(SAVES).science).toBeUndefined();
  });
});
