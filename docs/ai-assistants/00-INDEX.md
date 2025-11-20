# AI Assistant Documentation Index

**Welcome to the modular documentation system for the NBA Predictions Game project.**

This documentation is designed for on-demand loading to minimize context consumption. Load only the files you need for your specific task.

## Quick Reference

**Project**: NBA Predictions Game
**Tech Stack**: Django 4.2 + React 18 + PostgreSQL + Django Ninja (API v2)
**Architecture**: Polymorphic models, Blue-green deployment, TanStack Query
**Issue Tracking**: bd (beads) - DO NOT use markdown TODOs

## Documentation Structure

### Core Documentation

| File | Title | Load When |
|------|-------|-----------|
| [01-overview.md](./01-overview.md) | Project Overview | Starting work, need high-level understanding |
| [02-development-setup.md](./02-development-setup.md) | Development Setup | Setting up environment, running commands |
| [03-architecture.md](./03-architecture.md) | Architecture | Understanding system design, data flow, patterns |

### Backend Documentation

| File | Title | Load When |
|------|-------|-----------|
| [04-backend-django.md](./04-backend-django.md) | Django Patterns | Working with models, ORM, polymorphism |
| [05-backend-api.md](./05-backend-api.md) | API Development | Creating/modifying API endpoints |
| [07-database-models.md](./07-database-models.md) | Database Models | Schema, relationships, migrations |

### Frontend Documentation

| File | Title | Load When |
|------|-------|-----------|
| [06-frontend-react.md](./06-frontend-react.md) | React Patterns | Working with React components, hooks |

### Process Documentation

| File | Title | Load When |
|------|-------|-----------|
| [08-common-tasks.md](./08-common-tasks.md) | Common Tasks | Step-by-step guides for specific tasks |
| [09-git-workflow.md](./09-git-workflow.md) | Git & bd Workflow | Commits, PRs, issue tracking |
| [10-deployment.md](./10-deployment.md) | Deployment | Docker, CI/CD, production |
| [11-security-best-practices.md](./11-security-best-practices.md) | Security | Auth, validation, security patterns |
| [12-testing.md](./12-testing.md) | Testing | Writing and running tests |

## Task-to-Documentation Mapping

| Task | Load These Files |
|------|------------------|
| **First time setup** | 01, 02 |
| **Understand architecture** | 01, 03 |
| **Add new model** | 04, 07 |
| **Create API endpoint** | 05, 04 |
| **Build React page** | 06, 05 |
| **Add question type** | 04, 08 |
| **Debug query performance** | 04, 07 |
| **Grade user answers** | 08, 04 |
| **Deploy changes** | 10, 09 |
| **Fix security issue** | 11 |
| **Write tests** | 12 |
| **Create PR** | 09 |
| **Use bd (beads)** | 09 |

## Critical Information

### bd (beads) Issue Tracking

**REQUIRED**: Use bd for ALL task tracking. DO NOT use markdown TODOs.

```bash
# Quick reference
bd ready --json                    # Check ready work
bd create "Task" -t task -p 2      # Create task
bd update bd-42 --status in_progress  # Claim task
bd close bd-42 --reason "Done"     # Complete task
```

**Always commit `.beads/issues.jsonl` with code changes.**

### Git Branch Naming

**CRITICAL**: Branches must start with `claude/` and end with session ID, or push will fail with 403.

```bash
# Correct
claude/feature-name-01QaEyvXmCwjEcsp9uAwaNQp

# Incorrect (will fail)
feature-name
fix/bug-description
```

### API Development

**Always use API v2 (Django Ninja)** for new endpoints. API v1 is being deprecated.

Location: `predictions/api/v2/`
Documentation: `/api/v2/docs/`

### Polymorphic Models

**Always use `.get_real_instance()`** when accessing subtype fields:

```python
question = Question.objects.get(id=1)
real_question = question.get_real_instance()
if isinstance(real_question, SuperlativeQuestion):
    print(real_question.award.name)
```

### Development Commands

```bash
# Start development (Django + Webpack)
npm run dev

# Run migrations
venv/bin/python backend/manage.py migrate

# Grade answers
venv/bin/python backend/manage.py grade_props_answers 2024-25

# Build frontend
npm run build
```

## Important Reminders

### DO ✅

- Use bd (beads) for all task tracking
- Start branch names with `claude/` + session ID
- Use API v2 (Django Ninja) for new endpoints
- Use `.get_real_instance()` for polymorphic models
- Include CSRF token in POST requests
- Validate input on backend
- Test locally before deploying
- Update documentation when changing features
- Commit `.beads/issues.jsonl` with code

### DON'T ❌

- Create markdown TODO lists
- Push to main branch directly
- Use API v1 for new endpoints
- Commit secrets or .env files
- Skip migrations after model changes
- Use raw SQL (prefer Django ORM)
- Deploy without testing
- Forget to rebuild frontend after changes
- Use `git push --force` (use `--force-with-lease`)

## How to Use This Guide

### For AI Assistants

1. **Start here** - Read this index to understand structure
2. **Identify task** - Use task mapping table to find relevant files
3. **Load selectively** - Only load files needed for current task
4. **Cross-reference** - Each file links to related documentation
5. **Update as needed** - Keep documentation in sync with code

### Example Workflow

**Task: Add new API endpoint for playoff brackets**

1. Check index → "Create API endpoint" → Load files 05, 04
2. Read 05-backend-api.md for endpoint creation steps
3. Reference 04-backend-django.md for model queries
4. Follow step-by-step guide in 08-common-tasks.md if needed
5. Use 09-git-workflow.md for commit and PR

### Example Workflow 2

**Task: Debug slow leaderboard query**

1. Check index → "Debug query performance" → Load files 04, 07
2. Read 04-backend-django.md for ORM optimization
3. Check 07-database-models.md for relationship structure
4. Apply `select_related()` / `prefetch_related()`
5. Test with Django Debug Toolbar

## Project-Specific Patterns

### Season-Based Scoping

Most features are scoped to an NBA season (slug like "2024-25"):
- Questions belong to seasons
- Predictions are per-season
- Leaderboards are per-season
- Get current: `Season.objects.order_by('-end_date').first()`

### Component Mounting

React components mount to Django template elements by ID:

```javascript
// frontend/src/index.jsx
mountComponent(HomePage, 'home-root', 'HomePage');
```

```html
<!-- Django template -->
<div id="home-root" data-season-slug="2024-25"></div>
```

### Blue-Green Deployment

- Two containers: `web-blue` (8000) and `web-green` (8002)
- Deploy to inactive, health check, switch traffic
- Zero downtime, easy rollback

## Getting Help

- **For project context**: Load 01-overview.md
- **For setup issues**: Load 02-development-setup.md
- **For debugging**: Load 08-common-tasks.md
- **For architectural questions**: Load 03-architecture.md
- **For specific tasks**: Use task mapping table above

---

## Quick Start Checklist

For a new AI assistant starting on this project:

- [ ] Read this index file (00-INDEX.md)
- [ ] Load 01-overview.md for project context
- [ ] Understand bd (beads) usage (see 09-git-workflow.md)
- [ ] Know git branch naming requirements
- [ ] Understand API v2 is current (v1 deprecated)
- [ ] Know about polymorphic models and `.get_real_instance()`
- [ ] Load task-specific documentation as needed

---

**Last Updated**: 2025-11-20
**Documentation Version**: 1.0
**Project**: NBA Predictions Game
