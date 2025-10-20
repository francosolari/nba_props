# Quick Reference - Admin Grading & Odds Tracking

## 🚀 Quick Start

```bash
# 1. Install dependencies
pip install playwright
playwright install chromium

# 2. Run migrations
venv/bin/python backend/manage.py makemigrations
venv/bin/python backend/manage.py migrate

# 3. Rebuild frontend
npm run build

# 4. Scrape odds
cd backend && python nba_scrape_db.py

# 5. Access admin panel
# http://localhost:8000/admin-grading/
```

---

## 📍 Key URLs

| Feature | URL |
|---------|-----|
| Admin Grading Panel | `/admin-grading/` |
| API Documentation | `/api/v2/docs/` |
| Current Odds | `/api/v2/odds/current/current` |
| Scoring Positions | `/api/v2/odds/scoring-positions/current` |
| Grading Audit | `/api/v2/admin/grading/audit/current` |

---

## 🎯 Common Commands

### Scraping Odds

```bash
# Direct script
cd backend && python nba_scrape_db.py

# Management command
venv/bin/python backend/manage.py scrape_award_odds

# Specific season
venv/bin/python backend/manage.py scrape_award_odds 2024-25
```

### Grading

```bash
# Grade all props/awards
venv/bin/python backend/manage.py grade_props_answers current

# Grade standings
venv/bin/python backend/manage.py grade_standing_predictions current

# Grade IST
venv/bin/python backend/manage.py grade_ist_predictions current
```

### Update Leaders from Odds

```python
from predictions.models import SuperlativeQuestion

# Update all questions
for q in SuperlativeQuestion.objects.filter(is_finalized=False):
    q.update_from_latest_odds()
    print(f"{q.award.name}: {q.current_leader} ({q.current_leader_odds})")
```

### Finalize Questions

```python
from predictions.models import SuperlativeQuestion

mvp = SuperlativeQuestion.objects.get(award__name='Most Valuable Player')
mvp.finalize_winners('Nikola Jokic')
```

---

## 📊 API Quick Examples

### Get Current Odds

```bash
curl http://localhost:8000/api/v2/odds/current/current
```

### Get Scoring Positions

```bash
curl http://localhost:8000/api/v2/odds/scoring-positions/current
```

### Manual Grade Answer (Admin)

```bash
curl -X POST http://localhost:8000/api/v2/admin/grading/grade-manual \
  -H "Content-Type: application/json" \
  -d '{
    "answer_id": 123,
    "is_correct": true,
    "correct_answer": "Luka Doncic"
  }'
```

### Finalize Question (Admin)

```bash
curl -X POST http://localhost:8000/api/v2/admin/grading/finalize-question/42 \
  -d "correct_answer=Nikola Jokic"
```

---

## 🗂️ File Locations

| File Type | Location |
|-----------|----------|
| Odds CSV Backups | `backend/odds_data/` |
| Grading Logs | `backend/*.log` |
| Admin Panel | `frontend/src/pages/AdminGradingPanel.jsx` |
| Scraper | `backend/nba_scrape_db.py` |

---

## 🔑 Key Models & Methods

### Odds Model

```python
from predictions.models import Odds

# Get latest odds for MVP
odds = Odds.objects.filter(
    award__name='Most Valuable Player',
    season__slug='2024-25'
).order_by('-scraped_at', 'rank')[:5]
```

### SuperlativeQuestion

```python
from predictions.models import SuperlativeQuestion

q = SuperlativeQuestion.objects.get(id=42)

# Update from latest odds
q.update_from_latest_odds()

# Get scoring position players
positions = q.get_scoring_position_players()
# Returns: {'leader': {...}, 'runner_up': {...}, 'last_updated': ...}

# Finalize
q.finalize_winners('Player Name')
```

---

## 🎨 Frontend Integration

### Display Odds

```jsx
import { useQuery } from '@tanstack/react-query';

const { data } = useQuery({
  queryKey: ['odds', seasonSlug],
  queryFn: () => axios.get(`/api/v2/odds/current/${seasonSlug}`)
});

// data.awards[0].player_odds[0].player_name
// data.awards[0].player_odds[0].odds
// data.awards[0].player_odds[0].in_scoring_position
```

### Display Scoring Positions

```jsx
const { data } = useQuery({
  queryKey: ['scoring-positions', seasonSlug],
  queryFn: () => axios.get(`/api/v2/odds/scoring-positions/${seasonSlug}`)
});

// data.awards[0].leader.player_name
// data.awards[0].leader.odds
// data.awards[0].runner_up.player_name
```

---

## ⚠️ Important Notes

### LOCAL ONLY
- ❌ Odds scraping (NBA API blocked on production)
- ❌ Automated grading commands
- ✅ Manual grading via admin panel (works in production)
- ✅ Odds API endpoints (work in production)

### Weekly Workflow
1. Run scraper locally
2. Verify CSV backup
3. Sync database to production
4. Users see updated odds

### End of Season
1. Wait for actual award winners
2. Finalize all questions
3. Re-run grading
4. Verify final leaderboard

---

## 🐛 Quick Fixes

### Scraper fails
```bash
# Check Playwright
playwright install chromium

# Run with visible browser
# Edit nba_scrape_db.py: headless=False
```

### Leader is None
```python
# Update from odds
from predictions.models import SuperlativeQuestion
for q in SuperlativeQuestion.objects.all():
    q.update_from_latest_odds()
```

### Admin panel blank
```bash
npm run build
venv/bin/python backend/manage.py collectstatic
```

### Migrations needed
```bash
venv/bin/python backend/manage.py makemigrations predictions
venv/bin/python backend/manage.py migrate
```

---

## 📚 Full Documentation

- **ADMIN_GRADING_GUIDE.md** - Complete grading docs
- **ODDS_TRACKING_GUIDE.md** - Complete odds docs
- **DEPLOYMENT_SUMMARY.md** - Deployment checklist
- **API Docs** - `/api/v2/docs/`

---

## ✨ Quick Wins

```bash
# See who's leading all awards
venv/bin/python backend/manage.py shell
```

```python
from predictions.models import SuperlativeQuestion

for q in SuperlativeQuestion.objects.filter(season__slug='2024-25'):
    print(f"{q.award.name}")
    print(f"  🥇 {q.current_leader} ({q.current_leader_odds})")
    if q.current_runner_up:
        print(f"  🥈 {q.current_runner_up} ({q.current_runner_up_odds})")
    print()
```

```bash
# Check latest odds scrape
venv/bin/python backend/manage.py shell
```

```python
from predictions.models import Odds
latest = Odds.objects.order_by('-scraped_at').first()
print(f"Latest scrape: {latest.scraped_at}")
print(f"Total odds entries: {Odds.objects.count()}")
```

---

**Need help?** Check the full guides or visit `/api/v2/docs/`
