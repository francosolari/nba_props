# Admin Grading System Guide

## Overview

The Admin Grading System provides comprehensive tools for managing, auditing, and manually grading user predictions. This system consists of:

1. **API Endpoints** - Backend REST API for grading operations
2. **Admin Panel** - React frontend for visual grading and auditing
3. **Management Commands** - CLI tools for automated grading (local use only)
4. **Scraping Tool** - Playwright-based scraper for award odds

---

## Features

### 1. Grading Audit Panel

**Location**: `/admin/grading` (when mounted)

**Features**:
- **User Points Breakdown**: See total points and category-wise breakdown for each user
- **Category Analytics**: View correct/incorrect/pending counts per category
- **Question-Level Detail**: Drill down to individual questions and answers
- **Finalized Status**: See which questions have been finalized (locked)
- **Bulk Grading**: Select multiple answers and grade them at once
- **Manual Override**: Manually mark answers as correct/incorrect
- **Search & Filter**: Find specific users quickly

**Categories Tracked**:
- Awards/Superlatives (MVP, ROTY, etc.)
- Props (Yes/No, Over/Under)
- Regular Season Standings
- In-Season Tournament
- Player Stats
- Head-to-Head
- NBA Finals

### 2. API Endpoints

All endpoints require admin authentication and are available at `/api/v2/admin/grading/`

#### Get Grading Audit

```
GET /api/v2/admin/grading/audit/{season_slug}
```

Returns comprehensive grading breakdown for all users in a season.

**Response**:
```json
{
  "season_slug": "2024-25",
  "season_year": "2024-25",
  "users": [
    {
      "user_id": 1,
      "username": "john_doe",
      "display_name": "John Doe",
      "total_points": 45.5,
      "categories": [
        {
          "category_name": "Awards/Superlatives",
          "total_points": 12.5,
          "possible_points": 20.0,
          "correct_count": 5,
          "incorrect_count": 3,
          "pending_count": 2,
          "finalized_count": 8,
          "non_finalized_count": 2,
          "questions": [...]
        }
      ]
    }
  ]
}
```

#### Get Answers for Review

```
GET /api/v2/admin/grading/answers/{season_slug}
```

**Query Parameters**:
- `question_id` (optional): Filter by specific question
- `user_id` (optional): Filter by specific user
- `is_correct` (optional): Filter by correctness (true/false)
- `pending_only` (optional): Show only pending answers

#### Manually Grade Answer

```
POST /api/v2/admin/grading/grade-manual
```

**Request Body**:
```json
{
  "answer_id": 123,
  "is_correct": true,
  "points_override": 2.5,  // optional
  "correct_answer": "Luka Doncic"  // optional
}
```

**Response**:
```json
{
  "success": true,
  "answer_id": 123,
  "is_correct": true,
  "points_earned": 2.5,
  "user_total_points": 45.5,
  "message": "Answer graded successfully. User john_doe now has 45.5 points."
}
```

**Note**: This automatically recalculates UserStats for the affected user.

#### Run Grading Command

```
POST /api/v2/admin/grading/run-grading-command
```

**Request Body**:
```json
{
  "command": "grade_props_answers",  // or grade_standing_predictions, grade_ist_predictions
  "season_slug": "2024-25"
}
```

**⚠️ WARNING**: This endpoint wraps the management commands which use the `nba_api` library. It will likely **fail on production servers** where NBA domains may be blocked. Use this **locally only**.

#### Finalize Question

```
POST /api/v2/admin/grading/finalize-question/{question_id}?correct_answer=Luka+Doncic
```

Marks a question (typically SuperlativeQuestion) as finalized. This adds a lock icon 🔒 in the leaderboard UI to indicate the answer is official and won't change.

---

## Management Commands

### Grade Props Answers

```bash
venv/bin/python backend/manage.py grade_props_answers <season-slug>
```

**What it does**:
- Grades all prop, award, and player stat questions
- Uses `AnswerLookupService` to normalize answers (handles player name variations)
- Calculates points based on `is_correct` and `point_value`
- Updates `Answer.is_correct` and `Answer.points_earned`
- Aggregates into `UserStats`

**Logging**: Creates `qa_grading_command.log` with detailed debug info

**Example Output**:
```
User: john_doe, Total: 45 (Standings: 15, Props: 30)
User: jane_smith, Total: 42 (Standings: 18, Props: 24)
...

Summary:
Total Props Points Awarded: 1250
Total Answers Processed: 2500
Answers Updated: 120
UserStats Updated: 50
```

### Grade Standing Predictions

```bash
venv/bin/python backend/manage.py grade_standing_predictions <season-slug>
```

**What it does**:
- Grades Regular Season standings predictions
- Awards points based on accuracy:
  - **3 points**: Exact position match
  - **1 point**: Off by 1 position
  - **0 points**: Off by 2+ positions
- Updates `StandingPrediction.points`
- Aggregates into `UserStats`

**Logging**: Creates `grading_command.log`

### Grade IST Predictions

```bash
venv/bin/python backend/manage.py grade_ist_predictions <season-slug>
```

**What it does**:
- Grades In-Season Tournament predictions
- Types graded:
  - Group winners
  - Wildcard teams
  - Conference winners
  - Tiebreaker questions
- Updates `Answer.points_earned` for IST questions
- Aggregates into `UserStats`

---

## NBA Award Odds Scraper

### Playwright Scraper (New & Recommended)

**File**: `backend/nba_scrape_playwright.py`

**Why Playwright?**:
- Better JavaScript rendering than Selenium
- More reliable bot detection avoidance
- Cleaner API and faster execution
- Better maintained and more modern

**Installation**:
```bash
pip install playwright google-api-python-client google-auth
playwright install chromium
```

**Usage**:
```bash
cd backend
python nba_scrape_playwright.py
```

**What it scrapes**:
- Rookie of the Year
- Most Improved Player
- Regular Season MVP
- 6th Man of the Year
- Defensive Player of the Year
- Clutch Player Award

**Output**: Writes to Google Sheet (`1hQogeEpeolTb5jrK__Qdat34snmtKyaQZTtHderj558`) in the `awards_odds_raw` tab.

**Configuration**:
- `SPREADSHEET_ID`: Google Sheets ID (currently set)
- `CREDENTIALS_PATH`: Path to Google service account JSON (`api_key/emerald-ivy-368015-6b456a8b0473.json`)

**Features**:
- Random delays between requests (2-4 seconds)
- Stealth browser settings to avoid detection
- Detailed logging of scraping process
- Timestamps on all scraped data

### Legacy Scraper

**File**: `backend/nba_scrape.py` (commented out)

Kept for reference and ad-hoc testing. Uses Selenium with undetected_chromedriver.

---

## Finalized Questions Feature

### What is "Finalized"?

The `is_finalized` flag on `SuperlativeQuestion` indicates:
- The answer is official and won't change (e.g., actual MVP winner announced)
- Points awarded for this question are final
- Used to differentiate between:
  - **Non-finalized**: Provisional points based on current betting odds
  - **Finalized**: Official points based on actual award winners

### How to Finalize

**Option 1: Admin Panel**
1. Navigate to Admin Panel (`/admin`)
2. Find the SuperlativeQuestion
3. Set `is_finalized` to `True`
4. Set `correct_answer` to the official winner

**Option 2: API**
```bash
curl -X POST http://localhost:8000/api/v2/admin/grading/finalize-question/123 \
  -H "Content-Type: application/json" \
  -d "correct_answer=Luka Doncic"
```

**Option 3: Django Admin**
1. Go to `/admin/predictions/superlativequestion/`
2. Edit the question
3. Check `is_finalized`
4. Set `correct_answer`
5. Save

### UI Display

In the Leaderboard Detail Page, finalized questions show a 🔒 lock icon next to the question text, indicating the answer is official.

---

## Data Flow

### Grading Process

1. **Submission**: Users submit predictions via frontend
2. **Storage**: Answers stored in `Answer` table with `is_correct=NULL`
3. **Automated Grading** (local):
   - Run management commands to fetch NBA stats
   - Compare user answers to correct answers
   - Update `is_correct` and `points_earned`
4. **Manual Grading** (production):
   - Use Admin Grading Panel
   - Review pending answers
   - Manually mark correct/incorrect
5. **Aggregation**:
   - `UserStats` table stores total points per user per season
   - Leaderboard queries `UserStats` for rankings

### Points Calculation

**For Answer-based Questions** (Props, Awards, etc.):
- Correct answer: `points_earned = question.point_value`
- Incorrect answer: `points_earned = 0`

**For Standings**:
- Exact position: `3 points`
- Off by 1: `1 point`
- Off by 2+: `0 points`

**Total User Points**:
```
total_points = sum(Answer.points_earned) + sum(StandingPrediction.points)
```

---

## Frontend Integration

### Mounting the Admin Grading Panel

To add the Admin Grading Panel to your site, update `frontend/src/index.jsx`:

```jsx
import AdminGradingPanel from './pages/AdminGradingPanel';

// Mount admin grading panel
mountComponent(AdminGradingPanel, 'admin-grading-root', 'AdminGradingPanel');
```

Then create a Django template with:

```html
<div id="admin-grading-root" data-season-slug="{{ season.slug }}"></div>
```

### Leaderboard Lock Icons

The LeaderboardDetailPage automatically displays lock icons for finalized questions. No additional setup needed - just ensure your API includes `is_finalized` in the response.

---

## Best Practices

### Grading Workflow

1. **During Season**:
   - Run automated grading locally weekly
   - Use betting odds as stand-in for awards
   - Mark questions as non-finalized

2. **After Season**:
   - Finalize all award questions
   - Set correct answers to actual winners
   - Re-grade all answers
   - Verify UserStats are correct

### Manual Grading Guidelines

- **Use for**:
  - Ambiguous answers that automated grading missed
  - Edge cases (typos, alternate spellings)
  - Questions where automated grading failed

- **Don't use for**:
  - Bulk operations (use management commands instead)
  - Regular weekly grading (too time-consuming)

### Production vs Local

**LOCAL ONLY**:
- Management commands that fetch NBA stats
- Award odds scraping
- Any operation using `nba_api` library

**PRODUCTION OK**:
- Manual grading via API/panel
- Viewing audit data
- Finalizing questions
- Setting correct answers manually

---

## Troubleshooting

### "Command failed" when running grading

**Cause**: NBA API domains are blocked on your server

**Solution**: Run the command locally and deploy the updated database, OR use manual grading

### Scraper returns no data

**Possible causes**:
1. DraftKings changed their HTML structure → Update selectors in scraper
2. Bot detection → Try different user agent or add more delays
3. Network/firewall blocking → Check if you can access DraftKings manually

**Debug**: Run with `headless=False` in `scrape_playwright.py` to see browser

### Lock icons not showing

**Check**:
1. Is `is_finalized=True` on the question in database?
2. Is the leaderboard API including `is_finalized` in response?
3. Has the frontend been rebuilt? (`npm run build`)

### Points don't match

**Common issues**:
1. UserStats not updated → Re-run grading command
2. Duplicate UserStats → Check for duplicates, delete extras
3. Cached frontend data → Hard refresh browser (Ctrl+Shift+R)

---

## API Documentation

Full interactive API documentation available at:
```
http://localhost:8000/api/v2/docs/
```

Navigate to the "Admin - Grading" section for detailed endpoint specs.

---

## Future Enhancements

Potential improvements:
- [ ] Batch finalize multiple questions at once
- [ ] Email notifications when questions are finalized
- [ ] Audit log of all manual grading actions
- [ ] Undo/redo for manual grading
- [ ] Export grading audit to CSV
- [ ] Automated scraping via scheduled task (if bot detection allows)
- [ ] In-app betting odds history visualization

---

## Support

For issues or questions:
- Check this guide first
- Review API docs at `/api/v2/docs/`
- Check Django logs for errors
- Review management command logs (`*.log` files)
- File issues on GitHub repo

**Remember**: Always test grading changes on a non-production database first!
