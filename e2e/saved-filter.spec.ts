import { test, expect, type Page } from '@playwright/test';

/**
 * System test: a real browser, the real app, the real SAVED view.
 *
 * Unlike the integration test, nothing is mounted directly. The test seeds
 * localStorage the way the product itself would after a reader picks beats and
 * bookmarks stories, then clicks through the actual interface. It is therefore
 * the only level that would notice if the SAVED pill stopped opening the view.
 */

type Beat = 'ai-venture' | 'politics' | 'science';

function dispatch(id: string, beat: Beat, headline: string) {
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

const SAVES = [
  dispatch('a', 'ai-venture', 'Lambda raises four billion'),
  dispatch('b', 'ai-venture', 'GitHub ships agent reviews'),
  dispatch('c', 'ai-venture', 'Scaling laws hold for retrieval'),
  dispatch('d', 'politics', 'Antitrust filing lands'),
  dispatch('e', 'politics', 'Chip treaty signed'),
];

/**
 * Put a reader's beats and bookmarks in place before the app boots, so the
 * first-visit beat picker stays shut and the saved view has something in it.
 */
async function seedReader(page: Page) {
  await page.addInitScript(
    ([beats, saves]) => {
      localStorage.setItem('nexus-beats', JSON.stringify(beats));
      for (const item of saves as { id: string }[]) {
        localStorage.setItem(`nexus-saved-${item.id}`, JSON.stringify(item));
      }
    },
    [['ai-venture', 'politics', 'science'], SAVES] as const,
  );
}

async function openSavedView(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Toggle saved items view/i }).click();
  await expect(page.getByRole('heading', { level: 2 })).toContainText('Bookmarked Dispatches');
}

test.describe('filtering saved dispatches by beat', () => {
  test.beforeEach(async ({ page }) => {
    await seedReader(page);
  });

  test('a reader can narrow their saved dispatches to one beat', async ({ page }) => {
    await openSavedView(page);

    // Everything is there to begin with.
    await expect(page.locator('article')).toHaveCount(5);

    await page.getByRole('button', { name: /AI & VENTURE/i }).click();

    await expect(page.locator('article')).toHaveCount(3);
    await expect(page.getByRole('heading', { level: 2 })).toContainText('3 of 5');
    await expect(page.getByText('Lambda raises four billion')).toBeVisible();
    await expect(page.getByText('Antitrust filing lands')).toHaveCount(0);
  });

  test('clicking the active beat again brings everything back', async ({ page }) => {
    await openSavedView(page);

    const chip = page.getByRole('button', { name: /AI & VENTURE/i });
    await chip.click();
    await expect(page.locator('article')).toHaveCount(3);

    await chip.click();
    await expect(page.locator('article')).toHaveCount(5);
  });

  test('a followed beat with no saves explains itself instead of going blank', async ({ page }) => {
    await openSavedView(page);

    await page.getByRole('button', { name: /FRONTIER SCIENCE/i }).click();

    await expect(page.locator('article')).toHaveCount(0);
    await expect(page.getByText('NO BOOKMARKS IN THIS BEAT')).toBeVisible();
    await expect(page.getByRole('button', { name: /SHOW ALL SAVED/i })).toBeVisible();
  });
});
