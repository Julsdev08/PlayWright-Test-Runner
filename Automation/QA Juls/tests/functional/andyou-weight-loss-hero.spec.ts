import { expect, test } from '../../fixtures/qa-test';

const heroHeading = 'Lose weight with a plan made for you';

test.describe('Homepage weight-loss hero', () => {
  test('ANDYOU-WL-001 Get started opens a working intake quiz @regression @desktop', {
    annotation: [
      {
        type: 'jam:title',
        description: 'Homepage weight-loss “Get started” CTA opens a 404 instead of the intake quiz'
      },
      {
        type: 'jam:steps',
        description: [
          '1. Open the &you staging homepage.',
          '2. Scroll to the “Lose weight with a plan made for you” section.',
          '3. Select the primary “Get started” CTA.',
          '4. Observe the destination page.'
        ].join('\n')
      },
      {
        type: 'jam:expected',
        description: 'The CTA opens a functioning weight-loss intake questionnaire.'
      },
      {
        type: 'jam:actual',
        description: 'The CTA navigates to `/quiz/wl-intake`, which renders the site’s “Page not found” screen with the document title `404`.'
      },
      {
        type: 'jam:fix',
        description: 'Restore the `/quiz/wl-intake` route and its intake experience, or update this CTA to the current working intake URL. Add a route-level regression check so the primary CTA cannot resolve to a 404.'
      }
    ]
  }, async ({ page, safeBaseURL }) => {
    await page.goto(safeBaseURL, { waitUntil: 'domcontentloaded' });

    const hero = page
      .getByRole('heading', { name: heroHeading, exact: true })
      .locator('xpath=ancestor::section[1]');
    const getStarted = hero.getByRole('link', { name: 'Get started', exact: true });

    await expect(hero).toBeVisible();
    await expect(getStarted).toHaveAttribute('href', '/quiz/wl-intake');
    await getStarted.click();

    await expect(page).toHaveURL(/\/quiz\/wl-intake\/?$/);
    await expect(page, 'The weight-loss Get started CTA should open a functioning intake quiz, not a 404 page.').not.toHaveTitle(/^404$/i);
    await expect(page.getByText('Page not found', { exact: true })).toHaveCount(0);
  });

  test("ANDYOU-WL-002 See if you're eligible opens weight-loss details @smoke @desktop", async ({ page, safeBaseURL }) => {
    await page.goto(safeBaseURL, { waitUntil: 'domcontentloaded' });

    const hero = page
      .getByRole('heading', { name: heroHeading, exact: true })
      .locator('xpath=ancestor::section[1]');
    const eligibility = hero.getByRole('link', { name: "See if you're eligible", exact: true });

    await expect(eligibility).toHaveAttribute('href', '/pages/weight-loss');
    await eligibility.click();

    await expect(page).toHaveURL(/\/pages\/weight-loss\/?$/);
    await expect(page.getByRole('heading', { name: 'Prescription weight loss treatments', exact: true })).toBeVisible();
  });
});
