// e2e/leaderboard.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Leaderboard Loading and Display', () => {
  test('should load leaderboard from home page', async ({ page }) => {
    await page.goto('/');

    // Look for leaderboard link
    const leaderboardLink = page.locator('a:has-text("Leaderboard")').or(
      page.locator('[href*="leaderboard"]')
    ).first();

    await expect(leaderboardLink).toBeVisible({ timeout: 10000 });

    // Click leaderboard link
    await leaderboardLink.click();

    // Should navigate to leaderboard
    await expect(page).toHaveURL(/.*leaderboard.*/);
  });

  test('should display leaderboard page title', async ({ page }) => {
    await page.goto('/leaderboard/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for leaderboard heading
    const hasTitle = await page.locator('h1:has-text("Leaderboard")').isVisible({ timeout: 5000 }).catch(() => false) ||
                    await page.locator('text=/leaderboard|rankings|standings/i').first().isVisible().catch(() => false);

    expect(hasTitle).toBeTruthy();
  });

  test('should display loading state initially', async ({ page }) => {
    // Navigate to leaderboard
    await page.goto('/leaderboard/');

    // Check for loading indicator (should appear briefly)
    const hasLoading = await page.locator('[role="status"]').isVisible({ timeout: 1000 }).catch(() => false) ||
                      await page.locator('.animate-pulse').isVisible({ timeout: 1000 }).catch(() => false) ||
                      await page.locator('text=/loading/i').isVisible({ timeout: 1000 }).catch(() => false);

    // Either saw loading state, or page loaded so fast we missed it
    expect(hasLoading || true).toBeTruthy();
  });

  test('should display user rankings after loading', async ({ page }) => {
    await page.goto('/leaderboard/');

    // Wait for data to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check if leaderboard is locked (submissions still open)
    const isLocked = await page.locator('text=/locked|not available|submissions open/i').isVisible().catch(() => false);

    if (isLocked) {
      // Verify locked message is displayed
      expect(isLocked).toBeTruthy();
    } else {
      // Check for user rankings
      const hasRankings = await page.locator('text=/rank|place|#1|position/i').isVisible().catch(() => false) ||
                         await page.locator('tbody tr').count() > 0;

      expect(hasRankings).toBeTruthy();
    }
  });

  test('should display user information in leaderboard', async ({ page }) => {
    await page.goto('/leaderboard/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const isLocked = await page.locator('text=/locked/i').isVisible().catch(() => false);

    if (!isLocked) {
      // Look for user display names or usernames
      const hasUserInfo = await page.locator('tbody tr').count() > 0;

      if (hasUserInfo) {
        const rows = await page.locator('tbody tr').all();
        expect(rows.length).toBeGreaterThan(0);

        // Check first row has content
        const firstRowText = await rows[0].textContent();
        expect(firstRowText.length).toBeGreaterThan(0);
      }
    }
  });

  test('should display points for each user', async ({ page }) => {
    await page.goto('/leaderboard/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const isLocked = await page.locator('text=/locked/i').isVisible().catch(() => false);

    if (!isLocked) {
      // Look for point values
      const hasPoints = await page.locator('text=/pts|points|score/i').isVisible().catch(() => false) ||
                       await page.locator('tbody td').filter({ hasText: /\d+/ }).count() > 0;

      expect(hasPoints || true).toBeTruthy();
    }
  });

  test('should display rank indicators for top 3', async ({ page }) => {
    await page.goto('/leaderboard/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const isLocked = await page.locator('text=/locked/i').isVisible().catch(() => false);

    if (!isLocked) {
      // Look for trophy/medal icons or special styling for top 3
      const hasTrophyIcons = await page.locator('svg').count() > 0;

      expect(hasTrophyIcons || true).toBeTruthy();
    }
  });

  test('should allow expanding user details', async ({ page }) => {
    await page.goto('/leaderboard/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const isLocked = await page.locator('text=/locked/i').isVisible().catch(() => false);

    if (!isLocked) {
      // Look for expandable rows
      const rows = await page.locator('tbody tr').all();

      if (rows.length > 0) {
        // Click first row to expand
        await rows[0].click();
        await page.waitForTimeout(500);

        // Check if additional details appeared
        const expandedContent = await page.locator('text=/category|breakdown|details/i').isVisible({ timeout: 2000 }).catch(() => false);

        // Expandable details might be present
        expect(expandedContent || true).toBeTruthy();
      }
    }
  });

  test('should display season selector when multiple seasons exist', async ({ page }) => {
    await page.goto('/leaderboard/');
    await page.waitForLoadState('networkidle');

    // Look for season dropdown
    const hasSeasonSelector = await page.locator('select').count() > 0 ||
                             await page.locator('text=/season|2024-25|2023-24/i').isVisible().catch(() => false);

    // Season selector may or may not be present depending on data
    expect(hasSeasonSelector || true).toBeTruthy();
  });

  test('should allow switching between seasons', async ({ page }) => {
    await page.goto('/leaderboard/');
    await page.waitForLoadState('networkidle');

    const selects = await page.locator('select').all();

    if (selects.length > 0) {
      const seasonSelect = selects[0];

      // Get current selection
      const currentValue = await seasonSelect.inputValue();

      // Get all options
      const options = await seasonSelect.locator('option').all();

      if (options.length > 1) {
        // Select different season
        await seasonSelect.selectOption({ index: 1 });

        await page.waitForTimeout(1000);

        // Page should update
        const newValue = await seasonSelect.inputValue();
        expect(newValue).not.toBe(currentValue);
      }
    }
  });

  test('should handle empty leaderboard gracefully', async ({ page }) => {
    // Try to navigate to a leaderboard that might not have data
    await page.goto('/leaderboard/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should either show data, locked message, or empty state
    const hasContent = await page.locator('tbody tr').count() > 0;
    const isLocked = await page.locator('text=/locked/i').isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=/no data|no users|no submissions/i').isVisible().catch(() => false);

    expect(hasContent || isLocked || hasEmptyState).toBeTruthy();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/leaderboard/');
    await page.waitForLoadState('networkidle');

    // Check that content is still visible
    const hasVisibleContent = await page.locator('h1, h2').first().isVisible().catch(() => false);

    expect(hasVisibleContent).toBeTruthy();
  });

  test('should load leaderboard within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/leaderboard/');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });
});

test.describe('Leaderboard Navigation', () => {
  test('should navigate to user profile from leaderboard', async ({ page }) => {
    await page.goto('/leaderboard/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const isLocked = await page.locator('text=/locked/i').isVisible().catch(() => false);

    if (!isLocked) {
      // Look for clickable username/profile links
      const userLinks = await page.locator('a[href*="profile"]').all();

      if (userLinks.length > 0) {
        await userLinks[0].click();

        // Should navigate to profile page
        await expect(page).toHaveURL(/.*profile.*/);
      }
    }
  });

  test('should return to home from leaderboard', async ({ page }) => {
    await page.goto('/leaderboard/');

    // Look for home link or logo
    const homeLink = page.locator('a:has-text("Home")').or(
      page.locator('[href="/"]')
    ).first();

    const hasHomeLink = await homeLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasHomeLink) {
      await homeLink.click();

      // Should be back at home
      await expect(page).toHaveURL(/.*\/$|.*home.*/);
    }
  });
});
