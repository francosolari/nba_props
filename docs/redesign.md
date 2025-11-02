# NBA Predictions Web App — UX/UI Feedback

This document provides structured, actionable design feedback for improving beauty, usability, and modern feel.

---

## 1. Visual Hierarchy & Cleanliness
- **Issue**: Rows, buttons, and inputs have equal weight → busy interface.
- **Actions**:
  - Add **alternating row shading** (e.g., light gray for odd rows).
  - Use **larger, bold headers** for key columns (Team, Actual, Player Names).
  - Reduce borders; rely on **soft dividers or whitespace**.

---

## 2. Navigation & Tabs
- **Issue**: Tabs look functional but not polished.
- **Actions**:
  - Redesign as **pill-shaped segmented controls** with strong active states.
  - Add **icons + labels**:
    - Regular Season Standings
    - Player Awards
    - Props & Yes/No

---

## 3. Compare View (Side-by-Side Grids)
  - **Freeze first column** (Team) for context during horizontal scroll.

---

## 4. Leaderboard Page
- **Issue**: Metrics (“20 Players,” “1180 Predictions,” etc.) feel flat.
- **Actions**:
  - Place in a **unified card with gradient/frosted background**.
  - Add **trend indicators** (↑ or ↓ vs. last week).
  - Show **avatars or initials** in circles for each player (like Slack/Discord).

---

## 5. What-If Simulation (Bottom-Right Widget)
- **Issue**: “Simulated Top 3” feels disconnected.
- **Actions**:
  - Convert to **dockable sidebar card** or sticky floating card.
  - Add **gold/silver/bronze subtle highlights** for top 3.
  - Show **Δ points vs. actual leaderboard** (e.g., “+1.5 pts vs. actual”).

---

## 6. Typography & Spacing
- **Issue**: Type scale is too uniform.
- **Actions**:
  - Use **4-level type scale**:
    - H2 = 20px bold (section titles)
    - H3 = 16px bold (subheaders)
    - Body = 14px
    - Caption = 12px
  - Increase **line-height** in grids.
  - Add **extra spacing** between grouped sections (e.g., WEST vs EAST).

---

## 7. Cutting-Edge Feel
- **Suggestions**:
  - Apply **glassmorphism or soft neumorphism** (frosted/blurred cards).
  - Use **micro-animations** (fade-in rows, animated counters, hover highlights).
  - On **mobile**, collapse grids into **accordion-style cards** with expandable sections.

---
