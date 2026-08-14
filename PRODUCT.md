# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users are NBA fans competing in a season-long prediction pool. They make predictions before submission deadlines, follow their scores as real NBA outcomes become known, and compare their performance with friends and other participants.

Administrators manage seasons, prediction questions, grading, users, and payment records.

## Product Purpose

NBA Predictions Game turns an NBA season into a structured prediction competition. Participants submit standings, awards, props, tournament, and other outcome predictions; earn category and total points as results are graded; and follow the leaderboard throughout the season.

Success means participants can confidently submit a valid entry, understand how their predictions are performing, and stay engaged with the competition across the NBA season.

## Positioning

The product combines a paid, season-long NBA prediction pool with detailed category scoring, side-by-side participant comparison, and what-if standings simulation. It supports both the commitment of deadline-bound picks and the ongoing analysis of how alternate outcomes would change scores and rankings.

## Operating Context

- Participants create an account or sign in, make predictions during a season's configured submission window, and may continue editing until the deadline.
- A paid entry is required for a submission to become valid. The current default entry fee is $25, with payment handled through Stripe Checkout and tracked per user and season.
- Participants revisit the product throughout the season to review graded predictions, category totals, leaderboard position, and other players' picks.
- The competition includes a mid-season payout associated with the NBA in-season tournament.
- Administrators configure seasons and submission windows, manage prediction questions, audit or grade answers, and review payment status.

## Capabilities and Constraints

- Prediction categories include regular-season standings, player awards, props and yes/no questions, superlatives, playoffs or finals, and the NBA in-season tournament.
- Predictions are accepted only within configured season submission windows.
- Entry payment status is part of submission validity; unpaid predictions may be saved as a draft but are not a valid entry.
- Leaderboards expose rank, category scores, and total scores, with detailed views for comparing participants.
- The detailed leaderboard supports sorting, search, pinning or removing compared players, and regular-season what-if simulation.
- The web application uses Django and Django Ninja, React, Tailwind CSS, PostgreSQL, Stripe, and Docker. New API development belongs in v2; v1 is legacy.
- The exact payout structure beyond the confirmed mid-season payout is not documented and must not be invented.

## Brand Commitments

- The product name is **NBA Predictions Game**.
- Preserve the existing product logo at `frontend/static/img/nba_predictions_logo.png`.
- Preserve the existing NBA team names and team-logo asset library under `frontend/static/img/teams/`.
- NBA blue and red may be used as selective accents where they reinforce league or conference context; they are commitments, not a requirement to dominate every surface.

## Evidence on Hand

- Product overview and feature descriptions: `README.md` and `docs/project_overview.md`.
- Detailed leaderboard workflows and simulation behavior: `docs/frontend/README.md` and `frontend/src/features/leaderboard/`.
- Submission, entry-fee, and payment behavior: `frontend/src/pages/SubmissionsPage.jsx`, `backend/predictions/api/v2/endpoints/payments.py`, and `backend/predictions/models/payment.py`.
- Product and team visual assets: `frontend/static/img/nba_predictions_logo.png` and `frontend/static/img/teams/`.
- Working interface copy and states: `frontend/src/pages/` and `backend/predictions/templates/`.
- No testimonials, customer logos, press coverage, participation benchmarks, or complete payout schedule are confirmed in the repository; future work must not fabricate them.

## Product Principles

- Make every prediction, deadline, payment state, and score understandable before asking the participant to act.
- Reward season-long engagement by connecting real NBA outcomes to visible category scores and leaderboard movement.
- Support friendly competition without hiding the detail needed to understand or compare results.
- Treat payment validity, grading accuracy, and submission deadlines as trust-critical product behavior.
- Use authentic NBA team context and assets to strengthen recognition while keeping the competition itself legible.
