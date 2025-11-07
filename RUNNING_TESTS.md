# Running Tests - Quick Guide

## Running the Leaderboard API Tests

### Method 1: From project root (recommended)
```bash
# Activate virtual environment first
source venv/bin/activate

# Run all leaderboard tests
venv/bin/pytest backend/predictions/tests/test_api_leaderboard.py -v

# Run with coverage report
venv/bin/pytest backend/predictions/tests/test_api_leaderboard.py --cov=backend/predictions/api/v2/endpoints/leaderboard --cov=backend/predictions/api/v2/endpoints/ist_leaderboard --cov-report=term-missing -v

# Run specific test class
venv/bin/pytest backend/predictions/tests/test_api_leaderboard.py::TestMainLeaderboard -v

# Run specific test
venv/bin/pytest backend/predictions/tests/test_api_leaderboard.py::TestMainLeaderboard::test_leaderboard_returns_200_for_valid_season -v
```

### Method 2: From backend directory
```bash
cd backend

# Run all leaderboard tests
../venv/bin/pytest predictions/tests/test_api_leaderboard.py -v

# Run with coverage
../venv/bin/pytest predictions/tests/test_api_leaderboard.py --cov=predictions/api/v2/endpoints/leaderboard --cov=predictions/api/v2/endpoints/ist_leaderboard --cov-report=term-missing -v
```

## Troubleshooting

### Issue: Django REST Framework not found

If you get an error about Django REST Framework not being installed:

```bash
# Check if it's installed
venv/bin/pip list | grep djangorestframework

# If not installed, install it
venv/bin/pip install djangorestframework==3.16.1

# Or install all requirements
venv/bin/pip install -r backend/requirements.txt
```

### Issue: Import errors or module not found

Make sure you're running pytest from the correct directory and your `DJANGO_SETTINGS_MODULE` is set:

```bash
# From project root
export DJANGO_SETTINGS_MODULE=nba_predictions.settings
export DJANGO_DEVELOPMENT=True

# Then run tests
venv/bin/pytest backend/predictions/tests/test_api_leaderboard.py -v
```

### Issue: Database errors

If you get database connection errors:

```bash
# Make sure PostgreSQL is running
# Or set up test database settings in your .env file
```

## Running All API Tests

```bash
# Run all API tests (from project root)
venv/bin/pytest backend/predictions/tests/test_api*.py -v

# Run with coverage for all API endpoints
venv/bin/pytest backend/predictions/tests/test_api*.py --cov=backend/predictions/api -v
```

## Test Output

Successful run will show:
```
============================= test session starts ==============================
...
collected 30 items

predictions/tests/test_api_leaderboard.py::TestMainLeaderboard::test_leaderboard_returns_200_for_valid_season PASSED [  3%]
predictions/tests/test_api_leaderboard.py::TestMainLeaderboard::test_leaderboard_correct_ranking_order PASSED [  6%]
...
============================= 30 passed in 47.43s ==============================
```

## Test Coverage

To see detailed coverage report:

```bash
# Generate HTML coverage report
venv/bin/pytest backend/predictions/tests/test_api_leaderboard.py \
  --cov=backend/predictions/api/v2/endpoints/leaderboard \
  --cov=backend/predictions/api/v2/endpoints/ist_leaderboard \
  --cov-report=html \
  -v

# Open the report
open htmlcov/index.html
```

## Quick Test Run (No Coverage)

If you just want to verify tests pass without coverage calculations:

```bash
# From project root - fastest way
venv/bin/pytest backend/predictions/tests/test_api_leaderboard.py -v --no-cov
```

## Running Specific Test Scenarios

```bash
# Only main leaderboard tests
venv/bin/pytest backend/predictions/tests/test_api_leaderboard.py::TestMainLeaderboard -v

# Only IST leaderboard tests
venv/bin/pytest backend/predictions/tests/test_api_leaderboard.py::TestISTLeaderboard -v

# Stop on first failure
venv/bin/pytest backend/predictions/tests/test_api_leaderboard.py -x

# Show print statements and verbose output
venv/bin/pytest backend/predictions/tests/test_api_leaderboard.py -v -s
```

## Test File Locations

- **Leaderboard Tests**: `backend/predictions/tests/test_api_leaderboard.py`
- **Other API Tests**:
  - `backend/predictions/tests/test_api_public.py` (seasons, teams, players, homepage)
  - `backend/predictions/tests/test_api_submissions.py` (user submissions)
  - `backend/predictions/tests/test_admin_grading.py` (admin grading endpoints)

## Next Steps

After confirming tests pass, you can:

1. Run all test suites: `venv/bin/pytest backend/predictions/tests/ -v`
2. Check overall coverage: `venv/bin/pytest backend/predictions/tests/ --cov=backend/predictions --cov-report=term-missing`
3. Run in watch mode: `venv/bin/pytest-watch backend/predictions/tests/`
