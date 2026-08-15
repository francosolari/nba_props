---
target: desktop leaderboard screenshot and frontend/src/pages/LeaderboardPage.jsx
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-08-15T20-04-44Z
slug: frontend-src-pages-leaderboardpage-jsx
---
# Leaderboard design critique

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 3 | Navigation, loading, season, and chevrons are visible; row expansion lacks semantic state. |
| 2 | Match with real world | 4 | Scorebook, standings, trophy, and category language fit a basketball pool. |
| 3 | User control and freedom | 3 | Rows collapse and seasons switch; there is no jump from the rank summary to the user's row. |
| 4 | Consistency and standards | 3 | The ledger is coherent, but floating honors do not fully share its stamp language. |
| 5 | Error prevention | 3 | The read-only surface has little error exposure. |
| 6 | Recognition rather than recall | 3 | Scores are visible, but users must locate their own row manually. |
| 7 | Flexibility and efficiency | 2 | Expansion and Advanced Board help; no jump-to-me accelerator exists. |
| 8 | Aesthetic and minimalist design | 2 | Header void, isolated podium fills, and floating honor coins compete. |
| 9 | Error recovery | 1 | The raw error string has no retry action. |
| 10 | Help and documentation | 1 | Scoring and comparison lack contextual explanation. |
| **Total** |  | **25/40** | **Acceptable; strong identity, uneven hierarchy and utility.** |

## Design Specificity Verdict

The page is recognizably authored for Props Predictions: compressed arena typography, ruled scorebook structure, category scoring, and NBA color feel specific. The newest delight layer is the weak link. Tiny floating honor coins plus three isolated pastel rank cells resemble generic gamification applied to a disciplined ledger.

The deterministic scan found one advisory at `LeaderboardPage.jsx:474`: the mobile `text-[10px]` PTS label is outside the structured type ramp. This is a likely false positive because DESIGN.md explicitly permits 9–10px supplemental microprint.

## Overall Impression

The table is strong; the composition around it is not. The oversized masthead forms an L-shaped void between title, current rank, and season. The podium treatment then overweights the narrow rank column without strengthening the participant identity.

## What's Working

- Rank, participant, total, and three category splits follow a natural competitive scan.
- The condensed typography and black rules create an arena-program voice rather than generic SaaS styling.
- Soft-gold category badges communicate leadership without overpowering total score.

## Priority Issues

1. **[P1] Current rank is detached from the leaderboard.** A participant at 18th sees rows 1–6 and cannot reach their own context. Attach a compact `You · 18th of 21` utility above the table with a “Jump to my row” action and signed-in-row treatment.
2. **[P2] The desktop masthead is too tall and unbalanced.** Compress the title and place season/current rank in one deliberate right-side utility cluster or attached second line; reduce header height by roughly one-third.
3. **[P2] Podium delight looks applied rather than native.** Remove the three pastel rank-cell blocks. Keep one honor device: a larger stamped trophy/medal/rosette integrated with the numeral or player identity.
4. **[P2] The table over-separates player identity.** Join rank and participant visually; keep decisive vertical rules only before total and category preview.
5. **[P2] Expansion is not fully semantic.** Add `aria-expanded` and `aria-controls` to each row button.

## Persona Red Flags

- **Alex, power user:** cannot jump from “18th” to the relevant row and must manually scan.
- **Sam, keyboard/screen-reader user:** row expansion rotates visually but does not announce open state or controlled content.
- **Basketball-pool participant:** cannot immediately answer who is just above them, their point gap, or which category is costing places.

## Minor Observations

- The chevron feels stranded in a narrow utility column.
- Gold identifies first place and category leaders, but not the signed-in participant.
- The error state needs plain-language recovery and retry.
- “Scoring breakdown” would fit the product voice better than “Category preview.”

## Questions to Consider

- Is the page hero the product name or the participant's place in the competition?
- Would the top three feel more special with fewer decorative signals but a stronger physical scorebook stamp?
- Could rank, participant, and badges become one player-identity region?
