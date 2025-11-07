# GitHub Project Structure for Technical Debt Remediation

This document outlines the GitHub project board structure for tracking the Technical Debt Remediation Plan.

---

## GitHub Project Setup Instructions

### 1. Create GitHub Project

1. Go to your repository → **Projects** tab
2. Click **New Project**
3. Choose **Board** template
4. Name: **Technical Debt Remediation**
5. Description: **14-week plan to improve testing coverage and code organization**

### 2. Create Custom Fields

Add these custom fields to track progress:

| Field Name | Type | Options |
|-----------|------|---------|
| **Priority** | Single select | P0 (Critical), P1 (High), P2 (Medium), P3 (Low) |
| **Phase** | Single select | Phase 1: Testing, Phase 2: Frontend Org, Phase 3: Quality/Deps, Phase 4: Infrastructure |
| **Sprint** | Single select | Sprint 1, Sprint 2, Sprint 3, Sprint 4, Sprint 5, Sprint 6, Sprint 7 |
| **Effort (hours)** | Number | - |
| **Story Type** | Single select | Epic, Story, Task, Bug |
| **Team** | Single select | Backend, Frontend, Full Stack |
| **Coverage Impact** | Text | e.g., "+15% backend coverage" |

### 3. Create Project Views

#### View 1: Kanban Board (Default)
**Columns:**
- 📋 Backlog
- 🎯 Ready for Development
- 🏗️ In Progress
- 👀 In Review
- ✅ Done

**Filter:** None (show all)
**Group by:** Status
**Sort by:** Priority (P0 → P3)

#### View 2: By Sprint
**Layout:** Table
**Group by:** Sprint
**Sort by:** Priority
**Columns to show:**
- Title
- Status
- Priority
- Effort (hours)
- Team
- Assignee

#### View 3: By Phase
**Layout:** Board
**Group by:** Phase
**Sort by:** Priority
**Filter:** Status ≠ Done

#### View 4: Critical Path
**Layout:** Table
**Filter:** Priority = P0
**Sort by:** Sprint
**Columns to show:**
- Title
- Status
- Sprint
- Effort
- Coverage Impact
- Assignee

#### View 5: Coverage Tracking
**Layout:** Table
**Group by:** Phase
**Columns to show:**
- Title
- Status
- Coverage Impact
- Effort
- Sprint

---

## Milestones

Create these GitHub milestones:

### Milestone 1: Testing Foundation (Weeks 1-2)
- **Due Date:** 2 weeks from start
- **Description:** Establish testing infrastructure and protect critical paths
- **Goals:**
  - pytest configured
  - Admin grading tested (80% coverage)
  - Payment processing tested (100% coverage)
  - User submissions tested (80% coverage)

### Milestone 2: Backend Service Testing (Week 3)
- **Due Date:** 3 weeks from start
- **Description:** Test business logic and grading algorithms
- **Goals:**
  - Grading commands tested
  - Answer lookup service tested
  - Model tests expanded
  - Backend coverage >= 60%

### Milestone 3: Frontend Testing Setup (Weeks 4-5)
- **Due Date:** 5 weeks from start
- **Description:** Establish frontend testing and test critical components
- **Goals:**
  - Jest configured
  - Custom hooks tested
  - Critical components tested
  - Frontend coverage >= 50%

### Milestone 4: Component Decomposition (Weeks 6-7)
- **Due Date:** 7 weeks from start
- **Description:** Break down massive page components
- **Goals:**
  - SubmissionsPage refactored
  - AdminPanel refactored
  - LeaderboardDetailPage refactored
  - No component over 400 lines

### Milestone 5: Feature-Based Organization (Weeks 8-9)
- **Due Date:** 9 weeks from start
- **Description:** Reorganize into feature directories
- **Goals:**
  - Feature directory structure created
  - All components migrated
  - Demo/old files removed
  - Documentation updated

### Milestone 6: Dependencies & Documentation (Weeks 10-12)
- **Due Date:** 12 weeks from start
- **Description:** Clean up dependencies and consolidate docs
- **Goals:**
  - All deps pinned
  - Security vulnerabilities resolved
  - Documentation consolidated
  - README updated

### Milestone 7: Infrastructure Hardening (Weeks 13-14)
- **Due Date:** 14 weeks from start
- **Description:** Improve deployment and infrastructure
- **Goals:**
  - Multi-stage Docker build
  - No hardcoded secrets
  - CI/CD fully functional
  - Cache directories cleaned

---

## Labels

Create these labels for categorization:

### Priority Labels
- 🔴 `priority: P0 - critical` (red)
- 🟠 `priority: P1 - high` (orange)
- 🟡 `priority: P2 - medium` (yellow)
- 🟢 `priority: P3 - low` (green)

### Phase Labels
- 🧪 `phase: testing` (purple)
- 🎨 `phase: frontend-org` (blue)
- 📦 `phase: quality-deps` (teal)
- 🚀 `phase: infrastructure` (indigo)

### Team Labels
- 🐍 `team: backend` (dark blue)
- ⚛️ `team: frontend` (cyan)
- 🔧 `team: full-stack` (gray)

### Story Type Labels
- 📚 `type: epic` (dark purple)
- 📖 `type: story` (light blue)
- ✓ `type: task` (green)
- 🐛 `type: bug` (red)

### Coverage Labels
- 📈 `coverage: backend` (blue)
- 📊 `coverage: frontend` (cyan)
- 🎯 `coverage: critical-path` (red)

### Technical Labels
- 🧪 `test: unit`
- 🔗 `test: integration`
- 🌐 `test: e2e`
- 📝 `docs`
- 🔧 `refactor`
- 🛠️ `tooling`

---

## Issue Templates

### Template 1: Testing Story

```markdown
## Story: [Title]

**Priority:** P0 / P1 / P2 / P3
**Phase:** Phase 1: Testing
**Sprint:** Sprint X
**Effort:** X hours
**Team:** Backend / Frontend

### Description
[Brief description of what needs to be tested]

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Coverage target achieved (X%)

### Test Scenarios
1. Scenario 1
2. Scenario 2

### Files to Create/Update
- `path/to/test_file.py`
- `path/to/another_test.js`

### Dependencies
- Depends on #[issue number]

### Definition of Done
- [ ] All tests pass
- [ ] Coverage >= X%
- [ ] No regressions
- [ ] Tests run in <X seconds
```

### Template 2: Refactoring Story

```markdown
## Story: [Title]

**Priority:** P0 / P1 / P2 / P3
**Phase:** Phase 2: Frontend Organization
**Sprint:** Sprint X
**Effort:** X hours
**Team:** Frontend

### Description
[Brief description of refactoring work]

### Acceptance Criteria
- [ ] Component decomposed into X smaller components
- [ ] All components < 400 lines
- [ ] Tests added for new components
- [ ] No breaking changes

### Current State
- File: `path/to/file.jsx`
- Lines: X,XXX lines
- Issues: [list problems]

### Target State
- Files:
  - `path/to/Component1.jsx` (<300 lines)
  - `path/to/Component2.jsx` (<300 lines)
  - `path/to/Component3.jsx` (<300 lines)

### Definition of Done
- [ ] Refactoring complete
- [ ] All tests pass
- [ ] Visual regression tests pass
- [ ] Documentation updated
```

### Template 3: Epic

```markdown
## Epic: [Title]

**Phase:** Phase X
**Total Effort:** X hours
**Team:** Backend / Frontend / Full Stack

### Goal
[High-level goal of this epic]

### Success Metrics
- Metric 1: Target value
- Metric 2: Target value

### Stories in Epic
- [ ] Story 1 (#issue)
- [ ] Story 2 (#issue)
- [ ] Story 3 (#issue)

### Dependencies
- Depends on Epic #[number]

### Risks
- Risk 1: Mitigation strategy
- Risk 2: Mitigation strategy
```

---

## Automation Rules

Set up GitHub Actions automation:

### Auto-label by File Path

```yaml
# .github/labeler.yml
'team: backend':
  - 'backend/**'
  - '**/*.py'

'team: frontend':
  - 'frontend/**'
  - '**/*.jsx'
  - '**/*.tsx'

'phase: testing':
  - '**/*test*.py'
  - '**/*test*.js'
  - '**/*test*.jsx'

'docs':
  - '**/*.md'
  - 'docs/**'
```

### Auto-close on PR Merge

Configure branch protection to auto-close linked issues when PR is merged.

---

## Sprint Planning Template

Use this template for sprint planning meetings:

```markdown
# Sprint X Planning

**Dates:** [Start Date] - [End Date]
**Goal:** [Sprint goal]

## Capacity
- Backend: X hours
- Frontend: X hours
- Total: X hours

## Stories Committed
1. [Story Title] - X hours - @assignee
2. [Story Title] - X hours - @assignee

## Success Criteria
- [ ] All committed stories completed
- [ ] Coverage increased by X%
- [ ] No critical bugs introduced

## Risks
- Risk 1
- Risk 2

## Notes
[Any additional notes]
```

---

## Daily Standup Format

```markdown
## Daily Standup - [Date]

### @username
**Yesterday:**
- Completed Story 1
- Made progress on Story 2

**Today:**
- Finish Story 2
- Start Story 3

**Blockers:**
- None / [Blocker description]

**Coverage Update:**
- Backend: X% → Y%
- Frontend: X% → Y%
```

---

## Progress Tracking

### Weekly Progress Report

```markdown
# Week X Progress Report

## Completed This Week
- [ ] Story 1 (#issue)
- [ ] Story 2 (#issue)

## Metrics
- Backend Coverage: X% → Y% (+Z%)
- Frontend Coverage: X% → Y% (+Z%)
- Files >500 lines: X → Y
- Test Execution Time: Xs → Ys

## Blockers Resolved
1. Blocker 1
2. Blocker 2

## Upcoming Next Week
1. Story 3
2. Story 4

## Risks/Issues
- Risk 1: [Status/mitigation]
```

---

## How to Use This Structure

### For Product Owners/Managers:
1. Create milestones first
2. Create epics for each phase
3. Break down epics into stories
4. Assign stories to sprints
5. Track progress via project views

### For Developers:
1. Pick stories from "Ready for Development"
2. Move to "In Progress" when starting
3. Create branch: `test/story-name` or `refactor/story-name`
4. Link PR to issue
5. Move to "In Review" when PR is ready
6. Auto-closes to "Done" when merged

### For Sprint Planning:
1. Review "By Sprint" view
2. Ensure sprint is fully planned 2 weeks ahead
3. Check capacity vs committed effort
4. Identify dependencies

### For Retrospectives:
1. Review "Done" items for the sprint
2. Check velocity (planned hours vs actual)
3. Identify blockers
4. Update estimates for remaining work

---

## Next Steps

1. **Create the GitHub Project** using instructions above
2. **Import Sprint 1 tickets** from `SPRINT_1_TICKETS.md`
3. **Create epics** for each phase
4. **Set up automation** with labeler and auto-close
5. **Schedule sprint planning** for Sprint 1
6. **Begin development** on Monday

---

**Project Owner:** [Your Name]
**Start Date:** [Date]
**Expected Completion:** [Date + 14 weeks]
**Current Sprint:** Sprint 1
**Current Phase:** Phase 1: Testing
