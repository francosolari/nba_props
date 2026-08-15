---
version: 1
slug: "frontend-src-pages-leaderboarddetailpage-jsx"
primary_target: "frontend/src/pages/LeaderboardDetailPage.jsx"
related_targets: ["frontend/src/pages/HomePage.jsx","frontend/src/pages/LeaderboardPage.jsx","frontend/src/pages/SubmissionsPage.jsx","frontend/src/pages/ProfilePage.jsx","frontend/src/pages/ist/ISTCenterPage.jsx","frontend/src/components/SiteLayout.jsx","frontend/src/components/SideNav.jsx"]
---

# Participant Experience Redesign

## Scope and mode

- Operate mode across every participant-facing surface: global navigation, home, basic and advanced leaderboards, submissions, profile, NBA Cup center, and account flows.
- Admin interfaces remain unchanged.
- Mobile portrait is the primary composition; tablet and desktop expose more simultaneous information without changing the information architecture.

## Audience, job, and constraints

- NBA fans submit season predictions, verify paid-entry validity, follow scoring, compare participants, and test alternate standings outcomes.
- Preserve factual copy, routes, API behavior, authentication, payment states, scoring, comparison, sorting, pinning, and drag-and-drop team reordering.
- The signed-in participant is the default highlighted player where identity is known.
- Touch targets are at least 44px and no core interaction depends on hover.

## Chosen direction

- Courtside Album is the global system: clean white stock, carbon linework, flat NBA blue and red, condensed editorial display type, restrained hardwood tan, sparse leader gold, ruled panels, and selective court geometry.
- `.impeccable/mocks/leaderboard-courtside-album.png` governs app-wide simplicity and the basic leaderboard.
- `.impeccable/mocks/leaderboard-courtside-foldout-final.png` governs advanced comparison density and the what-if workspace.
- Avoid cream grounds, generic SaaS cards, bento layouts, glass, glossy gradients, excessive pills, neon esports styling, and illustration over data.

## Memorable moment

- In What If mode, a participant drags a team through the standings ledger; an insertion rule tracks the move and every compared participant's score impact updates in place.

## Approved comps

- App-wide: `.impeccable/mocks/leaderboard-courtside-album.png`
- Advanced detail: `.impeccable/mocks/leaderboard-courtside-foldout-final.png`

## Unresolved implementation decisions

- Select and self-host the closest obtainable display and text faces that preserve the approved compressed silhouette and legibility.
- Desktop composition may widen the fold-out comparison and show both conferences concurrently, but may not introduce a separate visual language.
