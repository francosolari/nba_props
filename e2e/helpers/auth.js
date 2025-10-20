// e2e/helpers/auth.js
// Authentication helper functions

/**
 * Login helper for E2E tests
 * @param {Page} page - Playwright page object
 * @param {string} username - Username or email
 * @param {string} password - Password
 */
async function login(page, username, password) {
  await page.goto('/accounts/login/');
  await page.fill('input[name="login"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for redirect after login
  await page.waitForURL(/.*\//, { timeout: 10000 });

  // Verify login was successful
  const isLoggedIn = await page.locator('text=Log Out').isVisible({ timeout: 5000 }).catch(() => false);

  if (!isLoggedIn) {
    throw new Error('Login failed - user not authenticated');
  }

  return true;
}

/**
 * Logout helper for E2E tests
 * @param {Page} page - Playwright page object
 */
async function logout(page) {
  const logoutButton = page.locator('text=Log Out').or(
    page.locator('[href*="logout"]')
  ).first();

  const isVisible = await logoutButton.isVisible({ timeout: 5000 }).catch(() => false);

  if (isVisible) {
    await logoutButton.click();
    await page.waitForURL(/.*\//, { timeout: 5000 });
  }
}

/**
 * Create a new test user
 * @param {Page} page - Playwright page object
 * @param {Object} userData - User data (username, email, password)
 */
async function createTestUser(page, userData = {}) {
  const timestamp = Date.now();
  const user = {
    username: userData.username || `testuser_${timestamp}`,
    email: userData.email || `testuser_${timestamp}@example.com`,
    password: userData.password || 'TestPassword123!',
  };

  await page.goto('/accounts/signup/');
  await page.fill('input[name="username"]', user.username);
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password1"]', user.password);
  await page.fill('input[name="password2"]', user.password);
  await page.click('button[type="submit"]');

  // Wait for successful registration
  await page.waitForURL(/.*\//, { timeout: 10000 });

  return user;
}

/**
 * Check if user is authenticated
 * @param {Page} page - Playwright page object
 */
async function isAuthenticated(page) {
  return await page.locator('text=Log Out').isVisible({ timeout: 2000 }).catch(() => false);
}

module.exports = {
  login,
  logout,
  createTestUser,
  isAuthenticated,
};
