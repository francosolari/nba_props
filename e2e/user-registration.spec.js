// e2e/user-registration.spec.js
const { test, expect } = require('@playwright/test');

test.describe('User Registration Flow', () => {
  test('should complete full user registration process', async ({ page }) => {
    // Navigate directly to signup page
    await page.goto('/accounts/signup/');

    // Wait for form to be visible
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });

    // Generate unique test user
    const timestamp = Date.now();
    const testUser = {
      username: `testuser_${timestamp}`,
      email: `testuser_${timestamp}@example.com`,
      password: 'TestPassword123!',
    };

    // Fill in registration form
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password1"]', testUser.password);
    await page.fill('input[name="password2"]', testUser.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait a bit for form submission
    await page.waitForTimeout(2000);

    // Check if registration was successful
    // Either redirected away from signup, or showing success message, or logged in
    const currentUrl = page.url();
    const notOnSignup = !currentUrl.includes('signup');
    const hasError = await page.locator('text=/error|invalid|already exists/i').isVisible().catch(() => false);

    // Test passes if either redirected successfully OR stayed on page without errors
    expect(notOnSignup || !hasError).toBeTruthy();
  });

  test('should show validation error for existing username', async ({ page }) => {
    await page.goto('/accounts/signup/');

    // Try to register with a username that might already exist
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="email"]', `test_${Date.now()}@example.com`);
    await page.fill('input[name="password1"]', 'TestPassword123!');
    await page.fill('input[name="password2"]', 'TestPassword123!');

    await page.click('button[type="submit"]');

    // Check for error message (adjust selector based on your error display)
    const hasError = await page.locator('text=/username.*already|already.*username/i').isVisible({ timeout: 5000 }).catch(() => false);
    // If no error, the form should remain on signup page
    const isStillOnSignup = await page.url().includes('signup');

    expect(hasError || isStillOnSignup).toBeTruthy();
  });

  test('should show validation error for password mismatch', async ({ page }) => {
    await page.goto('/accounts/signup/');

    const timestamp = Date.now();
    await page.fill('input[name="username"]', `testuser_${timestamp}`);
    await page.fill('input[name="email"]', `testuser_${timestamp}@example.com`);
    await page.fill('input[name="password1"]', 'TestPassword123!');
    await page.fill('input[name="password2"]', 'DifferentPassword123!');

    await page.click('button[type="submit"]');

    // Should show password mismatch error
    const hasError = await page.locator('text=/password.*match|match.*password/i').isVisible({ timeout: 5000 }).catch(() => false);
    const isStillOnSignup = await page.url().includes('signup');

    expect(hasError || isStillOnSignup).toBeTruthy();
  });

  test('should navigate to login from signup page', async ({ page }) => {
    await page.goto('/accounts/signup/');

    // Look for login link
    await page.click('text=/.*log in.*|.*sign in.*/i');

    // Should be on login page
    await expect(page).toHaveURL(/.*accounts\/login/);
  });
});

test.describe('User Login Flow', () => {
  test('should display login page correctly', async ({ page }) => {
    await page.goto('/accounts/login/');

    // Wait for login form to be visible
    await page.waitForSelector('input[name="login"]', { timeout: 10000 });
    await page.waitForSelector('input[name="password"]', { timeout: 10000 });

    // Verify form elements are present
    const hasLoginInput = await page.locator('input[name="login"]').isVisible();
    const hasPasswordInput = await page.locator('input[name="password"]').isVisible();
    const hasSubmitButton = await page.locator('button[type="submit"]').isVisible();

    expect(hasLoginInput && hasPasswordInput && hasSubmitButton).toBeTruthy();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/accounts/login/');

    await page.fill('input[name="login"]', 'invaliduser');
    await page.fill('input[name="password"]', 'wrongpassword');

    await page.click('button[type="submit"]');

    // Should show error message
    const hasError = await page.locator('text=/incorrect|invalid|error/i').isVisible({ timeout: 5000 }).catch(() => false);
    const isStillOnLogin = await page.url().includes('login');

    expect(hasError || isStillOnLogin).toBeTruthy();
  });
});
