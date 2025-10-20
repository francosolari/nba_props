# Testing Guide

This document describes the testing setup and practices for the NBA Predictions application.

## Table of Contents

- [Overview](#overview)
- [Frontend Testing (Jest + React Testing Library)](#frontend-testing-jest--react-testing-library)
- [Backend Testing (Django)](#backend-testing-django)
- [Running Tests Locally](#running-tests-locally)
- [Continuous Integration](#continuous-integration)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)

## Overview

The project uses two separate testing frameworks:

- **Frontend**: Jest + React Testing Library for React components and utilities
- **Backend**: Django's built-in test framework (unittest-based) for Python code

Both test suites are automatically run on Pull Requests via GitHub Actions.

## Frontend Testing (Jest + React Testing Library)

### Setup

The frontend tests are configured using:

- **Jest**: JavaScript testing framework
- **React Testing Library**: Testing utilities for React components
- **@testing-library/jest-dom**: Custom matchers for DOM nodes
- **@testing-library/user-event**: User interaction simulation

### Configuration Files

- `jest.config.js`: Jest configuration
- `frontend/jest.setup.js`: Test environment setup
- `frontend/__mocks__/`: Mock files for assets

### Test Location

Frontend tests are located alongside their source files:

```
frontend/src/
├── components/
│   ├── __tests__/
│   │   ├── PredictionRow.test.jsx
│   │   └── CategoryIcon.test.jsx
│   ├── PredictionRow.jsx
│   └── CategoryIcon.jsx
└── utils/
    ├── __tests__/
    │   └── csrf.test.js
    └── csrf.js
```

### Running Frontend Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (useful during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode (non-interactive)
npm run test:ci
```

### Example Frontend Test

```javascript
import React from 'react';
import { render, screen } from '@testing-library/react';
import PredictionRow from '../PredictionRow';

describe('PredictionRow Component', () => {
  test('renders with required props', () => {
    render(
      <PredictionRow
        question="Who will win MVP?"
        status="pending"
      />
    );

    expect(screen.getByText('Who will win MVP?')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('0/3 pts')).toBeInTheDocument();
  });
});
```

## Backend Testing (Django)

### Setup

The backend uses Django's built-in test framework which is based on Python's unittest module.

### Test Location

Backend tests are located in the `predictions/tests/` directory:

```
backend/predictions/
├── tests/
│   ├── __init__.py
│   ├── test_basic.py
│   ├── test_models.py
│   └── test_api.py
└── ...
```

### Running Backend Tests

```bash
# Run all tests
venv/bin/python backend/manage.py test predictions.tests

# Run specific test file
venv/bin/python backend/manage.py test predictions.tests.test_basic

# Run with verbosity
venv/bin/python backend/manage.py test predictions.tests --verbosity=2

# Run tests with coverage (install coverage first: pip install coverage)
coverage run --source='backend' backend/manage.py test predictions.tests
coverage report
coverage html  # Generate HTML report
```

### Example Backend Test

```python
from django.test import TestCase
from django.contrib.auth.models import User


class BasicTestCase(TestCase):
    """Basic tests to verify test configuration."""

    def test_user_creation(self):
        """Test that we can create a user."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.assertEqual(user.username, 'testuser')
        self.assertEqual(user.email, 'test@example.com')
        self.assertTrue(user.check_password('testpass123'))
```

## Running Tests Locally

### Prerequisites

Make sure you have all dependencies installed:

```bash
# Frontend dependencies
npm install

# Backend dependencies (use virtual environment)
pip install -r backend/requirements.txt
```

### Running All Tests

```bash
# Frontend tests
npm test -- --passWithNoTests

# Backend tests
venv/bin/python backend/manage.py test predictions.tests --verbosity=2
```

## Continuous Integration

### GitHub Actions Workflow

Tests are automatically run on every Pull Request via GitHub Actions (`.github/workflows/test-pr.yml`).

The CI pipeline includes:

1. **Frontend Tests Job**
   - Runs Jest tests
   - Generates coverage report
   - Uploads coverage to Codecov (optional)

2. **Backend Tests Job**
   - Sets up PostgreSQL test database
   - Runs Django tests
   - Reports test results

3. **Lint Jobs**
   - Frontend: ESLint (optional)
   - Backend: flake8 for Python syntax errors

4. **Build Check**
   - Verifies that webpack build succeeds
   - Checks that bundle artifacts are created

5. **Summary Job**
   - Aggregates results from all jobs
   - Fails if any tests fail

### Triggering CI

Tests run automatically when you:

- Open a Pull Request to `main`, `develop`, or `feature/*` branches
- Push commits to feature branches

### Viewing Test Results

1. Go to the "Actions" tab in your GitHub repository
2. Click on the workflow run for your PR
3. View detailed logs for each job

## Writing Tests

### Frontend Testing Best Practices

1. **Test user behavior, not implementation details**
   ```javascript
   // Good
   expect(screen.getByText('Submit')).toBeInTheDocument();

   // Avoid
   expect(wrapper.find('button').prop('className')).toBe('submit-btn');
   ```

2. **Use semantic queries**
   ```javascript
   // Preferred
   screen.getByRole('button', { name: /submit/i })
   screen.getByLabelText('Username')

   // Acceptable
   screen.getByText('Submit')

   // Last resort
   screen.getByTestId('submit-button')
   ```

3. **Test accessibility**
   ```javascript
   expect(screen.getByRole('img')).toHaveAttribute('alt', 'Description');
   expect(screen.getByLabelText('Required field')).toBeRequired();
   ```

4. **Mock external dependencies**
   ```javascript
   jest.mock('axios');
   axios.get.mockResolvedValue({ data: mockData });
   ```

### Backend Testing Best Practices

1. **Use Django's TestCase for database tests**
   ```python
   from django.test import TestCase

   class ModelTestCase(TestCase):
       def setUp(self):
           # Runs before each test
           pass

       def test_model_creation(self):
           # Test code here
           pass
   ```

2. **Use fixtures for complex test data**
   ```python
   from django.test import TestCase

   class MyTest(TestCase):
       fixtures = ['test_data.json']
   ```

3. **Test API endpoints**
   ```python
   from django.test import Client

   class APITest(TestCase):
       def setUp(self):
           self.client = Client()

       def test_api_endpoint(self):
           response = self.client.get('/api/v2/endpoint/')
           self.assertEqual(response.status_code, 200)
   ```

4. **Use assertRaises for exception testing**
   ```python
   with self.assertRaises(ValidationError):
       # Code that should raise exception
       pass
   ```

## Test Coverage

### Viewing Coverage

#### Frontend Coverage

```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

#### Backend Coverage

```bash
# Install coverage tool
pip install coverage

# Run tests with coverage
coverage run --source='backend' backend/manage.py test predictions.tests

# View report in terminal
coverage report

# Generate HTML report
coverage html
open htmlcov/index.html  # macOS
```

### Coverage Goals

- **Minimum**: 60% coverage for new code
- **Target**: 80% coverage overall
- **Components**: Aim for high coverage on critical business logic
- **UI Components**: Focus on user interactions and edge cases

## Troubleshooting

### Common Issues

#### Frontend

**Issue**: Tests fail with module not found errors

```bash
# Solution: Clear Jest cache
npm test -- --clearCache
rm -rf node_modules
npm install
```

**Issue**: Tests timeout

```javascript
// Solution: Increase timeout for specific test
test('slow test', async () => {
  // test code
}, 10000); // 10 second timeout
```

#### Backend

**Issue**: Database errors during tests

```bash
# Solution: Reset test database
venv/bin/python backend/manage.py test --keepdb=false
```

**Issue**: Import errors

```bash
# Solution: Ensure DJANGO_SETTINGS_MODULE is set
export DJANGO_SETTINGS_MODULE=nba_predictions.settings
export DJANGO_DEVELOPMENT=True
```

### Getting Help

If you encounter issues:

1. Check the test output for specific error messages
2. Review the CI logs in GitHub Actions
3. Ensure all dependencies are installed
4. Verify your Python/Node versions match project requirements
5. Check that your virtual environment is activated (for Python)

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Django Testing Documentation](https://docs.djangoproject.com/en/4.2/topics/testing/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
