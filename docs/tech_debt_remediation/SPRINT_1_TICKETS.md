# Sprint 1: Testing Infrastructure Setup
**Duration:** 2 weeks
**Goal:** Establish testing foundation and protect critical paths

---

## Epic: Testing Infrastructure Foundation

### Story 1: Configure Backend Testing Infrastructure
**Priority:** P0 (Critical)
**Effort:** 4 hours
**Assignee:** Backend Dev

**Description:**
Set up pytest testing infrastructure for Django backend with coverage reporting and CI/CD integration.

**Acceptance Criteria:**
- [ ] pytest installed and configured
- [ ] pytest-django configured with test settings
- [ ] pytest-cov installed for coverage reporting
- [ ] factory_boy installed for test fixtures
- [ ] pytest-mock installed for mocking
- [ ] Test database configured (separate from development)
- [ ] Coverage threshold set to 60% in pytest.ini
- [ ] Coverage report generated in CI/CD pipeline
- [ ] All existing tests pass with new configuration

**Technical Details:**
```bash
# Dependencies to add to requirements.txt
pytest>=7.4.0
pytest-django>=4.5.2
pytest-cov>=4.1.0
pytest-mock>=3.11.1
factory-boy>=3.3.0
faker>=19.3.0
```

**Files to Create:**
- `pytest.ini` - pytest configuration
- `backend/conftest.py` - shared fixtures
- `backend/tests/factories.py` - model factories
- `backend/tests/__init__.py`

**Definition of Done:**
- pytest runs successfully
- Coverage report shows <15% baseline
- CI/CD runs pytest and generates coverage report
- Documentation updated in README

---

### Story 2: Test Admin Grading Endpoint (Critical Path)
**Priority:** P0 (Critical)
**Effort:** 16 hours
**Assignee:** Backend Dev
**Dependencies:** Story 1

**Description:**
Create comprehensive tests for the admin grading endpoint (`admin_grading.py` - 734 lines). This is the highest-risk, revenue-critical code path.

**Acceptance Criteria:**
- [ ] Test grading audit functionality (GET /api/v2/admin/grading/audit)
- [ ] Test manual grading submission (POST /api/v2/admin/grading/manual)
- [ ] Test bulk grading operations
- [ ] Test grade command execution endpoint
- [ ] Test error handling (invalid seasons, missing data)
- [ ] Test permission checks (admin-only access)
- [ ] Mock external dependencies (NBA API, database writes)
- [ ] Achieve 80%+ coverage of admin_grading.py

**Test Scenarios:**
1. **Grading Audit:**
   - Returns correct ungraded questions count
   - Filters by season correctly
   - Returns proper question details
   - Handles empty results

2. **Manual Grading:**
   - Successfully grades a single question
   - Updates UserStats correctly
   - Handles invalid question types
   - Returns proper error messages

3. **Bulk Operations:**
   - Grades multiple questions at once
   - Handles partial failures
   - Rolls back on critical errors

4. **Permissions:**
   - Non-admin users get 403
   - Unauthenticated users get 401
   - Admin users can access all endpoints

**Files to Create:**
- `backend/predictions/tests/test_admin_grading.py`
- `backend/predictions/tests/factories/grading_factories.py`

**Definition of Done:**
- All tests pass
- Coverage of admin_grading.py >= 80%
- No regressions in existing functionality
- Tests run in <30 seconds

---

### Story 3: Test Payment Processing Endpoints
**Priority:** P0 (Critical)
**Effort:** 12 hours
**Assignee:** Backend Dev
**Dependencies:** Story 1

**Description:**
Create tests for all payment processing endpoints. This is revenue-critical code that handles Stripe integration.

**Acceptance Criteria:**
- [ ] Test payment webhook handling
- [ ] Test subscription creation
- [ ] Test subscription cancellation
- [ ] Test payment failure scenarios
- [ ] Test webhook signature validation
- [ ] Mock Stripe API calls
- [ ] Achieve 100% coverage of payment logic

**Test Scenarios:**
1. **Webhook Processing:**
   - Validates Stripe signatures
   - Processes successful payments
   - Handles payment failures
   - Handles refunds
   - Ignores duplicate webhooks

2. **Subscription Management:**
   - Creates subscriptions with correct pricing
   - Updates user subscription status
   - Cancels subscriptions properly
   - Handles trial periods

3. **Error Handling:**
   - Invalid webhook signatures rejected
   - Network errors handled gracefully
   - Database transaction rollback on errors

**Files to Create:**
- `backend/predictions/tests/test_payments.py`
- `backend/predictions/tests/fixtures/stripe_webhooks.json`

**Mock Strategy:**
```python
# Use responses library to mock Stripe API
import responses

@responses.activate
def test_create_subscription():
    responses.add(
        responses.POST,
        'https://api.stripe.com/v1/subscriptions',
        json={'id': 'sub_123', 'status': 'active'},
        status=200
    )
    # Test subscription creation
```

**Definition of Done:**
- All payment paths tested
- 100% coverage of payment logic
- All Stripe API calls mocked
- No actual API calls in tests
- Tests run in <20 seconds

---

### Story 4: Test User Submission Endpoints
**Priority:** P0 (Critical)
**Effort:** 16 hours
**Assignee:** Backend Dev
**Dependencies:** Story 1

**Description:**
Create tests for user submission endpoints (`user_submissions.py` - 571 lines). This is data-critical code that handles all user predictions.

**Acceptance Criteria:**
- [ ] Test submission creation
- [ ] Test submission validation
- [ ] Test deadline enforcement
- [ ] Test bulk submission operations
- [ ] Test submission retrieval by season
- [ ] Test submission updates (before deadline)
- [ ] Test submission locking (after deadline)
- [ ] Achieve 80%+ coverage of user_submissions.py

**Test Scenarios:**
1. **Submission Creation:**
   - Valid submissions accepted
   - Invalid data rejected
   - Duplicate submissions prevented
   - Correct associations (user, season, question)

2. **Deadline Enforcement:**
   - Submissions allowed before deadline
   - Submissions rejected after deadline
   - Updates allowed before deadline
   - Updates rejected after deadline

3. **Validation:**
   - Required fields validated
   - Data types validated
   - Business rules enforced (e.g., standings must have 15 teams)

4. **Bulk Operations:**
   - Multiple submissions in single request
   - Partial success handling
   - Transaction rollback on errors

**Files to Create:**
- `backend/predictions/tests/test_user_submissions.py`
- `backend/predictions/tests/factories/submission_factories.py`

**Definition of Done:**
- All submission paths tested
- Coverage >= 80%
- Deadline logic thoroughly tested
- Tests run in <30 seconds

---

### Story 5: Test Grading Management Commands
**Priority:** P1 (High)
**Effort:** 12 hours
**Assignee:** Backend Dev
**Dependencies:** Story 1

**Description:**
Create tests for grading management commands that calculate user points. This is scoring-critical code.

**Acceptance Criteria:**
- [ ] Test `grade_props_answers` command
- [ ] Test `grade_standing_predictions` command
- [ ] Test `grade_ist_predictions` command
- [ ] Test point calculation algorithms
- [ ] Mock NBA API calls
- [ ] Test UserStats aggregation
- [ ] Verify correct point values awarded

**Test Scenarios:**
1. **Props Grading:**
   - Correct answers get points
   - Incorrect answers get 0 points
   - Partial credit for close answers
   - UserStats updated correctly

2. **Standings Grading:**
   - Exact position = 3 points
   - Off by 1 = 1 point
   - Off by 2+ = 0 points
   - Conference separation works

3. **IST Grading:**
   - Tournament winner graded correctly
   - Runner-up graded correctly
   - Semifinalists graded correctly

**Files to Create:**
- `backend/predictions/tests/test_management_commands.py`
- `backend/predictions/tests/fixtures/nba_api_responses.json`

**Mock Strategy:**
```python
from unittest.mock import patch

@patch('predictions.management.commands.grade_props_answers.NBAApi')
def test_grade_props_answers(mock_nba_api):
    mock_nba_api.return_value.get_player_stats.return_value = {
        'ppg': 28.5, 'rpg': 10.2, 'apg': 8.1
    }
    # Test grading logic
```

**Definition of Done:**
- All grading commands tested
- Point calculations verified
- NBA API calls mocked
- Tests run in <40 seconds

---

### Story 6: Test Answer Lookup Service
**Priority:** P1 (High)
**Effort:** 8 hours
**Assignee:** Backend Dev
**Dependencies:** Story 1

**Description:**
Create tests for `answer_lookup_service.py` which normalizes and resolves user answers.

**Acceptance Criteria:**
- [ ] Test player name normalization
- [ ] Test team name normalization
- [ ] Test fuzzy matching logic
- [ ] Test edge cases (special characters, multiple matches)
- [ ] Achieve 90%+ coverage

**Test Scenarios:**
1. **Name Normalization:**
   - "Lakers" → "Los Angeles Lakers"
   - "LAL" → "Los Angeles Lakers"
   - "Nikola Jokic" → "Nikola Jokić" (handle diacritics)
   - "Giannis" → "Giannis Antetokounmpo" (partial match)

2. **Fuzzy Matching:**
   - Handles typos (Levenshtein distance)
   - Case-insensitive matching
   - Whitespace normalization

3. **Edge Cases:**
   - Multiple matches (disambiguation)
   - No matches (return None)
   - Special characters
   - Hyphenated names

**Files to Create:**
- `backend/predictions/tests/test_answer_lookup_service.py`

**Definition of Done:**
- All lookup scenarios tested
- Edge cases covered
- Coverage >= 90%
- Tests run in <10 seconds

---

### Story 7: Expand Model Tests
**Priority:** P2 (Medium)
**Effort:** 8 hours
**Assignee:** Backend Dev
**Dependencies:** Story 1

**Description:**
Expand existing `test_models.py` (currently 121 lines) to cover all critical model methods and polymorphic behavior.

**Acceptance Criteria:**
- [ ] Test all Question subtype methods
- [ ] Test Season model methods
- [ ] Test UserStats aggregation
- [ ] Test StandingPrediction validation
- [ ] Test polymorphic queries
- [ ] Achieve 70%+ model coverage

**Test Scenarios:**
1. **Polymorphic Questions:**
   - SuperlativeQuestion behaves correctly
   - PropQuestion behaves correctly
   - PlayerStatPredictionQuestion behaves correctly
   - HeadToHeadQuestion behaves correctly
   - InSeasonTournamentQuestion behaves correctly
   - NBAFinalsPredictionQuestion behaves correctly
   - `.get_real_instance()` works

2. **Season Model:**
   - Current season detection
   - Submission deadline logic
   - Season year formatting

3. **UserStats:**
   - Point aggregation by season
   - Ranking calculation
   - Leaderboard ordering

**Files to Update:**
- `backend/predictions/tests/test_models.py` (expand from 121 lines)

**Definition of Done:**
- All model methods tested
- Polymorphic behavior verified
- Coverage >= 70% for models
- Tests run in <15 seconds

---

## Epic: Frontend Testing Infrastructure

### Story 8: Configure Jest and Testing Library
**Priority:** P0 (Critical)
**Effort:** 4 hours
**Assignee:** Frontend Dev

**Description:**
Fix Jest configuration and set up React Testing Library for frontend component testing.

**Acceptance Criteria:**
- [ ] Jest properly configured in project root
- [ ] @testing-library/react installed
- [ ] @testing-library/jest-dom installed
- [ ] @testing-library/user-event installed
- [ ] MSW (Mock Service Worker) installed for API mocking
- [ ] Coverage reporting configured
- [ ] All existing tests pass
- [ ] Coverage baseline established

**Technical Details:**
```bash
# Dependencies to add
npm install -D jest @testing-library/react @testing-library/jest-dom @testing-library/user-event msw jest-environment-jsdom
```

**Files to Create:**
- `jest.config.js` - Jest configuration
- `frontend/src/setupTests.js` - Test setup and global mocks
- `frontend/src/__mocks__/msw/handlers.js` - API mock handlers
- `frontend/src/__mocks__/msw/server.js` - MSW server setup

**Definition of Done:**
- `npm test` runs successfully
- Coverage report generated
- Baseline coverage documented
- CI/CD runs frontend tests

---

### Story 9: Test Critical Custom Hooks
**Priority:** P0 (Critical)
**Effort:** 12 hours
**Assignee:** Frontend Dev
**Dependencies:** Story 8

**Description:**
Create tests for all custom hooks that handle API data fetching and state management.

**Acceptance Criteria:**
- [ ] Test `useLeaderboard.js`
- [ ] Test `useSubmissions.js`
- [ ] Test `useUserSubmissions.js`
- [ ] Test `useAdminQuestions.js`
- [ ] Test `usePredictions.js`
- [ ] Mock API calls with MSW
- [ ] Achieve 80%+ hook coverage

**Test Scenarios:**
1. **useLeaderboard:**
   - Fetches leaderboard data
   - Handles loading state
   - Handles error state
   - Processes season selection
   - Calculates totals correctly

2. **useSubmissions:**
   - Fetches user submissions
   - Handles submission creation
   - Validates deadline
   - Updates local state on success

3. **useAdminQuestions:**
   - Fetches questions for admin
   - Creates new questions
   - Updates questions
   - Deletes questions

**Files to Create:**
- `frontend/src/hooks/__tests__/useLeaderboard.test.js`
- `frontend/src/hooks/__tests__/useSubmissions.test.js`
- `frontend/src/hooks/__tests__/useUserSubmissions.test.js`
- `frontend/src/hooks/__tests__/useAdminQuestions.test.js`
- `frontend/src/hooks/__tests__/usePredictions.test.js`

**MSW Mock Example:**
```javascript
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/v2/leaderboard/:season', (req, res, ctx) => {
    return res(
      ctx.json({
        leaderboard: [/* mock data */],
        season: { year: '2024-25' }
      })
    );
  })
];
```

**Definition of Done:**
- All hooks tested
- API calls mocked
- Coverage >= 80%
- Tests run in <20 seconds

---

### Story 10: Test Critical Components
**Priority:** P0 (Critical)
**Effort:** 16 hours
**Assignee:** Frontend Dev
**Dependencies:** Story 8

**Description:**
Create tests for critical UI components used throughout the application.

**Acceptance Criteria:**
- [ ] Test `PredictionBoard` component
- [ ] Test `QuestionForm` component
- [ ] Test `NBAStandings` component
- [ ] Test `Leaderboard` component
- [ ] Test `ProgressBar` component
- [ ] Test user interactions
- [ ] Achieve 70%+ component coverage

**Test Scenarios:**
1. **PredictionBoard:**
   - Renders predictions correctly
   - Handles empty state
   - Allows editing before deadline
   - Blocks editing after deadline
   - Shows validation errors

2. **QuestionForm:**
   - Renders form fields
   - Validates required fields
   - Submits data correctly
   - Shows error messages
   - Handles different question types

3. **NBAStandings:**
   - Renders standings table
   - Handles drag and drop
   - Updates order correctly
   - Shows conference separation

**Files to Create:**
- `frontend/src/components/__tests__/PredictionBoard.test.jsx`
- `frontend/src/components/__tests__/QuestionForm.test.jsx`
- `frontend/src/components/__tests__/NBAStandings.test.jsx`
- `frontend/src/components/__tests__/Leaderboard.test.jsx`
- `frontend/src/components/__tests__/ProgressBar.test.jsx`

**Test Example:**
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestionForm } from '../QuestionForm';

describe('QuestionForm', () => {
  it('shows validation errors for required fields', async () => {
    render(<QuestionForm />);

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    expect(screen.getByText('Question text is required')).toBeInTheDocument();
  });
});
```

**Definition of Done:**
- All critical components tested
- User interactions tested
- Coverage >= 70%
- Tests run in <30 seconds

---

### Story 11: E2E Tests for Critical User Flows
**Priority:** P1 (High)
**Effort:** 8 hours
**Assignee:** Frontend Dev
**Dependencies:** Story 8, 9, 10

**Description:**
Create end-to-end tests for critical user journeys using Playwright or Cypress.

**Acceptance Criteria:**
- [ ] Test leaderboard viewing flow
- [ ] Test submission creation flow
- [ ] Test admin question creation flow
- [ ] Tests run in CI/CD
- [ ] All tests pass consistently

**Test Scenarios:**
1. **Leaderboard View:**
   - User visits leaderboard
   - Leaderboard loads with data
   - User expands a player's details
   - Categories display correctly

2. **Submission Flow:**
   - User visits submissions page
   - User selects a season
   - User fills out predictions
   - User submits successfully
   - Success message shown

3. **Admin Flow:**
   - Admin logs in
   - Admin creates new question
   - Question appears in list
   - Question can be edited

**Files to Create:**
- `e2e/leaderboard.spec.js`
- `e2e/submissions.spec.js`
- `e2e/admin.spec.js`
- `playwright.config.js` or `cypress.config.js`

**Definition of Done:**
- 3 critical flows tested E2E
- Tests run in CI/CD
- Tests pass consistently (not flaky)
- Screenshot on failure

---

## Sprint 1 Summary

### Total Effort: 120 hours

**Backend Stories (68 hours):**
- Story 1: Testing infrastructure (4h)
- Story 2: Admin grading tests (16h)
- Story 3: Payment tests (12h)
- Story 4: User submission tests (16h)
- Story 5: Grading commands tests (12h)
- Story 6: Answer lookup tests (8h)

**Frontend Stories (52 hours):**
- Story 8: Jest configuration (4h)
- Story 9: Hook tests (12h)
- Story 10: Component tests (16h)
- Story 11: E2E tests (8h)

### Sprint Goals:
- ✅ Testing infrastructure established
- ✅ Critical backend paths tested (admin, payments, submissions)
- ✅ Critical frontend components tested
- ✅ Coverage baseline: 40%+ backend, 50%+ frontend
- ✅ All tests run in CI/CD

### Success Metrics:
- [ ] Backend coverage: 40%+
- [ ] Frontend coverage: 50%+
- [ ] 100% of revenue-critical code tested
- [ ] All tests pass in CI/CD
- [ ] Test suite runs in <2 minutes

### Risks:
- **Time overrun on complex tests** - Mitigation: Focus on happy paths first, edge cases later
- **Flaky E2E tests** - Mitigation: Use proper waits, retry logic, screenshots on failure
- **Breaking existing code** - Mitigation: Run full regression suite after each story

---

## Post-Sprint 1 Review

After Sprint 1 completion, review:
1. Actual vs estimated effort
2. Coverage achieved vs targets
3. Test execution time
4. Blockers encountered
5. Lessons learned

Use insights to plan Sprint 2-3 (Week 3-5).
