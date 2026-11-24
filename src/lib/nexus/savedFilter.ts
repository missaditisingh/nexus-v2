/**
 * The beat filter rule for the saved dispatches view.
 *
 * These functions hold the whole rule and nothing else: no React, no DOM, no
 * localStorage. DigestGrid decides how to draw the chips; this file decides
 * which beats get a chip, how many saves each one has, and which saved
 * dispatches a given filter lets through.
 */
import { BEAT_DEFINITIONS, type BeatId, type DigestItem } from './types';

/**
 * The saved dispatches a filter lets through.
 * A null filter means "no filter", so every saved dispatch is returned.
 */
export function filterSavedByBeat(
  savedItems: readonly DigestItem[],
  beat: BeatId | null,
): DigestItem[] {
  if (!beat) return [...savedItems];
  return savedItems.filter((item) => item.beat === beat);
}

/**
 * Which beats get a chip: the beats the reader follows, plus any beat they
 * hold a save from, in catalog order.
 *
 * The second half matters. A dispatch saved before the reader changed their
 * beats would otherwise have no chip and become unreachable.
 */
export function beatsForFilter(
  selectedBeats: readonly BeatId[],
  savedItems: readonly DigestItem[],
): BeatId[] {
  const present = new Set<BeatId>(selectedBeats);
  for (const item of savedItems) {
    if (item.beat) present.add(item.beat);
  }
  return (Object.keys(BEAT_DEFINITIONS) as BeatId[]).filter((beatId) => present.has(beatId));
}

/** How many saved dispatches sit in each beat. */
export function savedCountByBeat(
  savedItems: readonly DigestItem[],
): Partial<Record<BeatId, number>> {
  const counts: Partial<Record<BeatId, number>> = {};
  for (const item of savedItems) {
    if (item.beat) {
      counts[item.beat] = (counts[item.beat] || 0) + 1;
    }
  }
  return counts;
}
