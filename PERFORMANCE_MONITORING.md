# Performance Monitoring Guide

This guide explains how to monitor the performance impact of session management changes.

## Session Management Monitoring

### Key Metrics to Track

#### 1. Database Performance

**Session Table Size:**
```sql
-- Check total sessions
SELECT COUNT(*) FROM django_session;

-- Check expired sessions
SELECT COUNT(*) FROM django_session WHERE expire_date < NOW();

-- Check table size
SELECT pg_size_pretty(pg_total_relation_size('django_session')) as size;
```

**Session Write Frequency:**
```sql
-- Monitor session updates (requires pg_stat_statements extension)
SELECT calls, total_exec_time, mean_exec_time, query
FROM pg_stat_statements
WHERE query LIKE '%django_session%'
ORDER BY calls DESC;
```

#### 2. Middleware Performance

**Check Session Update Frequency:**
```python
# In Django shell (python manage.py shell)
from django.contrib.sessions.models import Session
from django.utils import timezone
from datetime import timedelta

# Sessions updated in last hour
recent = Session.objects.filter(
    expire_date__gte=timezone.now(),
    expire_date__lte=timezone.now() + timedelta(hours=1)
).count()

print(f"Sessions updated in last hour: {recent}")
```

**Monitor Last Activity Tracking:**
```python
# Check sessions with last_activity set
from django.contrib.sessions.models import Session
import json

sessions_with_activity = 0
for session in Session.objects.all()[:100]:  # Sample first 100
    data = session.get_decoded()
    if 'last_activity' in data:
        sessions_with_activity += 1

print(f"Sessions with last_activity: {sessions_with_activity}/100")
```

#### 3. Application Performance

**Database Connection Pool:**
```python
# Monitor active connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'your_database_name';

# Check for connection bottlenecks
SELECT state, count(*)
FROM pg_stat_activity
WHERE datname = 'your_database_name'
GROUP BY state;
```

**Response Times:**
- Monitor average response times before/after deployment
- Use Django Debug Toolbar in development
- Use APM tools (e.g., New Relic, Datadog) in production

### Expected Performance Impact

#### Before Throttling (SESSION_SAVE_EVERY_REQUEST=True)
- **Session writes:** 1 per request
- **DB load:** High (every page view writes to DB)
- **Estimated writes/day:** ~100,000 (1000 users × 100 requests/day)

#### After Throttling (ThrottledSessionMiddleware)
- **Session writes:** 1 per 15 minutes per active user
- **DB load:** Reduced by ~85%
- **Estimated writes/day:** ~15,000 (1000 users × 96 updates/day ÷ 6.4)

### Monitoring Schedule

**Daily:**
- Check session cleanup logs
- Verify session table size is stable

**Weekly:**
- Review database query performance
- Check for slow queries related to sessions
- Verify no connection pool exhaustion

**Monthly:**
- Analyze session update patterns
- Review user login/logout trends
- Assess if throttle interval needs adjustment

## Cleanup Service Monitoring

### Check Cleanup Service Status

**Docker logs:**
```bash
# Production
docker logs nba_props_session_cleanup -f

# Development
docker-compose -f docker-compose.dev.yml logs -f session-cleanup
```

**Expected output:**
```
[Session Cleanup] Running cleanup at Sat Nov  9 14:00:00 UTC 2025
Successfully deleted 150 expired sessions. Remaining: 1250 sessions
[Session Cleanup] Next run in 24 hours
```

### Verify Cleanup Effectiveness

**Before cleanup:**
```sql
SELECT
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE expire_date < NOW()) as expired_sessions,
    COUNT(*) FILTER (WHERE expire_date >= NOW()) as active_sessions
FROM django_session;
```

**After cleanup:**
```sql
-- Should show 0 expired sessions
SELECT COUNT(*) FROM django_session WHERE expire_date < NOW();
```

## Alerting Recommendations

### Critical Alerts

1. **Session table size exceeds 100MB**
   - Indicates cleanup may not be running
   - Check session-cleanup service logs

2. **Database connection pool exhausted**
   - May indicate session-related query bottleneck
   - Review slow query logs

3. **Session cleanup service not running**
   - Check Docker service status
   - Restart session-cleanup service

### Warning Alerts

1. **Session updates exceed 1000/minute**
   - Middleware may not be throttling properly
   - Review middleware configuration

2. **Expired sessions accumulating (>1000)**
   - Cleanup service may have failed
   - Manual cleanup required: `python manage.py clearsessions`

## Performance Benchmarking

### Before Deployment

```bash
# Run load test to establish baseline
ab -n 1000 -c 10 http://yourdomain.com/

# Monitor database during load test
SELECT * FROM pg_stat_database WHERE datname = 'your_database';
```

### After Deployment

```bash
# Run same load test
ab -n 1000 -c 10 http://yourdomain.com/

# Compare results:
# - Requests per second should be similar or improved
# - Database writes should be significantly reduced
# - Response times should be stable
```

## Troubleshooting

### High Database Load

**Symptoms:** Slow response times, high CPU on database

**Investigation:**
```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%django_session%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Solutions:**
- Verify ThrottledSessionMiddleware is enabled
- Check session table has proper indexes
- Consider increasing throttle interval

### Session Table Growing Rapidly

**Symptoms:** Table size increases >10MB/day

**Investigation:**
```bash
# Check cleanup service logs
docker logs nba_props_session_cleanup --tail 100

# Verify cleanup is deleting sessions
python manage.py clearsessions --dry-run
```

**Solutions:**
- Restart session-cleanup service
- Run manual cleanup
- Reduce SESSION_COOKIE_AGE if appropriate

### Users Getting Logged Out

**Symptoms:** Complaints about frequent logouts

**Investigation:**
```python
# Check if middleware is setting last_activity
# In production logs, look for middleware errors
grep "ThrottledSessionMiddleware" /var/log/django/*.log
```

**Solutions:**
- Verify middleware is in MIDDLEWARE setting
- Check middleware is after SessionMiddleware
- Increase throttle interval in middleware (currently 15 min)

## Rollback Plan

If session changes cause issues:

### 1. Quick Rollback (Disable Middleware)
```python
# In settings.py, comment out:
# 'nba_predictions.middleware.ThrottledSessionMiddleware',

# Restart application
docker-compose restart web-blue web-green
```

### 2. Full Rollback (Previous Behavior)
```python
# In settings.py, set:
SESSION_SAVE_EVERY_REQUEST = True

# Remove middleware from MIDDLEWARE list

# Restart application
```

### 3. Emergency Session Cleanup
```bash
# If session table is causing issues
python manage.py clearsessions

# Or manually truncate (CAUTION: logs out all users)
# python manage.py shell
# from django.contrib.sessions.models import Session
# Session.objects.all().delete()
```

## Metrics Dashboard

Consider setting up a dashboard with:

1. **Session metrics:**
   - Total sessions
   - Expired sessions
   - Session table size
   - Session updates per hour

2. **Application metrics:**
   - Response time (p50, p95, p99)
   - Request rate
   - Error rate

3. **Database metrics:**
   - Query execution time
   - Connection count
   - Table sizes

Tools: Grafana + Prometheus, Datadog, New Relic, or custom Django management command.
