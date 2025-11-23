# Production-Grade CI/CD Pipeline Guide

## 🎯 Overview

This document describes the FAANG-level CI/CD pipeline for the NBA Predictions application. The pipeline uses Docker, GitHub Actions, and industry best practices for automated testing, security scanning, and deployment.

## 📋 Table of Contents

1. [Architecture](#architecture)
2. [Test Suite](#test-suite)
3. [CI/CD Pipeline](#cicd-pipeline)
4. [Docker Integration](#docker-integration)
5. [Quality Gates](#quality-gates)
6. [Security](#security)
7. [Performance](#performance)
8. [Troubleshooting](#troubleshooting)

## 🏗️ Architecture

### Pipeline Stages

```
┌─────────────────┐
│  Pull Request   │
└────────┬────────┘
         │
         ├─────────────────────────────────────────────────────┐
         │                                                       │
         ▼                                                       ▼
┌────────────────────┐                            ┌──────────────────────┐
│  Code Quality &    │                            │   Frontend Tests     │
│  Security Checks   │                            │   (Jest + RTL)       │
│  • Black           │                            │   • Unit Tests       │
│  • isort           │                            │   • Component Tests  │
│  • Flake8          │                            │   • Coverage Report  │
│  • Bandit          │                            └──────────┬───────────┘
│  • Safety          │                                       │
└────────┬───────────┘                                       │
         │                                                    │
         ├────────────────────────────┬───────────────────────┤
         │                            │                       │
         ▼                            ▼                       ▼
┌────────────────────┐   ┌───────────────────────┐  ┌─────────────────┐
│  Backend Tests     │   │   Build Docker        │  │  Build Assets   │
│  (Django + Docker) │   │   Image & Scan        │  │  (Webpack)      │
│  • Model Tests     │   │   • Buildx Cache      │  │  • Production   │
│  • API Tests       │   │   • Trivy Security    │  │  • Verification │
│  • PostgreSQL      │   │   • Layer Analysis    │  └────────┬────────┘
│  • Coverage        │   └───────────┬───────────┘           │
└────────┬───────────┘               │                       │
         │                            │                       │
         └────────────────┬───────────┴───────────────────────┘
                          │
                          ▼
                ┌──────────────────────┐
                │ Integration Tests    │
                │  (Docker Compose)    │
                │  • Full Stack        │
                │  • Service Health    │
                │  • E2E Scenarios     │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │  Quality Gates &     │
                │  Test Summary        │
                │  • Pass/Fail         │
                │  • PR Comment        │
                │  • Artifacts         │
                └──────────────────────┘
```

## 🧪 Test Suite

### End-to-End Tests (Playwright)

**Test Coverage:**
- **User Registration & Login** - New user signup, login validation, session management
- **Prediction Submission** - Form filling, drag-and-drop, validation, successful submission
- **Payment Flow** - Payment modal, Stripe integration, confirmation
- **Leaderboard** - Loading, rankings display, navigation, responsive design

**Running E2E Tests:**
```bash
# Run all E2E tests
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run with UI (interactive)
npm run test:e2e:ui

# Run specific browser
npm run test:e2e:chromium

# View report
npm run test:e2e:report
```

**Key Features:**
- Tests real user flows end-to-end
- Multi-browser support (Chromium, Firefox, WebKit, Mobile)
- Automatic screenshots and videos on failure
- Trace viewer for debugging
- Parallel execution support

### Frontend Tests (63 tests passing)

**Technology Stack:**
- Jest 30.2.0
- React Testing Library 16.3.0
- @testing-library/jest-dom 6.9.1
- @testing-library/user-event 14.6.1

**Test Coverage:**
```
frontend/src/
├── components/__tests__/
│   ├── PredictionRow.test.jsx (11 tests)
│   ├── CategoryIcon.test.jsx (10 tests)
│   ├── Loader.test.js (6 tests)
│   ├── ProgressBar.test.jsx (14 tests)
│   └── ReadOnlyStandingsList.test.js (13 tests)
└── utils/__tests__/
    └── csrf.test.js (9 tests)
```

**Running Locally:**
```bash
# Run once
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage

# CI mode
npm run test:ci
```

### Backend Tests (23 tests passing)

**Technology Stack:**
- Django 4.2.6 TestCase
- PostgreSQL 15 (test database)
- Coverage.py

**Test Coverage:**
```
backend/predictions/tests/
├── test_basic.py (3 tests)
│   ├── Django setup
│   ├── User creation
│   └── Database connection
├── test_models_comprehensive.py (20 tests)
│   ├── Season model (5 tests)
│   ├── Team model (4 tests)
│   ├── Player model (2 tests)
│   ├── PlayerStat model (4 tests)
│   ├── StandingPrediction model (3 tests)
│   └── PlayoffPrediction model (2 tests)
└── test_api_v2_comprehensive.py
    ├── Teams API tests
    ├── Leaderboard API tests
    └── Seasons API tests
```

**Running Locally:**
```bash
# All tests
venv/bin/python backend/manage.py test predictions.tests

# Specific test file
venv/bin/python backend/manage.py test predictions.tests.test_models_comprehensive

# With coverage
coverage run --source='backend' backend/manage.py test predictions.tests
coverage report
coverage html  # Open htmlcov/index.html
```

## 🚀 CI/CD Pipeline

### Workflow Files


- **`.github/workflows/pr-tests-docker.yml`** - Main PR testing workflow (Docker-based)
- **`.github/workflows/test-pr.yml`** - Legacy PR testing workflow

### Pipeline Features

#### 1. Code Quality & Security
- **Black**: Code formatting verification
- **isort**: Import sorting verification
- **Flake8**: Syntax and style checking
- **Bandit**: Security vulnerability scanning
- **Safety**: Dependency vulnerability checking

#### 2. Parallel Test Execution
- Frontend and backend tests run in parallel
- Separate jobs for different test suites
- ~50% faster than sequential execution

#### 3. Docker Integration
- Production-identical testing environment
- PostgreSQL 15 Alpine for database tests
- Docker Buildx with layer caching
- Multi-stage build optimization

#### 4. Security Scanning
- **Trivy**: Container image vulnerability scanning
- **Bandit**: Python security linting
- **Safety**: Python dependency checking
- SARIF format reports for GitHub Security tab

#### 5. Intelligent Caching
- Docker layer caching (Buildx)
- npm package caching
- pip package caching
- ~70% cache hit rate in typical workflows

#### 6. Integration Testing
- Full stack testing with Docker Compose
- Service health checks
- Database migration verification
- API endpoint smoke tests

## 🐳 Docker Integration

### Development Workflow

```bash
# Local development with PostgreSQL
docker-compose -f docker-compose.dev.yml --env-file .env.dev.local up

# Production database testing
docker-compose -f docker-compose.dev-prod-db.yml --env-file .env.dev.prod-db up

# Rebuild after changes
docker-compose -f docker-compose.dev.yml build --no-cache web
```

### CI/CD Docker Usage

The pipeline uses Docker in multiple stages:

1. **Backend Tests**: PostgreSQL service container
2. **Docker Build**: Full image build with Buildx
3. **Integration Tests**: Docker Compose multi-service setup

### Dockerfile Optimization

```dockerfile
# Multi-stage build
FROM python:3.12-slim as builder
# Install dependencies
RUN pip install --user -r requirements.txt

FROM python:3.12-slim
# Copy only necessary files
COPY --from=builder /root/.local /root/.local
```

## ✅ Quality Gates

### Required Checks

All PRs must pass these checks to merge:

1. ✅ **Frontend Tests**: All Jest tests pass
2. ✅ **Backend Tests**: All Django tests pass
3. ✅ **Docker Build**: Image builds successfully
4. ✅ **Integration Tests**: Full stack tests pass
5. ✅ **Build Verification**: Production assets generated
6. ⚠️ **Code Quality**: Warnings allowed, errors block

### Coverage Requirements

- **Minimum**: 60% for new code
- **Target**: 80% overall coverage
- **Critical Paths**: 90%+ coverage required

### Performance Budgets

- **Bundle Size**: < 1MB (gzipped)
- **Test Duration**: < 5 minutes (frontend + backend)
- **Build Time**: < 10 minutes (full pipeline)

## 🔒 Security

### Automated Security Checks

#### 1. Dependency Scanning
```bash
# Python dependencies
safety check --json

# JavaScript dependencies
npm audit --production
```

#### 2. Code Security
```bash
# Python security linting
bandit -r backend/ -ll

# Detect secrets in code
git secrets --scan
```

#### 3. Container Scanning
```bash
# Trivy image scanning
trivy image --severity HIGH,CRITICAL myimage:latest
```

### Security Best Practices

- ✅ No hardcoded secrets
- ✅ Environment variables for sensitive data
- ✅ Regular dependency updates
- ✅ HTTPS only in production
- ✅ CSRF protection enabled
- ✅ SQL injection prevention (Django ORM)
- ✅ XSS protection (React escaping)

## ⚡ Performance

### Pipeline Performance

- **Average Duration**: 8-12 minutes
- **Parallel Jobs**: 6 concurrent jobs
- **Cache Hit Rate**: ~70%
- **Monthly Build Minutes**: ~2,400 (estimate)

### Optimization Techniques

#### 1. Caching Strategy
```yaml
- name: Cache Docker layers
  uses: actions/cache@v4
  with:
    path: /tmp/.buildx-cache
    key: ${{ runner.os }}-buildx-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-buildx-
```

#### 2. Dependency Caching
```yaml
- name: Set up Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '18'
    cache: 'npm'
```

#### 3. Concurrency Control
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number }}
  cancel-in-progress: true
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Tests Failing Locally But Pass in CI

**Cause**: Environment differences

**Solution**:
```bash
# Use the same Node version as CI
nvm use 18

# Use the same Python version
pyenv global 3.12

# Clear caches
npm test -- --clearCache
rm -rf backend/**/__pycache__
```

#### 2. Docker Build Fails

**Cause**: Cache corruption or resource limits

**Solution**:
```bash
# Clear Docker cache
docker builder prune -af

# Rebuild without cache
docker-compose build --no-cache
```

#### 3. Database Connection Errors in Tests

**Cause**: PostgreSQL not ready or wrong credentials

**Solution**:
```yaml
# Add health check in CI
services:
  postgres:
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

#### 4. Frontend Tests Timeout

**Cause**: React Query or async operations not properly awaited

**Solution**:
```javascript
// Use waitFor from testing-library
import { waitFor } from '@testing-library/react';

await waitFor(() => {
  expect(result.current.isLoading).toBe(false);
});
```

### Debug Mode

Enable verbose logging in CI:

```yaml
- name: Run tests with debug
  run: npm test -- --verbose
  env:
    DEBUG: '*'
```

## 📊 Monitoring & Reporting

### Test Reports

Test results are automatically uploaded as artifacts:

- **Frontend Coverage**: `coverage/lcov.info`
- **Backend Coverage**: `htmlcov/`
- **Security Scans**: `bandit-report.json`, `trivy-results.sarif`
- **Docker Logs**: `docker-compose-logs.txt`

### Accessing Reports

1. Go to Actions tab in GitHub
2. Click on workflow run
3. Scroll to Artifacts section
4. Download desired report

### PR Comments

The pipeline automatically comments on PRs with:

```markdown
## 🧪 Test Results Summary

| Check | Status |
|-------|--------|
| Code Quality & Security | ✅ success |
| Frontend Tests (Jest) | ✅ success |
| Backend Tests (Django) | ✅ success |
| Docker Build | ✅ success |
| Integration Tests | ✅ success |
| Build Verification | ✅ success |

### ✅ All checks passed! Ready to merge.
```

## 🚢 Deployment

### Production Deployment

After PR is merged to `main`:

```yaml
# Automated deployment (configure in separate workflow)
- Push Docker image to registry
- Update kubernetes/docker-swarm config
- Run database migrations
- Health check
- Gradual rollout (blue-green or canary)
```

### Manual Deployment

```bash
# Build production image
docker build -t myapp:latest .

# Push to registry
docker push myapp:latest

# Deploy to server
ssh production "cd /app && docker-compose pull && docker-compose up -d"
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [Django Testing](https://docs.djangoproject.com/en/4.2/topics/testing/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [TESTING.md](./TESTING.md) - Detailed testing guide
- [TEST_QUICK_START.md](./TEST_QUICK_START.md) - Quick reference

## 🤝 Contributing

When adding new features:

1. ✅ Write tests first (TDD)
2. ✅ Ensure tests pass locally
3. ✅ Run linters (`black`, `flake8`)
4. ✅ Update documentation
5. ✅ Create PR and wait for CI checks
6. ✅ Address any failures
7. ✅ Request review

## 📝 Changelog

### v1.1.0 (Current)
- ✅ End-to-end tests (Playwright) - 4 critical user flows
- ✅ 63 frontend tests (Jest + RTL)
- ✅ 23 backend tests (Django)
- ✅ Docker-based CI/CD pipeline
- ✅ Security scanning (Trivy, Bandit, Safety)
- ✅ Parallel test execution
- ✅ Intelligent caching
- ✅ Integration testing
- ✅ Quality gates
- ✅ PR comments with results
- ✅ Multi-browser E2E testing

---

**Maintained by**: Development Team
**Last Updated**: 2025-01-20
**Pipeline Version**: 1.0.0
