# Frontend visual testing

The submissions page has a deterministic local harness for responsive UI checks. It avoids the
configured remote database and serves only local production assets plus stable API fixtures.

Build and start it from the repository root:

```bash
npm run build
python3 frontend/qa/submissions_server.py
```

Open `http://127.0.0.1:8001/qa-submissions.html`. Test at least these two viewports together:

- Desktop: 1440 × 1000
- Mobile: 390 × 844

For the submission flow, verify that the desktop tracker shows current-section and overall
progress, mobile hides current-section progress, section jumps remain horizontally scrollable,
touch targets are at least 44 pixels tall, and neither viewport has horizontal page overflow.
As the anonymous fixture, it should also allow picks, save them to local storage, and show account
actions only after the guest chooses Save for later or Submit Predictions.

The standings fixture includes all 15 teams in each conference. Keep East and West visible in the
same viewport on mobile, verify long team names truncate without covering the seed or logo, and
confirm the two conference ledgers expand to the full submissions content width on desktop.

The fixture is intentionally unauthenticated so the harness cannot write answers or payment data.
Update `frontend/qa/submissions_server.py` when the page adds a new required GET endpoint or when a
new question layout needs permanent visual coverage.
