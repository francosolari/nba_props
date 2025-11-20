# 12 - Testing

**Part of:** AI Assistant Documentation
**Load when:** Writing tests, running tests, or debugging test failures

## Table of Contents
- [Testing Strategy](#testing-strategy)
- [Backend Testing (pytest)](#backend-testing-pytest)
- [Frontend Testing (Jest)](#frontend-testing-jest)
- [Running Tests](#running-tests)
- [Test Data & Fixtures](#test-data--fixtures)
- [Continuous Integration](#continuous-integration)

## Testing Strategy

### Testing Pyramid

```
        ┌─────────────┐
        │     E2E     │  Few, critical user flows
        └─────────────┘
      ┌───────────────────┐
      │   Integration     │  API endpoints, DB queries
      └───────────────────┘
    ┌─────────────────────────┐
    │      Unit Tests         │  Models, utilities, helpers
    └─────────────────────────┘
```

### What to Test

**Backend:**
- Model methods and properties
- API endpoints (inputs, outputs, auth)
- Business logic in services
- Management commands
- Custom validators

**Frontend:**
- Component rendering
- User interactions
- Custom hooks
- Utility functions
- API integration (mocked)

## Backend Testing (pytest)

### Setup

```bash
# Install pytest and plugins
pip install pytest pytest-django pytest-cov

# Configuration in backend/pytest.ini or backend/setup.cfg
[tool:pytest]
DJANGO_SETTINGS_MODULE = nba_predictions.settings
python_files = tests.py test_*.py *_tests.py
```

### Test Structure

```
backend/
└── predictions/
    └── tests/
        ├── __init__.py
        ├── conftest.py           # Shared fixtures
        ├── test_models.py        # Model tests
        ├── test_api.py           # API tests
        ├── test_commands.py      # Management command tests
        └── test_services.py      # Service tests
```

### Model Tests

```python
# backend/predictions/tests/test_models.py
import pytest
from predictions.models import Season, Question, SuperlativeQuestion, Award

@pytest.mark.django_db
class TestSeasonModel:
    def test_create_season(self):
        season = Season.objects.create(
            name="2024-25",
            slug="2024-25",
            start_date="2024-10-01",
            end_date="2025-06-30"
        )
        assert season.name == "2024-25"
        assert season.is_active is True

    def test_season_str(self):
        season = Season.objects.create(
            name="2024-25",
            slug="2024-25",
            start_date="2024-10-01",
            end_date="2025-06-30"
        )
        assert str(season) == "2024-25"


@pytest.mark.django_db
class TestQuestionPolymorphism:
    def test_superlative_question_inheritance(self):
        season = Season.objects.create(
            name="2024-25",
            slug="2024-25",
            start_date="2024-10-01",
            end_date="2025-06-30"
        )
        award = Award.objects.create(name="MVP", season=season)

        # Create SuperlativeQuestion
        question = SuperlativeQuestion.objects.create(
            season=season,
            text="Who will win MVP?",
            award=award,
            point_value=1.0
        )

        # Query through base model
        all_questions = Question.objects.filter(season=season)
        assert all_questions.count() == 1

        # Get real instance
        real_question = all_questions.first().get_real_instance()
        assert isinstance(real_question, SuperlativeQuestion)
        assert real_question.award.name == "MVP"
```

### API Tests

```python
# backend/predictions/tests/test_api.py
import pytest
from django.contrib.auth import get_user_model
from predictions.models import Season, Player

User = get_user_model()

@pytest.mark.django_db
class TestPlayersAPI:
    def test_list_players(self, client):
        # Create test data
        Player.objects.create(name="LeBron James", position="SF")
        Player.objects.create(name="Kevin Durant", position="PF")

        # Make request
        response = client.get('/api/v2/players/')

        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]['name'] == "LeBron James"

    def test_create_player_requires_auth(self, client):
        response = client.post('/api/v2/players/', {
            'name': 'Test Player',
            'position': 'PG'
        })
        assert response.status_code == 401  # Unauthorized

    def test_create_player_authenticated(self, authenticated_client):
        response = authenticated_client.post('/api/v2/players/', {
            'name': 'Test Player',
            'position': 'PG',
            'team_id': 1
        })
        assert response.status_code == 201
        data = response.json()
        assert data['name'] == 'Test Player'
```

### Fixtures

```python
# backend/predictions/tests/conftest.py
import pytest
from django.contrib.auth import get_user_model
from predictions.models import Season, Team

User = get_user_model()

@pytest.fixture
def user():
    """Create a test user"""
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )

@pytest.fixture
def staff_user():
    """Create a staff user"""
    return User.objects.create_user(
        username='admin',
        email='admin@example.com',
        password='adminpass123',
        is_staff=True
    )

@pytest.fixture
def authenticated_client(client, user):
    """Client with authenticated user"""
    client.force_login(user)
    return client

@pytest.fixture
def season():
    """Create a test season"""
    return Season.objects.create(
        name="2024-25",
        slug="2024-25",
        start_date="2024-10-01",
        end_date="2025-06-30"
    )

@pytest.fixture
def team():
    """Create a test team"""
    return Team.objects.create(
        name="Los Angeles Lakers",
        abbreviation="LAL",
        conference="West",
        division="Pacific"
    )
```

### Service Tests

```python
# backend/predictions/tests/test_services.py
import pytest
from predictions.api.common.services.answer_lookup_service import AnswerLookupService
from predictions.models import Player, Team

@pytest.mark.django_db
class TestAnswerLookupService:
    def test_normalize_answer(self):
        service = AnswerLookupService()

        # Test case normalization
        assert service.normalize("LeBron James") == "lebron james"
        assert service.normalize("  KEVIN DURANT  ") == "kevin durant"

    def test_player_lookup(self, team):
        # Create player
        player = Player.objects.create(
            name="LeBron James",
            team=team,
            position="SF"
        )

        service = AnswerLookupService()

        # Exact match
        assert service.lookup_player("LeBron James") == player

        # Case insensitive
        assert service.lookup_player("lebron james") == player

        # Not found
        assert service.lookup_player("Nonexistent Player") is None
```

## Frontend Testing (Jest)

### Setup

```bash
# Install Jest and testing library
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Configuration in package.json or jest.config.js
{
  "jest": {
    "testEnvironment": "jsdom",
    "setupFilesAfterEnv": ["<rootDir>/frontend/src/setupTests.js"]
  }
}
```

### Test Structure

```
frontend/src/
├── components/
│   ├── Leaderboard.jsx
│   └── Leaderboard.test.jsx
├── hooks/
│   ├── useLeaderboard.js
│   └── useLeaderboard.test.js
└── utils/
    ├── helpers.js
    └── helpers.test.js
```

### Component Tests

```javascript
// frontend/src/components/Leaderboard.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Leaderboard from './Leaderboard';

describe('Leaderboard', () => {
  const mockData = [
    { user_id: 1, username: 'Alice', points: 10.5 },
    { user_id: 2, username: 'Bob', points: 8.0 },
  ];

  test('renders leaderboard data', () => {
    render(<Leaderboard data={mockData} />);

    // Check headers
    expect(screen.getByText('Rank')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Points')).toBeInTheDocument();

    // Check data
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('10.5')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('8.0')).toBeInTheDocument();
  });

  test('renders correct ranks', () => {
    render(<Leaderboard data={mockData} />);

    const ranks = screen.getAllByTestId('rank');
    expect(ranks[0]).toHaveTextContent('1');
    expect(ranks[1]).toHaveTextContent('2');
  });

  test('handles empty data', () => {
    render(<Leaderboard data={[]} />);
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });
});
```

### Hook Tests

```javascript
// frontend/src/hooks/useLeaderboard.test.js
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLeaderboard } from './useLeaderboard';

// Mock fetch
global.fetch = jest.fn();

describe('useLeaderboard', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  test('fetches leaderboard data', async () => {
    const mockData = {
      leaderboard: [
        { user_id: 1, username: 'Alice', points: 10 },
      ],
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useLeaderboard('2024-25'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockData);
    expect(fetch).toHaveBeenCalledWith('/api/v2/leaderboard/2024-25/');
  });

  test('handles errors', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useLeaderboard('2024-25'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});
```

### Utility Tests

```javascript
// frontend/src/utils/helpers.test.js
import { getCookie, formatPoints } from './helpers';

describe('getCookie', () => {
  test('returns cookie value', () => {
    document.cookie = 'csrftoken=abc123';
    expect(getCookie('csrftoken')).toBe('abc123');
  });

  test('returns null for missing cookie', () => {
    expect(getCookie('nonexistent')).toBeNull();
  });
});

describe('formatPoints', () => {
  test('formats points with one decimal', () => {
    expect(formatPoints(10.5)).toBe('10.5');
    expect(formatPoints(10)).toBe('10.0');
  });

  test('handles null', () => {
    expect(formatPoints(null)).toBe('0.0');
  });
});
```

## Running Tests

### Backend

```bash
# Run all tests
pytest

# Run specific file
pytest backend/predictions/tests/test_models.py

# Run specific test
pytest backend/predictions/tests/test_models.py::TestSeasonModel::test_create_season

# Run with coverage
pytest --cov=predictions

# Run with verbose output
pytest -v

# Run and stop on first failure
pytest -x

# Run in parallel (faster)
pytest -n auto
```

### Frontend

```bash
# Run all tests
npm test

# Run in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage

# Run specific file
npm test -- Leaderboard.test.jsx

# Update snapshots
npm test -- -u
```

### Both

```bash
# Run all tests (backend + frontend)
./scripts/run_tests.sh

# Or create a script:
pytest && npm test
```

## Test Data & Fixtures

### Factory Pattern

```python
# backend/predictions/tests/factories.py
from predictions.models import Season, Team, Player

class SeasonFactory:
    @staticmethod
    def create(**kwargs):
        defaults = {
            'name': '2024-25',
            'slug': '2024-25',
            'start_date': '2024-10-01',
            'end_date': '2025-06-30',
        }
        defaults.update(kwargs)
        return Season.objects.create(**defaults)

class TeamFactory:
    @staticmethod
    def create(**kwargs):
        defaults = {
            'name': 'Test Team',
            'abbreviation': 'TST',
            'conference': 'West',
            'division': 'Pacific',
        }
        defaults.update(kwargs)
        return Team.objects.create(**defaults)
```

### Database Fixtures

```python
# Load fixtures
pytest --fixtures

# Use in tests
@pytest.mark.django_db
def test_with_fixture(season, team):
    # season and team provided by fixtures
    assert season.name == "2024-25"
    assert team.conference == "West"
```

## Continuous Integration

### GitHub Actions

```yaml
# .github/workflows/tests.yml
name: Tests

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.11
      - name: Install dependencies
        run: pip install -r backend/requirements.txt
      - name: Run tests
        run: pytest --cov

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Node
        uses: actions/setup-node@v2
        with:
          node-version: 16
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test -- --coverage
```

## Best Practices

### Test Naming

```python
# Good
def test_create_season_with_valid_data():
    pass

def test_create_season_raises_error_with_invalid_date():
    pass

# Bad
def test_1():
    pass

def test_season():
    pass
```

### Test Independence

```python
# Each test should be independent
@pytest.mark.django_db
class TestQuestions:
    def test_create_question(self):
        # Create data in test
        season = Season.objects.create(...)
        question = Question.objects.create(season=season, ...)
        assert question.season == season

    def test_delete_question(self):
        # Create new data, don't rely on previous test
        season = Season.objects.create(...)
        question = Question.objects.create(season=season, ...)
        question.delete()
        assert not Question.objects.filter(id=question.id).exists()
```

### Arrange-Act-Assert

```python
def test_user_can_submit_answer():
    # Arrange
    user = User.objects.create_user(username='test')
    question = Question.objects.create(...)

    # Act
    answer = Answer.objects.create(
        user=user,
        question=question,
        answer_text='LeBron James'
    )

    # Assert
    assert answer.user == user
    assert answer.question == question
    assert answer.answer_text == 'LeBron James'
```

## Related Documentation

- **CI/CD**: Load `10-deployment.md`
- **Common tasks**: Load `08-common-tasks.md`
- **Backend patterns**: Load `04-backend-django.md`
- **Frontend patterns**: Load `06-frontend-react.md`

---

**Key Takeaways:**
1. Write tests for models, APIs, and business logic
2. Use pytest for backend, Jest for frontend
3. Test fixtures reduce boilerplate
4. Keep tests independent and isolated
5. Run tests in CI/CD pipeline
6. Aim for good coverage, but focus on critical paths
