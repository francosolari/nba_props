# End-to-End (E2E) Tests

This directory contains end-to-end tests for the NBA Predictions application using Playwright.

## Overview

E2E tests simulate real user interactions and test critical user flows:

1. **User Registration & Login** (`user-registration.spec.js`)
   - New user signup
   - Login with valid/invalid credentials
   - Password validation
   - Session management

2. **Prediction Submission** (`prediction-submission.spec.js`)
   - Navigate to submission page
   - Fill in prediction forms
   - Drag and drop team rankings
   - Form validation
   - Successful submission

3. **Payment Flow** (`payment-flow.spec.js`)
   - Payment modal display
   - Stripe integration
   - Payment confirmation
   - Payment status verification

4. **Leaderboard** (`leaderboard.spec.js`)
   - Leaderboard loading
   - User rankings display
   - Season selection
   - User profile navigation
   - Responsive design

## Prerequisites

1. **Install Playwright**
   ```bash
   npm install -D @playwright/test playwright
   ```

2. **Install Playwright Browsers**
   ```bash
   npx playwright install
   ```

3. **Set up test environment**
   ```bash
   cp .env.e2e.example .env.e2e
   # Edit .env.e2e with your test credentials
   ```

4. **Ensure dev server is running**
   ```bash
   npm run dev
   ```

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run specific browser
```bash
npm run test:e2e:chromium
```

### Run specific test file
```bash
npx playwright test e2e/user-registration.spec.js
```

### Run specific test
```bash
npx playwright test -g "should complete full user registration process"
```

### View test report
```bash
npm run test:e2e:report
```

## Test Structure

```
e2e/
├── user-registration.spec.js   # User signup/login flows
├── prediction-submission.spec.js # Prediction creation and submission
├── payment-flow.spec.js        # Payment and confirmation
├── leaderboard.spec.js         # Leaderboard display and navigation
├── helpers/
│   └── auth.js                 # Authentication helper functions
├── fixtures/
│   └── test-data.js            # Test data and fixtures
└── README.md                   # This file
```

## Configuration

### playwright.config.js

Key configuration options:

- **baseURL**: `http://127.0.0.1:8000` (override with `BASE_URL` env var)
- **timeout**: 60 seconds per test
- **retries**: 2 on CI, 0 locally
- **browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **traces**: Captured on first retry
- **screenshots**: Taken on failure
- **videos**: Recorded on failure

### Environment Variables

Set in `.env.e2e`:

```bash
BASE_URL=http://127.0.0.1:8000
TEST_USERNAME=testuser
TEST_PASSWORD=testpassword
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

## Writing Tests

### Basic Test Structure

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    // Navigate
    await page.goto('/');

    // Interact
    await page.click('button:has-text("Click Me")');

    // Assert
    await expect(page).toHaveURL(/.*success/);
  });
});
```

### Using Auth Helpers

```javascript
const { login } = require('./helpers/auth');

test.beforeEach(async ({ page }) => {
  await login(page, 'username', 'password');
});
```

### Using Test Data

```javascript
const { generateTestUser } = require('./fixtures/test-data');

test('should register new user', async ({ page }) => {
  const user = generateTestUser();
  // ... use user.username, user.email, user.password
});
```

## Best Practices

1. **Test Independence**: Each test should be self-contained and not depend on other tests
2. **Clean Up**: Use `beforeEach` and `afterEach` hooks for setup/teardown
3. **Wait for Elements**: Use `waitForLoadState`, `waitForSelector`, or `expect().toBeVisible()`
4. **Avoid Hard Waits**: Use `waitFor*` methods instead of `page.waitForTimeout()`
5. **Use Data Attributes**: Add `data-testid` attributes for reliable selectors
6. **Handle Flakiness**: Use retries and proper wait conditions

## Debugging Tests

### Run in debug mode
```bash
npx playwright test --debug
```

### Run with UI mode (best for debugging)
```bash
npm run test:e2e:ui
```

### View trace viewer
```bash
npx playwright show-trace trace.zip
```

### Slow down execution
```bash
npx playwright test --headed --slow-mo=1000
```

## CI/CD Integration

E2E tests can be integrated into GitHub Actions:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e
  env:
    BASE_URL: http://localhost:8000
    TEST_USERNAME: ${{ secrets.TEST_USERNAME }}
    TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: playwright-report/
```

## Common Issues

### "Target page, context or browser has been closed"
- The page was closed before the test completed
- Add proper wait conditions before assertions

### "Timeout exceeded"
- Increase timeout in test or config
- Check if dev server is running
- Verify network conditions

### "Element not found"
- Check selector accuracy
- Ensure element is visible before interacting
- Use `page.waitForSelector()` before interaction

### Tests fail in CI but pass locally
- Different viewport sizes
- Different timing (add proper waits)
- Environment variables not set
- Database state differences

## Test Data Management

For integration with backend:

1. **Test Fixtures**: Use Django fixtures to populate test database
2. **Factory Pattern**: Create test users/data programmatically
3. **Teardown**: Clean up test data after tests complete
4. **Isolation**: Use separate test database

## Performance

E2E tests are slower than unit tests:

- **Single test**: ~5-30 seconds
- **Full suite**: ~5-15 minutes
- **Parallel execution**: Use `--workers` flag

Optimize by:
- Running critical paths only in CI
- Using parallel execution
- Caching authentication states
- Minimizing network requests

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)
