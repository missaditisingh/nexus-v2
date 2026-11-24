import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DigestGrid } from './DigestGrid';
import type { BeatId, DayDigest, DigestItem } from '../../lib/nexus/types';

/**
 * Integration test: DigestGrid wired to the real filter rule, the real beat
 * catalog and the real DigestItem card. Nothing here reaches into the rule's
 * internals; everything is driven by clicking what a reader would click.
 */

function saved(id: string, beat: BeatId, headline: string): DigestItem {
  return {
    id,
    source: 'Test Wire',
    date: '2026-11-10',
    headline,
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
  saved('a', 'ai-venture', 'Lambda raises four billion'),
  saved('b', 'ai-venture', 'GitHub ships agent reviews'),
  saved('c', 'ai-venture', 'Scaling laws hold for retrieval'),
  saved('d', 'politics', 'Antitrust filing lands'),
  saved('e', 'politics', 'Chip treaty signed'),
];

const EMPTY_DIGEST: DayDigest = {
  date: '2026-11-10',
  label: 'Today',
  agentLog: [],
  beats: {},
};

function renderSavedView(savedItems: DigestItem[] = SAVES) {
  return render(
    <DigestGrid
      digest={EMPTY_DIGEST}
      selectedBeats={['ai-venture', 'politics', 'science']}
      isSavedViewActive={true}
      savedItems={savedItems}
    />,
  );
}

function cardCount(container: HTMLElement) {
  return container.querySelectorAll('article').length;
}

function headingText() {
  return screen.getByRole('heading', { level: 2 }).textContent || '';
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('DigestGrid saved view', () => {
  it('shows every saved dispatch before any filter is chosen', () => {
    const { container } = renderSavedView();
    expect(cardCount(container)).toBe(5);
    expect(headingText()).toContain('5');
  });

  it('renders a chip per relevant beat, with its count', () => {
    renderSavedView();
    expect(screen.getByRole('button', { name: /ALL \(5\)/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /AI & VENTURE \(3\)/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /POLITICS & POLICY \(2\)/ })).toBeTruthy();
    // Followed but nothing saved in it, so the chip exists and reads zero.
    expect(screen.getByRole('button', { name: /FRONTIER SCIENCE \(0\)/ })).toBeTruthy();
  });

  it('narrows the grid to one beat when its chip is clicked', async () => {
    const user = userEvent.setup();
    const { container } = renderSavedView();

    await user.click(screen.getByRole('button', { name: /AI & VENTURE \(3\)/ }));

    expect(cardCount(container)).toBe(3);
    expect(headingText()).toContain('3 of 5');
    expect(screen.queryByText('Antitrust filing lands')).toBeNull();
    expect(screen.getByText('Lambda raises four billion')).toBeTruthy();
  });

  it('marks the active chip as pressed and the others as not', async () => {
    const user = userEvent.setup();
    renderSavedView();

    await user.click(screen.getByRole('button', { name: /POLITICS & POLICY \(2\)/ }));

    expect(
      screen.getByRole('button', { name: /POLITICS & POLICY \(2\)/ }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      screen.getByRole('button', { name: /AI & VENTURE \(3\)/ }).getAttribute('aria-pressed'),
    ).toBe('false');
  });

  it('clears the filter when the active chip is clicked again', async () => {
    const user = userEvent.setup();
    const { container } = renderSavedView();
    const chip = screen.getByRole('button', { name: /AI & VENTURE \(3\)/ });

    await user.click(chip);
    expect(cardCount(container)).toBe(3);

    await user.click(screen.getByRole('button', { name: /AI & VENTURE \(3\)/ }));
    expect(cardCount(container)).toBe(5);
    expect(screen.getByRole('button', { name: /ALL \(5\)/ }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('explains an empty beat instead of showing a blank area', async () => {
    const user = userEvent.setup();
    const { container } = renderSavedView();

    await user.click(screen.getByRole('button', { name: /FRONTIER SCIENCE \(0\)/ }));

    expect(cardCount(container)).toBe(0);
    expect(screen.getByText('NO BOOKMARKS IN THIS BEAT')).toBeTruthy();
    expect(screen.getByRole('button', { name: /SHOW ALL SAVED/ })).toBeTruthy();
  });

  it('returns to every saved dispatch from the empty-beat escape button', async () => {
    const user = userEvent.setup();
    const { container } = renderSavedView();

    await user.click(screen.getByRole('button', { name: /FRONTIER SCIENCE \(0\)/ }));
    await user.click(screen.getByRole('button', { name: /SHOW ALL SAVED/ }));

    expect(cardCount(container)).toBe(5);
  });

  it('hides the chip row entirely when nothing is saved', () => {
    renderSavedView([]);
    expect(screen.queryByRole('button', { name: /ALL \(/ })).toBeNull();
    expect(screen.getByText('NO BOOKMARKS RECORDED')).toBeTruthy();
  });
});
