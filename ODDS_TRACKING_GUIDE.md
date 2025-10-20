# NBA Award Odds Tracking System

## Overview

The Odds Tracking System automates the collection and management of betting odds for NBA awards. Instead of relying on Google Sheets, all odds data is now stored in the database, providing:

- **Historical tracking** of odds changes over time
- **Automatic leader/runner-up updates** on SuperlativeQuestions
- **User-facing odds display** so players can see who's in scoring position
- **CSV backups** for manual monitoring
- **API endpoints** for integrating odds into the frontend

---

## Database Models

### Enhanced `Odds` Model

Located in `backend/predictions/models/award.py`

**Fields**:
- `player` - ForeignKey to Player
- `award` - ForeignKey to Award
- `season` - ForeignKey to Season
- `odds_value` - American format odds (e.g., "+500", "-200")
- `decimal_odds` - Auto-calculated decimal representation
- `implied_probability` - Auto-calculated win probability (0-100)
- `scraped_at` - Timestamp when odds were captured
- `source` - Betting source (default: "DraftKings")
- `rank` - Player's rank at scrape time (1 = favorite)

**Features**:
- Automatic conversion from American to decimal odds
- Implied probability calculation
- Indexed for fast querying by award/season/time

**Example**:
```python
# Odds for Nikola Jokic to win MVP
Odds.objects.create(
    player=jokic,
    award=mvp_award,
    season=season_2024_25,
    odds_value="+150",
    rank=1
)
# Auto-calculates:
# decimal_odds = 2.50
# implied_probability = 40.00
```

### Enhanced `SuperlativeQuestion` Model

Located in `backend/predictions/models/question.py`

**New Fields**:
- `current_leader` - FK to Player (automatically updated from odds)
- `current_leader_odds` - Current odds for leader
- `current_runner_up` - FK to Player (second place)
- `current_runner_up_odds` - Current odds for runner-up
- `last_odds_update` - When odds were last synced

**New Methods**:
- `update_from_latest_odds()` - Syncs leader/runner-up from latest scrape
- `get_scoring_position_players()` - Returns dict with current top 2
- `finalize_winners(winner_name)` - Locks in final winner

**Example**:
```python
question = SuperlativeQuestion.objects.get(award__name='Most Valuable Player')
question.update_from_latest_odds()

print(f"Leader: {question.current_leader} ({question.current_leader_odds})")
# Output: "Leader: Nikola Jokic (+150)"

print(f"Runner-up: {question.current_runner_up} ({question.current_runner_up_odds})")
# Output: "Runner-up: Shai Gilgeous-Alexander (+200)"
```

---

## Scraping System

### Main Scraper: `backend/nba_scrape_db.py`

**What it does**:
1. Scrapes DraftKings for all 6 NBA award odds
2. Saves to `Odds` table with historical tracking
3. Updates `SuperlativeQuestion` leader/runner-up fields
4. Exports CSV backup to `backend/odds_data/`

**Usage**:
```bash
cd backend
python nba_scrape_db.py --season-slug current
```

**Awards Scraped**:
- Rookie of the Year
- Most Improved Player
- Regular Season MVP
- 6th Man of the Year
- Defensive Player of the Year
- Clutch Player of the Year

**Output**:
```
==============================================================
NBA Award Odds Scraper - Database Edition
==============================================================
Started at: 2024-10-19 14:30:00

Season: 2024-25 (2024-25)

[1/6] Rookie of the Year
  Scraping...
  Found 25 players
[2/6] Most Improved Player
  Scraping...
  Found 30 players
...

Saving to database...
  Saved 150 odds entries
  Updated 6 questions

Saving CSV backup...
  CSV backup saved: backend/odds_data/nba_odds_2024-25_20241019_143012.csv

Completed at: 2024-10-19 14:31:45
==============================================================
```

### Management Command

**Usage**:
```bash
venv/bin/python backend/manage.py scrape_award_odds
venv/bin/python backend/manage.py scrape_award_odds 2024-25
```

**Benefits**:
- Integrated with Django
- Better error handling
- Consistent with other management commands

---

## API Endpoints

All odds endpoints are public and available at `/api/v2/odds/`

### 1. Get Current Odds

```
GET /api/v2/odds/current/{season_slug}
```

Returns latest odds for all awards.

**Response**:
```json
{
  "season_slug": "2024-25",
  "season_year": "2024-25",
  "last_updated": "2024-10-19T14:30:00Z",
  "awards": [
    {
      "award_id": 1,
      "award_name": "Most Valuable Player",
      "player_odds": [
        {
          "player_id": 123,
          "player_name": "Nikola Jokic",
          "odds": "+150",
          "decimal_odds": 2.50,
          "implied_probability": 40.00,
          "rank": 1,
          "in_scoring_position": true
        },
        {
          "player_id": 456,
          "player_name": "Shai Gilgeous-Alexander",
          "odds": "+200",
          "decimal_odds": 3.00,
          "implied_probability": 33.33,
          "rank": 2,
          "in_scoring_position": true
        },
        ...
      ]
    },
    ...
  ]
}
```

### 2. Get Scoring Positions

```
GET /api/v2/odds/scoring-positions/{season_slug}
```

Returns current leader and runner-up for each award (top 2 who get points).

**Response**:
```json
{
  "season_slug": "2024-25",
  "season_year": "2024-25",
  "awards": [
    {
      "award_id": 1,
      "award_name": "Most Valuable Player",
      "question_id": 42,
      "question_text": "Who will win the 2024-25 MVP?",
      "is_finalized": false,
      "leader": {
        "player_id": 123,
        "player_name": "Nikola Jokic",
        "odds": "+150"
      },
      "runner_up": {
        "player_id": 456,
        "player_name": "Shai Gilgeous-Alexander",
        "odds": "+200"
      },
      "last_updated": "2024-10-19T14:30:00Z"
    },
    ...
  ]
}
```

### 3. Get Odds History

```
GET /api/v2/odds/history/{award_id}?season_slug=current&days=30&player_id=123
```

Returns historical odds showing trends over time.

**Response**:
```json
{
  "award_id": 1,
  "award_name": "Most Valuable Player",
  "season_slug": "2024-25",
  "days": 30,
  "history": [
    {
      "timestamp": "2024-09-20T10:00:00Z",
      "players": [
        {
          "player_id": 123,
          "player_name": "Nikola Jokic",
          "odds": "+200",
          "decimal_odds": 3.00,
          "rank": 1
        },
        ...
      ]
    },
    {
      "timestamp": "2024-10-19T14:30:00Z",
      "players": [
        {
          "player_id": 123,
          "player_name": "Nikola Jokic",
          "odds": "+150",
          "decimal_odds": 2.50,
          "rank": 1
        },
        ...
      ]
    }
  ]
}
```

### 4. Get Player Award Odds

```
GET /api/v2/odds/player/{player_id}/awards?season_slug=current
```

Returns all awards a player has odds for.

**Response**:
```json
{
  "player_id": 123,
  "player_name": "Nikola Jokic",
  "season_slug": "2024-25",
  "last_updated": "2024-10-19T14:30:00Z",
  "awards": [
    {
      "award_id": 1,
      "award_name": "Most Valuable Player",
      "odds": "+150",
      "decimal_odds": 2.50,
      "implied_probability": 40.00,
      "rank": 1,
      "in_scoring_position": true
    }
  ]
}
```

---

## Frontend Integration

### Displaying Current Odds

```jsx
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

function AwardOdds({ seasonSlug }) {
  const { data } = useQuery({
    queryKey: ['odds', seasonSlug],
    queryFn: async () => {
      const res = await axios.get(`/api/v2/odds/current/${seasonSlug}`);
      return res.data;
    }
  });

  return (
    <div>
      <h2>Current Award Odds</h2>
      {data?.awards.map(award => (
        <div key={award.award_id}>
          <h3>{award.award_name}</h3>
          <ul>
            {award.player_odds.slice(0, 5).map(player => (
              <li key={player.player_id}>
                {player.player_name}: {player.odds}
                {player.in_scoring_position && ' 🎯'}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

### Showing Scoring Positions

```jsx
function ScoringPositions({ seasonSlug }) {
  const { data } = useQuery({
    queryKey: ['scoring-positions', seasonSlug],
    queryFn: async () => {
      const res = await axios.get(`/api/v2/odds/scoring-positions/${seasonSlug}`);
      return res.data;
    }
  });

  return (
    <div>
      <h2>Players in Scoring Position</h2>
      {data?.awards.map(award => (
        <div key={award.award_id}>
          <h3>{award.award_name}</h3>
          {award.leader && (
            <div>
              🥇 Leader: {award.leader.player_name} ({award.leader.odds})
            </div>
          )}
          {award.runner_up && (
            <div>
              🥈 Runner-up: {award.runner_up.player_name} ({award.runner_up.odds})
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## Workflow

### Weekly Odds Update (Recommended)

**Step 1: Run Scraper Locally**
```bash
cd backend
python nba_scrape_db.py
```

**Step 2: Review CSV Backup**
```bash
ls -la odds_data/
cat odds_data/nba_odds_2024-25_*.csv
```

**Step 3: Verify Updates in Database**
```python
from predictions.models import SuperlativeQuestion

questions = SuperlativeQuestion.objects.filter(season__slug='2024-25')
for q in questions:
    print(f"{q.award.name}:")
    print(f"  Leader: {q.current_leader} ({q.current_leader_odds})")
    print(f"  Runner-up: {q.current_runner_up} ({q.current_runner_up_odds})")
```

**Step 4: Deploy Database Changes**
- If running locally: Database is already updated
- If running in production: Sync database to production server

### End of Season - Finalize Winners

**Option 1: Admin Panel**
1. Go to `/admin/predictions/superlativequestion/`
2. Edit each question
3. Set `correct_answer` to actual winner's name
4. Check `is_finalized`
5. Save

**Option 2: API**
```bash
curl -X POST http://localhost:8000/api/v2/admin/grading/finalize-question/42 \
  -d "correct_answer=Nikola Jokic"
```

**Option 3: Django Shell**
```python
from predictions.models import SuperlativeQuestion

mvp = SuperlativeQuestion.objects.get(award__name='Most Valuable Player')
mvp.finalize_winners('Nikola Jokic')
```

---

## CSV Backup Format

Files saved to: `backend/odds_data/nba_odds_{season}_{timestamp}.csv`

**Columns**:
- Award
- Player
- Odds
- Rank
- Scraped At

**Example**:
```csv
Award,Player,Odds,Rank,Scraped At
Most Valuable Player,Nikola Jokic,+150,1,2024-10-19T14:30:00
Most Valuable Player,Shai Gilgeous-Alexander,+200,2,2024-10-19T14:30:00
Rookie of the Year,Victor Wembanyama,+120,1,2024-10-19T14:30:00
...
```

---

## Data Flow

```
DraftKings
    ↓
[Playwright Scraper]
    ↓
Odds Table (database)
    ↓
SuperlativeQuestion.update_from_latest_odds()
    ↓
Current Leader & Runner-up Updated
    ↓
Users see via API endpoints
    ↓
Frontend displays odds & scoring positions
```

---

## Troubleshooting

### "No data scraped"

**Check**:
1. Is Playwright installed? (`pip install playwright && playwright install chromium`)
2. Is DraftKings accessible from your network?
3. Did DraftKings change their HTML? (Update selectors in scraper)

**Debug**:
- Set `headless=False` in `nba_scrape_db.py` to see browser
- Check browser console for errors

### "SuperlativeQuestion not updating"

**Possible causes**:
1. Question doesn't exist for that award/season
2. No odds data in database for that award

**Fix**:
```python
# Check if question exists
from predictions.models import SuperlativeQuestion, Award, Season

award = Award.objects.get(name='Most Valuable Player')
season = Season.objects.get(slug='2024-25')

try:
    q = SuperlativeQuestion.objects.get(award=award, season=season)
    print(f"Question found: {q.text}")
except SuperlativeQuestion.DoesNotExist:
    print("Question doesn't exist - create it in admin")
```

### "Odds show but leader/runner-up are None"

**Cause**: `update_from_latest_odds()` not called after scraping

**Fix**:
```python
from predictions.models import SuperlativeQuestion

for q in SuperlativeQuestion.objects.all():
    q.update_from_latest_odds()
    print(f"Updated {q.award.name}")
```

---

## Migration Required

After updating the models, create and run migrations:

```bash
venv/bin/python backend/manage.py makemigrations
venv/bin/python backend/manage.py migrate
```

**Migrations will add**:
- `Odds.season` field
- `Odds.odds_value`, `decimal_odds`, `implied_probability` fields
- `Odds.scraped_at`, `source`, `rank` fields
- `SuperlativeQuestion.current_leader` and related fields
- Database indexes for performance

---

## API Documentation

Full interactive docs available at:
```
http://localhost:8000/api/v2/docs/
```

Navigate to the "Odds" section to test endpoints in the browser.

---

## Best Practices

1. **Run scraper weekly** during the season to track odds changes
2. **Check CSV backups** before trusting scraped data
3. **Finalize questions** immediately after awards are announced
4. **Monitor odds trends** to see which players are gaining/losing momentum
5. **Display odds to users** so they know who's in scoring position
6. **Archive old CSV files** periodically to save disk space

---

## Future Enhancements

Potential improvements:
- [ ] Automated daily scraping via cron job
- [ ] Email alerts when top 2 changes
- [ ] Odds visualization charts (line graphs over time)
- [ ] Odds movement indicators (🔺 rising, 🔻 falling)
- [ ] Compare odds across multiple sportsbooks
- [ ] Push notifications when users are in/out of scoring position
- [ ] Historical accuracy tracking (how often did odds predict correctly?)
- [ ] AI predictions based on odds + stats

---

## Support

For issues:
1. Check this guide
2. Review CSV backup to verify scraping worked
3. Check `/api/v2/docs/` for API usage
4. Review `backend/odds_data/` directory
5. Check Django logs for errors

**Remember**: Always run the scraper locally - production servers may block DraftKings!
