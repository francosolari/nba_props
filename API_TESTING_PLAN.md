# API Endpoint Testing Plan - Phase 2

**Status**: Ready for Execution
**Priority**: HIGH (Phase 2 of Technical Debt Remediation)
**Estimated Effort**: 12-16 hours
**Target Coverage**: 70%+ for all API endpoints
**Dependencies**: ✅ Model factories available, ✅ Admin grading tests complete

---

## Overview

Comprehensive test coverage for all Django Ninja API v2 endpoints with focus on:
- Request/response validation (Pydantic schemas)
- Authentication & permissions
- Business logic correctness
- Error handling & edge cases
- Integration workflows

---

## Beads Issues Created

| Issue | Priority | Description | Est. Tests | File |
|-------|----------|-------------|------------|------|
| `nba_predictions-33` | P0 | Public endpoints | ~40 | `test_api_public.py` |
| `nba_predictions-34` | P0 | User submissions | ~30 | `test_api_submissions.py` |
| `nba_predictions-35` | P0 | Leaderboard | ~25 | `test_api_leaderboard.py` |
| `nba_predictions-36` | P0 | Integration tests | ~20 | `test_api_integration.py` |
| `nba_predictions-37` | P1 | Standings | ~20 | `test_api_standings.py` |
| `nba_predictions-38` | P1 | Payments | ~20 | `test_api_payments.py` |
| `nba_predictions-39` | P1 | Admin questions | ~25 | `test_api_admin_questions.py` |
| `nba_predictions-40` | P2 | Odds | ~15 | `test_api_odds.py` |

**Total**: 8 test files, ~195 tests

---

## Execution Order

### Phase 1: Foundation (P0 - Critical)

#### 1. Public Endpoints (`nba_predictions-33`) - 4 hours
**File**: `backend/predictions/tests/test_api_public.py`
**Endpoints**: `seasons.py`, `teams.py`, `players.py`, `homepage.py`

```python
# Test Structure
class TestSeasonsEndpoint:
    def test_list_seasons()  # GET /api/v2/seasons
    def test_get_current_season()  # GET /api/v2/seasons/current
    def test_filter_by_active_status()
    def test_pagination()
    def test_response_schema_validation()

class TestTeamsEndpoint:
    def test_list_all_teams()  # GET /api/v2/teams
    def test_filter_by_conference()
    def test_get_team_by_id()
    def test_invalid_team_returns_404()

class TestPlayersEndpoint:
    def test_list_players()  # GET /api/v2/players
    def test_search_by_name()
    def test_filter_by_team()
    def test_player_stats_included()

class TestHomepageEndpoint:
    def test_homepage_data()  # GET /api/v2/homepage
    def test_includes_current_season()
    def test_includes_leaderboard_preview()
    def test_unauthenticated_access()
```

**Key Tests**:
- ✅ Unauthenticated access allowed
- ✅ Response schema validation
- ✅ Pagination (limit/offset)
- ✅ Filtering & search
- ✅ 404 for invalid IDs
- ✅ Performance (<500ms response time)

---

#### 2. User Submissions (`nba_predictions-34`) - 4 hours
**File**: `backend/predictions/tests/test_api_submissions.py`
**Endpoints**: `answers.py`, `user_submissions.py`

```python
class TestAnswerSubmission:
    def test_submit_answer_success()  # POST /api/v2/answers
    def test_requires_authentication()
    def test_deadline_enforcement()
    def test_duplicate_answer_prevented()
    def test_invalid_question_id_rejected()
    def test_polymorphic_question_handling()

class TestUserSubmissionsEndpoint:
    def test_get_user_submissions()  # GET /api/v2/user-submissions
    def test_filter_by_season()
    def test_includes_point_totals()
    def test_only_own_submissions_visible()
    def test_pagination()
```

**Key Tests**:
- ✅ Authentication required
- ✅ Deadline validation (can't submit after deadline)
- ✅ Duplicate prevention (one answer per question)
- ✅ Polymorphic question type handling
- ✅ Point calculation correctness
- ✅ User isolation (can't see others' answers)

---

#### 3. Leaderboard (`nba_predictions-35`) - 3 hours
**File**: `backend/predictions/tests/test_api_leaderboard.py`
**Endpoints**: `leaderboard.py`, `ist_leaderboard.py`

```python
class TestMainLeaderboard:
    def test_get_leaderboard()  # GET /api/v2/leaderboard
    def test_filter_by_season()
    def test_ranking_calculation()
    def test_tie_breaking_logic()
    def test_pagination()
    def test_user_rank_included()

class TestISTLeaderboard:
    def test_ist_specific_leaderboard()  # GET /api/v2/ist-leaderboard
    def test_only_ist_points_counted()
    def test_separate_from_main_leaderboard()
```

**Key Tests**:
- ✅ Correct ranking (points descending)
- ✅ Tie-breaking (alphabetical by username)
- ✅ Season filtering
- ✅ User's own rank highlighted
- ✅ IST vs. main leaderboard separation
- ✅ Point aggregation accuracy

---

#### 4. Integration Tests (`nba_predictions-36`) - 3 hours
**File**: `backend/predictions/tests/test_api_integration.py`

```python
class TestUserJourneyIntegration:
    def test_complete_user_flow():
        """User signs up → pays → submits answers → gets graded → appears on leaderboard"""
        # 1. Create user
        # 2. Make payment
        # 3. Submit answers
        # 4. Admin grades
        # 5. Verify leaderboard position

class TestSeasonLifecycleIntegration:
    def test_season_workflow():
        """Create season → add questions → users submit → grade → finalize"""

class TestQuestionWorkflowIntegration:
    def test_superlative_question_flow():
        """Create MVP question → update odds → finalize winner → grade answers"""
```

**Key Tests**:
- ✅ End-to-end user journey
- ✅ Season lifecycle
- ✅ Question creation to grading workflow
- ✅ Payment to submission flow
- ✅ Multi-user interactions
- ✅ State consistency across workflows

---

### Phase 2: Important (P1 - High)

#### 5. Standings (`nba_predictions-37`) - 2 hours
**File**: `backend/predictions/tests/test_api_standings.py`
**Endpoints**: `standings.py`

```python
class TestRegularSeasonStandings:
    def test_get_standings()  # GET /api/v2/standings
    def test_filter_by_conference()
    def test_polymorphic_standings_handling()
    def test_point_calculations()

class TestISTStandings:
    def test_ist_standings_separate()
    def test_group_filtering()
```

---

#### 6. Payments (`nba_predictions-38`) - 3 hours
**File**: `backend/predictions/tests/test_api_payments.py`
**Endpoints**: `payments.py`

```python
class TestPaymentCreation:
    def test_create_checkout_session()  # POST /api/v2/payments/checkout
    def test_stripe_session_created()
    def test_payment_record_created()
    def test_duplicate_payment_prevented()

class TestPaymentWebhooks:
    def test_webhook_success_handling()  # POST /api/v2/payments/webhook
    def test_webhook_idempotency()
    def test_invalid_signature_rejected()

class TestPaymentVerification:
    def test_entry_fee_validation()
    def test_refund_handling()
```

**Mock Stripe**: Use `stripe-mock` or `@patch` for Stripe API calls

---

#### 7. Admin Questions (`nba_predictions-39`) - 3 hours
**File**: `backend/predictions/tests/test_api_admin_questions.py`
**Endpoints**: `admin_questions.py`

```python
class TestQuestionCRUD:
    def test_create_question()  # POST /api/v2/admin/questions
    def test_update_question()  # PUT /api/v2/admin/questions/{id}
    def test_delete_question()  # DELETE /api/v2/admin/questions/{id}
    def test_non_admin_cannot_create()

class TestPolymorphicQuestions:
    def test_create_superlative_question()
    def test_create_prop_question()
    def test_create_h2h_question()

class TestBulkOperations:
    def test_bulk_create_questions()
    def test_bulk_update_correct_answers()
```

---

### Phase 3: Nice-to-Have (P2 - Medium)

#### 8. Odds (`nba_predictions-40`) - 2 hours
**File**: `backend/predictions/tests/test_api_odds.py`
**Endpoints**: `odds.py`

```python
class TestOddsRetrieval:
    def test_get_current_odds()  # GET /api/v2/odds
    def test_filter_by_award()
    def test_historical_odds()
    def test_player_odds_lookup()
```

---

## Common Test Patterns

### 1. Client Setup
```python
import pytest
from django.test import Client
from predictions.tests.factories import UserFactory, AdminUserFactory

@pytest.fixture
def api_client():
    return Client()

@pytest.fixture
def auth_client(api_client):
    user = UserFactory()
    api_client.force_login(user)
    return api_client

@pytest.fixture
def admin_client(api_client):
    admin = AdminUserFactory()
    api_client.force_login(admin)
    return admin_client
```

### 2. Response Validation
```python
def test_endpoint_response_schema(api_client):
    response = api_client.get('/api/v2/endpoint')

    assert response.status_code == 200
    data = response.json()

    # Schema validation
    assert 'results' in data
    assert isinstance(data['results'], list)
    assert all('id' in item for item in data['results'])
```

### 3. Authentication Tests
```python
def test_requires_authentication(api_client):
    response = api_client.post('/api/v2/protected-endpoint')
    assert response.status_code == 401

def test_admin_only(auth_client):
    response = auth_client.post('/api/v2/admin-endpoint')
    assert response.status_code == 403
```

### 4. Error Handling
```python
def test_invalid_input_returns_400(auth_client):
    response = auth_client.post('/api/v2/endpoint',
                                data={'invalid': 'data'},
                                content_type='application/json')
    assert response.status_code == 400
    assert 'error' in response.json()
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Total API Tests | 195+ |
| API Coverage | 70%+ |
| Test Execution Time | <90 seconds |
| Integration Tests | 20+ |
| All Tests Passing | 100% |
| Response Time Tests | <500ms avg |

---

## Implementation Checklist

### Before Starting
- [x] Model factories available
- [x] Admin grading tests complete
- [ ] Django Ninja test client configured
- [ ] Stripe mock setup
- [ ] Test database isolation verified

### P0 Tasks (Critical)
- [ ] `nba_predictions-33`: Public endpoints
- [ ] `nba_predictions-34`: User submissions
- [ ] `nba_predictions-35`: Leaderboard
- [ ] `nba_predictions-36`: Integration tests

### P1 Tasks (High)
- [ ] `nba_predictions-37`: Standings
- [ ] `nba_predictions-38`: Payments
- [ ] `nba_predictions-39`: Admin questions

### P2 Tasks (Medium)
- [ ] `nba_predictions-40`: Odds

---

## Test Execution Commands

```bash
# Run all API tests
pytest backend/predictions/tests/test_api_*.py -v

# Run specific test file
pytest backend/predictions/tests/test_api_public.py -v

# Run with coverage
pytest backend/predictions/tests/test_api_*.py \
  --cov=backend/predictions/api/v2/endpoints \
  --cov-report=term-missing

# Run integration tests only
pytest backend/predictions/tests/test_api_integration.py -v
```

---

## Coding Agent Instructions

For each beads issue:

1. **Read endpoint file** to understand routes and logic
2. **Create test file** with structure matching this plan
3. **Use factories** from `predictions/tests/factories.py`
4. **Test all HTTP methods** (GET, POST, PUT, DELETE)
5. **Test authentication** (unauthenticated, user, admin)
6. **Test error cases** (404, 400, 403, 401)
7. **Validate response schemas** against Pydantic models
8. **Run tests** and ensure all pass
9. **Check coverage** with `pytest --cov`
10. **Commit** with message referencing beads issue

---

## Notes

- Use `@pytest.mark.django_db` for all tests
- Mock Stripe API calls in payment tests
- Use `Client()` for Django Ninja endpoints
- Test polymorphic behavior explicitly
- Verify JSON response schemas
- Test pagination with multiple pages
- Use fixtures for common setup
- Keep tests fast (<90s total execution)

---

**Created**: 2025-11-04
**Status**: Ready for execution
**Related**: GitHub issue #23, Phase 2
