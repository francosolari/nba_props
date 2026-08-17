# Mid-Season Engagement Plan

**Status:** proposed, nothing implemented
**Written:** 2026-08-16
**Tracked in bd:** see the epic and subtasks listed under [Work Items](#work-items)

---

## The problem, stated precisely

Every decision a player makes is locked before opening night. After the submission
window closes there is nothing to submit, nothing to trade, and nothing to
change. The NBA Cup is the only mid-season event with its own deadline and its
own payout. So the honest engagement curve is: a spike at signup, a spike at the
Cup, and a spike in the last week of the regular season when the standings
finally settle.

The constraint on any fix: **it must not ask the user to show up on a schedule.**
A set-and-forget pool that grows homework stops being a set-and-forget pool. Every
item below is either a push (the season reaches the user) or a reframe (the same
data, told so it moves), never a new recurring obligation.

## Why the scoreboard feels frozen

Standings predictions are graded provisionally all season — the homepage hero
already shows "72 points so far." The number is live. The problem is the shape
of the scoring function:

```python
# backend/predictions/management/commands/grade_standing_predictions.py:118-124
if predicted_pos == actual_pos:
    points = 3
elif abs(predicted_pos - actual_pos) == 1:
    points = 1
else:
    points = 0
```

This is a step function with a cliff. For most of the season most calls sit in
the 0 bucket, and they only move when a team crosses an *exact* position
boundary. A user who checks in December sees a number that has not moved in
weeks and will not move for weeks more. That is the root cause, and it is worth
fixing before layering notifications on top of a scoreboard that does not move.

## A correction to a tempting idea

An obvious feature is "N games tonight can swing you M points." Mid-season this
is **mostly false**. Standings positions are driven by win percentage across 82
games; in December teams are separated by multiple games and a single result
rarely crosses a position boundary. Ship this as a late-season feature only
(roughly March onward, or gated on an explicit margin check), otherwise it fires
constantly with manufactured urgency and trains users to ignore the channel —
poisoning exactly the notification path needed in April.

---

## What the codebase already gives us for free

Verified against the tree at the time of writing. **Re-verify before relying on
any of it**, especially the homepage endpoint, which had uncommitted changes.

### The leaderboard payload already carries every user's full board

`backend/predictions/api/v2/endpoints/leaderboard.py:146-152` appends, per user,
per team:

```python
c["predictions"].append({
    "team": sp.team.name,
    "conference": conference,
    "predicted_position": sp.predicted_position,
    "actual_position": actual_pos,
    "correct": None,
    "points": sp.points,
})
```

One call to `/api/v2/leaderboards/{slug}` therefore returns enough to derive,
**with no new backend work**:

- who holds a uniquely contrarian call on a team
- who a given user's nearest rival is by points
- how many of a user's calls are mathematically settled versus still live

Frontend normalization lives in `frontend/src/hooks/leaderboard/useLeaderboard.js`
(`normalizeLeaderboardData`), which preserves `categories`. Payload size is
roughly `users x 30` standings rows — about 630 rows for a 21-player pool.

### Schedule data

`frontend/src/components/nba/useNbaSchedule.js` wraps `/api/v2/nba/schedule`,
supporting `mode` of `upcoming | recent | live | range`, with a `limit`,
`offset`, and a date range. It proxies a slow upstream feed, holds results for
30 minutes, and resolves failures to `unavailable` rather than throwing.

### Email

SendGrid is already wired: `backend/nba_predictions/settings.py:213` selects
`nba_predictions.sendgrid_backend.SendGridBackend` in production and the console
backend in development (`:218`). So a digest needs a template and a command, not
a mail integration.

### Scheduling — THE GAP

**There is no Celery, no beat, and no scheduled GitHub Actions workflow.** Nothing
in the repo runs recurring work. Any digest or alert needs a scheduling
mechanism chosen and stood up as part of the first item. Options, cheapest
first:

1. A scheduled `workflow_dispatch` + `schedule` GitHub Actions job invoking the
   management command against production (matches how grading is already run by
   hand, and CI/CD already exists in `.github/workflows/`).
2. Host cron on the deployment box calling `docker compose exec`.
3. Celery + beat + a broker — most capable, most infrastructure, almost certainly
   overkill for one weekly job.

Recommend option 1 unless a later item needs sub-hourly granularity.

### Scheduling is also blocked on a second problem: the NBA API blocks the droplet

Discovered 2026-08-16 while working item 2. This is not only a digest problem —
**standings themselves are not on a schedule**, because `update_season_standings`
can only run where the NBA feed is reachable, and that is not production. Its own
docstring already says so: *"Run this command LOCALLY and sync your database."*
A laptop is not a schedule.

Measured:

- `stats.nba.com` via `nba_api` from a local machine: **works, 0.2s.**
- `stats.nba.com` from the DigitalOcean droplet: **blocked** (the egress IP is on
  NBA's list).
- `cdn.nba.com` — the obvious "use the unprotected CDN instead" idea —
  **403s from Akamai even locally.** It is not the escape hatch it looks like, so
  do not spend time on it.

The unknown that decided the architecture was whether a **GitHub Actions runner**
could read the feed. `.github/workflows/nba-api-reachability.yml` answers it:

```
gh workflow run nba-api-reachability.yml && gh run watch
```

**Measured 2026-08-17, after merging #35: blocked.** Same `ReadTimeout` after
60s as the droplet. The "invert the flow" plan above is dead — GitHub's runner
IPs are on the same blocklist as DigitalOcean's, so the runner cannot fetch on
the droplet's behalf.

Also tried and also blocked, same timeout signature, before settling on the
proxy path:

- **NordVPN, dedicated/fixed IP.** VPN server IPs are published ranges; the
  same blocklists that catch datacenter IPs catch well-known VPN providers too.
- **A home device as a self-hosted proxy** (Tailscale + a SOCKS proxy, or direct
  port-forward — a Verizon FiOS home connection isn't behind CGNAT, so this is
  plumbing-wise viable). The home IP itself isn't blocked — that's *why* "run
  locally" has always worked. But the spare hardware on hand (a TP-Link router,
  "Archer BE550" under its BE6500 speed-class branding) can't run either
  Tailscale or a proxy: OpenWrt support for that model landed in
  `openwrt/openwrt` only in the last few weeks and isn't stable yet. This is the
  same "not always on / not reliable" objection the doc already raised against
  a home Raspberry Pi — revisit only once there's an always-on home device that
  can actually run the tunnel.

**Decided: a residential proxy in front of the fetch on the droplet**,
configured through `nba_api`'s `proxy` argument (confirmed present —
`nba_api/library/http.py:89`, takes a plain `"http://user:pass@host:port"`
string, or a list for rotation). Costs money (roughly $10-50/month) and is the
only validated option that keeps everything in one place. Provider not yet
chosen.

Rejected: a laptop cron (not always on, which is the whole problem), a home
Raspberry Pi or router (same availability issue, and today's spare router
specifically can't run the tunnel software yet), and NordVPN (blocked
outright, not just an availability concern).

### Season shape

`backend/predictions/models/season.py:5-11` — `Season` has `year`, `slug`,
`start_date`, `end_date`, `submission_start_date`, `submission_end_date`. Note
there is **no** "regular season end" separate from `end_date`, and no playoff
boundary field. Anything gating on "the last week of the regular season" must
either derive it from schedule data or add a field.

---

## Ranked plan

Ordered by value per unit of work. Items 1 and 2 are the ones worth doing even
if nothing else ships.

### 1. Weekly digest email — highest value, moderate work

**Rationale.** The failure mode is not "the site is boring," it is "nobody
remembers the site exists." No on-site feature can fix absence. This is the only
item that reaches a user who is not already visiting.

**Content**, all derivable from the leaderboard payload plus `UserStats`:

- rank now, and the change since last week
- points gained or lost this week
- the single call that moved most
- one line about the nearest rival (feeds item 3)

**Work.**

- Choose and stand up the scheduler (see the gap above). This is the real cost.
- Add a management command alongside the existing ones in
  `backend/predictions/management/commands/` — follow the shape of
  `grade_standing_predictions.py`.
- Snapshot weekly rank/points so week-over-week deltas are computable. Either a
  small new model or a periodic write to existing `UserStats`. **Without a
  snapshot there is no "since last week" and the digest loses most of its
  punch** — do not skip this.
- Template + plain-text alternative. Check what allauth templates already exist
  before inventing a layout.
- Unsubscribe handling. Non-negotiable for recurring mail.

**Do not** send this to users with no entry for the season.

### 2. Projected-finish scoring — highest value, contained work

**Status: built for the homepage (2026-08-16). The mechanism below is not the
one originally specified — see the correction.**

**Rationale.** Converts the step function into a continuous one, so the number a
player checks in on moves every week without changing a single rule of the real
pool.

**Correction: pace projection alone does nothing.** The original specification
was to run each team's win pace out to 82 games, sort into projected final
standings, and score against that. This is inert. Projected win percentage is
`(wins + remaining × rate) / 82`, which for `rate = wins / played` reduces
exactly to `wins / played` — the current win percentage. Multiplying every team
by the same 82 preserves the order, so the projected ladder *is* the current
ladder and the projected score *is* the current score, to the point of being
byte-identical. Pace cannot move a number that only responds to order.

**What actually moves: the uncertainty, not the pace.** Two teams one game apart
in November are far less separated than the same two teams one game apart in
March, because November has sixty more games left to reshuffle them. So the
implementation models a distribution rather than a single table: each team's
remaining games are sampled at its current win rate, the conference is re-ranked
on the result, and that repeats 4,000 times until every team has a probability
over each finishing position. A board is then scored *in expectation* — the same
3/1/0 rule applied to every finish a team might reach, weighted by how often it
reaches it.

This moves continuously: early because the spread is wide and shifts easily,
later because the spread collapses onto the real answer. At the final buzzer
every distribution is a point mass and the expected score equals the graded
score exactly, so a projection and a final grade can never disagree about a
finished season.

Measured on a synthetic 15-team conference with a fixed win-rate ladder and a
board called one or two places off throughout:

| Games played | Graded | Projected |
|---|---|---|
| 10 | 17 | 11.07 |
| 26 | 17 | 15.04 |
| 42 | 17 | 17.43 |
| 66 | 17 | 18.58 |
| 82 | 17 | 17.00 |

The graded column never moves all season. That is the problem this item exists
to fix, and the projection is the column that fixes it.

**Critical framing constraint.** Presented as a *projection*, never as the
score. The actual pool is still graded on real final standings. It is labelled
"Projected finish" with the standfirst "If the season plays out on current form.
Not your score — the pool is graded on the real final standings", and it is
styled deliberately unlike the graded tiles: dashed rule, smaller numerals,
quieter ground.

**Shipped.**

- `frontend/src/features/home/projection.js` — seeded Monte Carlo over finishing
  positions, expected points, and a per-pick settled/live read. Seeded from the
  standings themselves, so the same table always yields the same number; a
  figure that drifted on reload would read as news when nothing had happened.
  Reuses `scorePosition` from `whatIf.js` rather than restating the 3/1/0 rule.
- Rate is shrunk toward .500 by a 12-game prior so an 0-3 team is not projected
  to lose all 82. The prior has faded by Christmas.
- `ForecastStrip` in `StatusLedger.jsx`, fed from `HomePage.jsx`. Read off the
  table currently on screen, so calling tonight's games moves the forecast too.
- 14 unit tests in `__tests__/projection.test.js`.

**Backend port (2026-08-16).** `backend/predictions/services/standings_projection.py`
is the Python twin, for the digest. `standings_scoring.py` now holds the 3/1/0
rule alone, and `grade_standing_predictions.py` calls it instead of inlining the
bands. A shared fixture is pinned in both test suites so the two models cannot
drift.

**Recency weighting (2026-08-16).** A team winning far more lately than it did in
October is genuinely more likely to finish well, so the rate is no longer the
flat season record: the last ten games carry full weight and everything earlier
carries `HISTORY_WEIGHT = 0.6`. `L10` already ships in the standings feed, so
this needed a column (`RegularSeasonStandings.last_ten_wins`, migration 0048),
not a new fetch.

Two things worth knowing before anyone turns the knob up:

- **Over-weighting recent form makes projections worse, not better.** Ten games
  is a very small sample. Recency earns its place only because team strength
  genuinely changes during a season — trades, injuries, a rookie arriving — and
  0.6 is about as far as that justifies. A 9-1 stretch moves a 50-game .500
  team's rate by under .10, and a test pins that.
- **Recency costs sample size, and the projection has to widen for it.**
  Down-weighting history means the rate rests on fewer effective games, so the
  model now carries an effective-sample-size term and adds rate uncertainty
  (`remaining² × p(1-p) / n_eff`) on top of the binomial spread. The first cut
  omitted this and understated the spread in November, which is exactly when the
  projection most needs to be honest about what it does not know.

**Not done.**

- The leaderboard surface. It has its own what-if machinery
  (`__orig_total_points`, `whatIfEnabled`) threaded through a transposed desktop
  table, a mobile table, the podium, and the showcase — a separate piece of work
  rather than an add-on, and it interacts with that existing mode.
- The settled/live counts (item 4) are already computed by `projectBoard` and
  currently only appear as one sentence in the forecast strip.

### 3. Nearest-rival framing — high value, low work

**Rationale.** "You passed Danny H this week" is a far stronger pull than "you
are 9th." With ~21 players everyone always has a live duel, and it costs nothing
to compute.

**Work.** Pure frontend, from the leaderboard payload already on the wire. Pair
each user with the entrant nearest in points (prefer the one immediately above,
so the framing is aspirational). Surface on the homepage; reuse in the digest.

### 4. Settled-vs-live counter — moderate value, low work

**Rationale.** "12 of your 30 standings calls are decided; 18 still in play"
builds an honest countdown toward the last week instead of a cliff. It also sets
correct expectations about *why* the score is quiet in December.

**Work.** Mostly done as a side effect of item 2. `pickOutlook` in
`projection.js` returns `settled` per pick, and `projectBoard` returns the
counts; the homepage forecast strip already prints one sentence of it. Note the
definition that fell out of building it: settled is a question about the
*payout*, not the table. A team certain to finish either side of a called
position is not settled at all, because 1 and 3 are different answers. The
threshold is 95% on a single payout — an approximation, and the UI says "can
still change" rather than claiming precision.

What remains is giving it its own surface (a countdown on the picks page, say)
rather than a clause in the forecast copy.

### 5. Uniqueness markers — moderate value, low work

**Rationale.** "You're the only entry with Detroit top-4." Contrarian calls are
the most emotionally loaded thing on a locked board.

**Work.** Frontend, from the same payload. Watch the privacy rule: other
entrants' picks are sealed until the submission window closes
(`results_visible` in `backend/predictions/api/v2/utils.py` gates this). A
uniqueness marker leaks aggregate information about others' boards — confirm it
is only computed when results are already visible.

### 6. Late-season stakes alerts — high value, gated

**Rationale.** The good version of the tempting idea corrected above. When
margins genuinely compress, "two games tonight can move you 4 points" is real
drama.

**Work.** Requires a live-margin check: only surface when a single game can
actually cross a position boundary affecting this user. Item 2 now supplies
exactly this — the difference in a pick's expected points between the two
outcomes of a game *is* the stake, in points, with no date gate or hand-tuned
margin threshold needed. A game that cannot move anything scores a difference of
zero and is silent on its own. Compose `projectStandings` (which applies a
hypothetical result) with `projectFinish`, and alert on the spread.

### Explicitly rejected: mid-season side markets

Trade-deadline / All-Star / play-in mini-markets were considered and are **not
recommended**. They are the only idea on the list that asks users to show up on a
schedule, which is precisely the constraint. If revisited, they must be strictly
optional and separately scored.

---

## Sequencing

```
2 (projected scoring) ──┐
                        ├──> 1 (digest, now has something to report)
3 (nearest rival) ──────┘
                        └──> 6 (stakes alerts, needs projection math)
4, 5 — independent, any time
```

Item 1 depends on 2 and 3 only for *content quality*; it can ship earlier with
thinner content if the scheduler work lands first.

## Work Items

Tracked in bd. Epic **`nba_predictions-92`** carries this document as its design
reference; every item below is a child of it.

| ID | P | Item | Blocked by |
|----|---|------|-----------|
| `nba_predictions-93` | 1 | Projected-finish scoring — *homepage done, leaderboard and backend port open* | — |
| `nba_predictions-94` | 1 | Nearest-rival framing | — |
| `nba_predictions-95` | 1 | Recurring-job scheduler | — |
| `nba_predictions-96` | 1 | Weekly rank/points snapshot | `-95` |
| `nba_predictions-97` | 1 | Weekly digest email | `-95`, `-96` |
| `nba_predictions-98` | 2 | Settled-vs-live counter | — |
| `nba_predictions-99` | 2 | Uniqueness markers | — |
| `nba_predictions-100` | 2 | Late-season stakes alerts | `-93` |
| `nba_predictions-101` | 2 | Fix or retire the legacy `/what-if/` page | — |

Start with `bd ready` — it hides the blocked items automatically. Each issue's
description repeats the constraints and warnings from this document, so a fresh
agent can work from `bd show <id>` alone, though reading this file first is
better.

Recommended first moves, in parallel if there are two agents:
`nba_predictions-95` (unblocks the whole notification chain) and
`nba_predictions-93` (unblocks the stakes alerts and makes the digest worth
reading).

See `AGENTS.md` for the full bd workflow. Commit `.beads/issues.jsonl` alongside
any code change so issue state stays in sync.

## Notes for whoever picks this up

- Verify the code references above before building on them. They were accurate
  when written but at least one file (`backend/predictions/api/v2/endpoints/homepage.py`)
  had uncommitted working-tree changes at the time.
- The 3/1/0 scoring rule now appears in three places: the grading command,
  `frontend/src/features/home/whatIf.js:19` (`scorePosition`, which the homepage
  and the new projection both use), and `frontend/src/components/whatIfStandings.js:91-107`.
  Extract a shared helper the next time a fourth consumer appears.
- **`whatIfStandings.js` is live**, contrary to the doubt recorded here
  originally: `backend/predictions/routing/view_urls.py:32` routes
  `/what-if/<season_slug>/` to `what_if_view`, which renders
  `predictions/what_if_standings.html`, which mounts the component. It is an
  older drag-and-drop page entirely separate from the homepage what-if. Two
  problems in it, neither fixed here:
  - `handleReset` (lines 109-112) is defined at module scope and references
    `setWhatIfStandings` and `nbaStandings`, which do not exist there. It is
    never called, so it does not throw — it is dead, not live-broken.
  - `calculateWhatIfScore` scores by index across the whole fetched list rather
    than per conference, so its positions are almost certainly wrong.
- Nothing here changes how the pool is actually scored. Every item is
  presentation, projection, or notification. Keep it that way; changing real
  scoring mid-season is a different conversation with the players.
