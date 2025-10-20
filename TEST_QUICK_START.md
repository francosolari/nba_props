# Testing Quick Start Guide

Quick reference for running tests in the NBA Predictions app.

## Run All Tests

```bash
# Frontend tests
npm test

# Backend tests
venv/bin/python backend/manage.py test predictions.tests
```

## Frontend Tests (Jest + React Testing Library)

```bash
# Run once
npm test

# Watch mode (auto-rerun on file changes)
npm run test:watch

# With coverage report
npm run test:coverage

# CI mode (used by GitHub Actions)
npm run test:ci
```

### Test File Locations
- Components: `frontend/src/components/__tests__/*.test.jsx`
- Utils: `frontend/src/utils/__tests__/*.test.js`
- Hooks: `frontend/src/hooks/__tests__/*.test.js`

## Backend Tests (Django)

```bash
# All tests
venv/bin/python backend/manage.py test predictions.tests

# Specific test file
venv/bin/python backend/manage.py test predictions.tests.test_basic

# With detailed output
venv/bin/python backend/manage.py test predictions.tests --verbosity=2

# Keep test database (faster for repeated runs)
venv/bin/python backend/manage.py test predictions.tests --keepdb
```

### Test File Locations
- All tests: `backend/predictions/tests/*.py`

## Writing New Tests

### Frontend Component Test Template

```javascript
// frontend/src/components/__tests__/MyComponent.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  test('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Backend Test Template

```python
# backend/predictions/tests/test_my_feature.py
from django.test import TestCase

class MyFeatureTestCase(TestCase):
    def setUp(self):
        # Setup code runs before each test
        pass

    def test_feature_works(self):
        # Test code here
        self.assertEqual(1 + 1, 2)
```

## GitHub Actions CI

Tests run automatically on every Pull Request:

- **Frontend Tests**: Jest with coverage
- **Backend Tests**: Django tests with PostgreSQL
- **Lint Checks**: ESLint (frontend) and flake8 (backend)
- **Build Check**: Webpack production build

View results in the "Actions" tab of your GitHub repository.

## Common Commands

```bash
# Install all dependencies
npm install
pip install -r backend/requirements.txt

# Run linters
flake8 backend --select=E9,F63,F7,F82  # Python syntax errors
npm run lint  # (if configured)

# Build frontend
npm run build

# Check coverage
npm run test:coverage          # Frontend
coverage run backend/manage.py test predictions.tests  # Backend
coverage report
```

## Troubleshooting

**Tests not found?**
- Frontend: Make sure test files end with `.test.js` or `.test.jsx`
- Backend: Make sure test files start with `test_` and are in `predictions/tests/`

**Module not found errors?**
```bash
npm install  # Frontend
pip install -r backend/requirements.txt  # Backend
```

**Jest cache issues?**
```bash
npm test -- --clearCache
```

**Database errors in Django tests?**
```bash
venv/bin/python backend/manage.py test --keepdb=false
```

For more detailed information, see [TESTING.md](TESTING.md).
