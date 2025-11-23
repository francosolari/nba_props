# Test Suite Implementation Plan

## Overview

This document outlines the plan to implement comprehensive testing infrastructure for the NBA Predictions Game after merging the `feature/payments` branch to `main`. Currently, the application has no test coverage, which presents risks for future development and deployment.

**Goal**: Achieve 80%+ test coverage across backend and frontend with automated CI/CD integration.

---

## Phase 1: Backend Testing Infrastructure (Week 1-2)

### 1.1 Testing Framework Setup

**Tools**:
- `pytest` - Primary test runner
- `pytest-django` - Django integration
- `pytest-cov` - Coverage reporting
- `factory_boy` - Test data factories
- `faker` - Realistic fake data generation
- `freezegun` - Time manipulation for tests

**Installation**:
```bash
pip install pytest pytest-django pytest-cov factory-boy faker freezegun
```

**Configuration** (`backend/pytest.ini`):
```ini
[pytest]
DJANGO_SETTINGS_MODULE = nba_predictions.settings
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    --cov=predictions
    --cov=accounts
    --cov-report=html
    --cov-report=term-missing
    --cov-fail-under=80
```

### 1.2 Model Tests

**Priority: HIGH**

**Location**: `backend/predictions/tests/test_models.py`, `backend/accounts/tests/test_models.py`

**Coverage Areas**:
- Question polymorphic models (SuperlativeQuestion, PropQuestion, etc.)
- Answer creation and validation
- Payment model and status transitions
- UserStats point calculations
- Standing predictions and grading
- Season deadline validation

**Example Test Structure**:
```python
# backend/predictions/tests/test_models.py
import pytest
from predictions.models import PropQuestion, Answer, Season
from django.contrib.auth.models import User

@pytest.mark.django_db
class TestPropQuestion:
    def test_create_prop_question(self):
        season = Season.objects.create(...)
        question = PropQuestion.objects.create(
            season=season,
            question_text="Will LeBron average over 25 PPG?",
            line=25.0,
            ...
        )
        assert question.question_text == "Will LeBron average over 25 PPG?"
        assert question.line == 25.0

    def test_grade_answer_correct(self):
        # Test grading logic
        pass
```

**Estimated Time**: 3-4 days

### 1.3 API Tests

**Priority: HIGH**

**Location**: `backend/predictions/tests/test_api_v2.py`

**Coverage Areas**:
- All API v2 endpoints
- Authentication and permissions
- Request validation (Pydantic schemas)
- Response formatting
- Error handling
- Pagination

**Example Test Structure**:
```python
# backend/predictions/tests/test_api_v2.py
import pytest
from django.test import Client

@pytest.mark.django_db
class TestLeaderboardAPI:
    def test_get_leaderboard(self, client, season):
        response = client.get(f'/api/v2/leaderboard/?season_slug={season.slug}')
        assert response.status_code == 200
        assert 'leaderboard' in response.json()

    def test_leaderboard_requires_season(self, client):
        response = client.get('/api/v2/leaderboard/')
        assert response.status_code == 422
```

**Key Test Cases**:
- Homepage endpoints (game data, predictions)
- Leaderboard (regular + IST)
- User submissions (with deadline validation)
- Admin grading endpoints
- Payment endpoints (with Stripe mocking)

**Estimated Time**: 4-5 days

### 1.4 Payment Integration Tests

**Priority: CRITICAL (Security)**

**Location**: `backend/predictions/tests/test_payments.py`

**Coverage Areas**:
- Stripe webhook signature verification
- Payment creation and status tracking
- Entry fee validation
- Refund handling
- Payment failure scenarios

**Example Test Structure**:
```python
# backend/predictions/tests/test_payments.py
import pytest
from unittest.mock import patch, Mock
import stripe

@pytest.mark.django_db
class TestStripeWebhook:
    @patch('stripe.Webhook.construct_event')
    def test_webhook_payment_succeeded(self, mock_construct):
        # Mock Stripe webhook event
        mock_construct.return_value = {
            'type': 'checkout.session.completed',
            'data': {...}
        }

        response = client.post('/payments/webhook/', ...)
        assert response.status_code == 200
        # Verify payment record created
```

**Estimated Time**: 2-3 days

### 1.5 Management Command Tests

**Priority: MEDIUM**

**Location**: `backend/predictions/tests/test_commands.py`

**Coverage Areas**:
- `grade_props_answers`
- `grade_standing_predictions`
- `grade_ist_predictions`
- `update_season_standings`
- `scrape_award_odds`

**Estimated Time**: 2-3 days

---

## Phase 2: Frontend Testing Infrastructure (Week 3-4)

### 2.1 Testing Framework Setup

**Tools**:
- `Jest` - Test runner
- `@testing-library/react` - Component testing
- `@testing-library/jest-dom` - DOM matchers
- `@testing-library/user-event` - User interaction simulation
- `MSW (Mock Service Worker)` - API mocking

**Installation**:
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event msw
```

**Configuration** (`frontend/jest.config.js`):
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/index.jsx',
    '!src/**/*.test.{js,jsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

### 2.2 Component Tests

**Priority: HIGH**

**Coverage Areas**:
- `HomePage.jsx` - Game data rendering, prediction preview
- `LeaderboardPage.jsx` - User rankings, filtering
- `SubmissionsPage.jsx` - Form submission, validation
- `AdminGradingPanel.jsx` - Grading interface
- `StripePaymentModal.jsx` - Payment flow

**Example Test Structure**:
```javascript
// frontend/src/pages/__tests__/LeaderboardPage.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LeaderboardPage from '../LeaderboardPage';
import { server } from '../../mocks/server';

describe('LeaderboardPage', () => {
  it('displays leaderboard data', async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <LeaderboardPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Leaderboard/i)).toBeInTheDocument();
    });

    expect(screen.getByText('User1')).toBeInTheDocument();
    expect(screen.getByText('100 pts')).toBeInTheDocument();
  });
});
```

**Estimated Time**: 5-6 days

### 2.3 Hook Tests

**Priority: MEDIUM**

**Location**: `frontend/src/hooks/__tests__/`

**Coverage Areas**:
- `useLeaderboard.js`
- `useSubmissions.js`
- `usePaymentStatus.js`
- `useAdminQuestions.js`

**Estimated Time**: 2-3 days

### 2.4 API Mocking Setup

**Priority: HIGH**

**Location**: `frontend/src/mocks/`

**Setup MSW handlers**:
```javascript
// frontend/src/mocks/handlers.js
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/v2/leaderboard/', (req, res, ctx) => {
    return res(
      ctx.json({
        leaderboard: [
          { username: 'User1', points: 100, rank: 1 },
          { username: 'User2', points: 95, rank: 2 },
        ],
      })
    );
  }),
  // Add more handlers...
];
```

**Estimated Time**: 2-3 days

---

## Phase 3: Integration & E2E Tests (Week 5)

### 3.1 Integration Tests

**Priority: MEDIUM**

**Coverage Areas**:
- End-to-end user flows (signup → submit predictions → view leaderboard)
- Payment flow (create session → complete payment → verify access)
- Admin workflow (create questions → grade answers → update leaderboard)

**Estimated Time**: 3-4 days

### 3.2 E2E Tests with Playwright

**Priority: LOW (Optional for v1)**

**Tool**: Playwright

**Key Scenarios**:
- User registration and login
- Complete prediction submission
- Payment checkout
- Admin grading workflow

**Estimated Time**: 3-5 days (optional)

---

## Phase 4: CI/CD Integration (Week 6)

### 4.1 Updated CI/CD Workflow

**File**: `.github/workflows/ci-cd-with-tests.yml`

**Jobs**:
1. **Backend Tests**: Run pytest with coverage
2. **Frontend Tests**: Run Jest with coverage
3. **Linting**: flake8 (backend) + ESLint (frontend)
4. **Build**: Docker image build (only if tests pass)
5. **Deploy**: Blue-green deployment (only on main branch)

**Example Workflow**:
```yaml
name: CI/CD with Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:latest
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install -r backend/requirements.txt
          pip install pytest pytest-django pytest-cov

      - name: Run tests
        run: |
          cd backend
          pytest --cov --cov-fail-under=80

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  frontend-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --coverage --watchAll=false

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    needs: [backend-tests, frontend-tests]
    # ... rest of build job
```

### 4.2 Coverage Reporting

**Tool**: Codecov or Coveralls

**Setup**:
1. Add repository to Codecov
2. Add `CODECOV_TOKEN` to GitHub secrets
3. View coverage reports in PRs

**Estimated Time**: 1-2 days

---

## Implementation Schedule

| Phase | Tasks | Duration | Dependencies |
|-------|-------|----------|--------------|
| Phase 1.1 | Backend testing setup | 1 day | None |
| Phase 1.2 | Model tests | 3-4 days | Phase 1.1 |
| Phase 1.3 | API tests | 4-5 days | Phase 1.1 |
| Phase 1.4 | Payment tests | 2-3 days | Phase 1.1 |
| Phase 1.5 | Command tests | 2-3 days | Phase 1.1 |
| Phase 2.1 | Frontend testing setup | 1 day | None |
| Phase 2.2 | Component tests | 5-6 days | Phase 2.1 |
| Phase 2.3 | Hook tests | 2-3 days | Phase 2.1 |
| Phase 2.4 | API mocking | 2-3 days | Phase 2.1 |
| Phase 3.1 | Integration tests | 3-4 days | Phases 1 & 2 |
| Phase 3.2 | E2E tests (optional) | 3-5 days | Phase 3.1 |
| Phase 4.1 | CI/CD integration | 1-2 days | Phases 1-3 |
| Phase 4.2 | Coverage reporting | 1 day | Phase 4.1 |

**Total Estimated Time**: 4-6 weeks (without E2E), 5-7 weeks (with E2E)

---

## Success Metrics

1. **Coverage**: 80%+ backend, 70%+ frontend
2. **CI/CD**: All tests passing on every PR
3. **Performance**: Test suite completes in < 10 minutes
4. **Reliability**: 0 flaky tests
5. **Maintainability**: Clear test structure and documentation

---

## Priority Order

1. **CRITICAL**: Payment integration tests (security)
2. **HIGH**: API endpoint tests (stability)
3. **HIGH**: Model tests (data integrity)
4. **HIGH**: Core component tests (user experience)
5. **MEDIUM**: Management command tests
6. **MEDIUM**: Hook tests
7. **MEDIUM**: Integration tests
8. **LOW**: E2E tests (can be added later)

---

## Next Steps After This Plan

1. **Merge PR #19** (feature/payments → main)
2. **Create GitHub Issue** for test suite implementation (link to this plan)
3. **Assign developers** to phases
4. **Set up project board** for tracking
5. **Schedule code review sessions** for test PR reviews
6. **Begin Phase 1.1** immediately after merge

---

## Notes

- This plan assumes 1 full-time developer or 2 part-time developers
- Phases 1 and 2 can be done in parallel by different developers
- Consider TDD (Test-Driven Development) for all new features going forward
- Test suite should be reviewed and updated with each major feature
- Set up pre-commit hooks to run tests locally before pushing

---

**Document Version**: 1.0
**Last Updated**: 2025-11-02
**Author**: Claude Code
**Status**: Ready for Implementation
