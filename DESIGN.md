---
name: NBA Predictions Game — Courtside Album
description: A calm, collectible NBA scorebook where picks, rank, calls, and comparisons live on ruled white sheets.
colors:
  paper: "#ffffff"
  paper-cool: "#f7fbfe"
  sheet-wash: "#f5f8fa"
  carbon-ink: "#101214"
  steel-ink: "#53606d"
  quiet-ink: "#687584"
  nba-blue: "#07549a"
  nba-blue-dark: "#063d70"
  nba-blue-soft: "#e8f2fb"
  nba-red: "#d52b1e"
  nba-red-dark: "#9f2018"
  nba-red-soft: "#fcecea"
  leader-gold: "#e7b92f"
  leader-gold-soft: "#fff4c7"
  hardwood-tan: "#c9985b"
  carbon-rule: "#15181a"
  ledger-rule: "#aeb8c1"
  soft-rule: "#cfd4d8"
  success: "#15703b"
  warning: "#9a5a00"
  danger: "#b42318"
typography:
  display:
    fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif'
    fontSize: "clamp(50px, 5.5vw, 86px)"
    fontWeight: 800
    lineHeight: 0.86
    letterSpacing: "-0.025em"
  headline:
    fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif'
    fontSize: "clamp(38px, 6vw, 68px)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "0.01em"
  title:
    fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif'
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.02em"
  body:
    fontFamily: '"Source Sans 3", system-ui, sans-serif'
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
  data:
    fontFamily: '"Source Sans 3", system-ui, sans-serif'
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.25
  label:
    fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif'
    fontSize: "11px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.08em"
rounded:
  square: "0"
  ticket: "1px"
  ledger: "2px"
  tight: "3px"
  control: "4px"
  panel: "5px"
  hero: "6px"
spacing:
  hairline: "4px"
  compact: "8px"
  inset: "12px"
  panel: "16px"
  roomy: "20px"
  spread: "24px"
components:
  button-primary:
    backgroundColor: "{colors.nba-blue}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "11px 12px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.nba-blue-dark}"
    textColor: "{colors.paper}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.carbon-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "11px 12px"
    height: "44px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.carbon-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    height: "48px"
  sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.carbon-ink}"
    rounded: "{rounded.ledger}"
    padding: "16px"
  navigation-active:
    backgroundColor: "{colors.nba-blue}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    height: "52px"
  answer-ticket:
    backgroundColor: "{colors.sheet-wash}"
    textColor: "{colors.carbon-ink}"
    typography: "{typography.data}"
    rounded: "{rounded.ticket}"
    padding: "6px 8px"
    height: "32px"
  simulation-score-band:
    backgroundColor: "{colors.leader-gold-soft}"
    textColor: "{colors.carbon-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    height: "52px"
---

# Design System: NBA Predictions Game — Courtside Album

## Overview

**Creative North Star: "The Courtside Album"**

The Courtside Album is a calm, collectible NBA scorebook: a durable league program or season album, never a generic SaaS dashboard. Predictions, current rank, scored calls, and side-by-side comparisons are written onto white stock with carbon rules, flat league color, compressed arena-program type, and real team marks.

Its story is sequential and visible in the surfaces: enter picks on ruled slips, follow calls in the season scorebook, climb the joined table, then unfold advanced comparison and private What-If detail. The first viewport always names the task and places the participant's current entry, deadline, rank, score, or next action beside it. On mobile, task and action precede secondary explanation or detail.

Dense workflows stay inside the same album world. Home uses an attached entry ledger; profile becomes a player passport and answer book; Cup leaders join into one score sheet; comparison tools rise as rule sheets; and What-If marks changes directly on the live-looking table without altering live results.

**Key Characteristics:**

- White scorebook stock divided by crisp carbon and steel rules.
- Barlow Condensed identity type paired with Source Sans 3 for decisions and data.
- Flat NBA blue and red for navigation, conference, and league context.
- Sparse gold attached to participant identity, leaders, focus, and simulation feedback.
- Near-square controls, slips, tickets, ledgers, and score rows instead of rounded SaaS cards.
- Persistent mobile bottom navigation that becomes a ruled desktop rail.
- Responsive comparison that deliberately changes table orientation for scanability while preserving the same facts and actions.

## Colors

The palette reads as ink, stamps, and selective league color on a white season scorebook. A small neutral ladder gives dense tables enough separation without turning every tonal step into a new card.

### Primary

- **NBA Blue** (`colors.nba-blue`): Active navigation, primary actions, Eastern Conference structure, selection marks, links, and key sheet headers.
- **Deep NBA Blue** (`colors.nba-blue-dark`): Hover and pressed register for blue actions.
- **Pale Blue Sheet** (`colors.nba-blue-soft`): Attached control ledgers, selected regions, and quiet league-blue context.

### Secondary

- **NBA Red** (`colors.nba-red`): Western Conference structure, Cup counterpoint, mastheads, and decisive secondary actions.
- **Deep NBA Red** (`colors.nba-red-dark`): Reinforced red states when the base red needs greater contrast.
- **Pale Red Sheet** (`colors.nba-red-soft`): Quiet red context and non-destructive negative status fields.

### Tertiary

- **Leader Gold** (`colors.leader-gold`): The signed-in participant, first-place emphasis, keyboard focus, moved ranks, insertion stripes, and active What-If state.
- **Pale Leader Gold** (`colors.leader-gold-soft`): Attached simulation score bands, changed cells, leader rows, and identity fields.
- **Hardwood Tan** (`colors.hardwood-tan`): Rare basketball-material accent; never a page ground.

### Neutral

- **Clean Paper** (`colors.paper`): Universal page, sheet, input, navigation, and ticket ground.
- **Cool Paper** (`colors.paper-cool`): The faint home cover field behind its attached entry ledger.
- **Scorebook Wash** (`colors.sheet-wash`): Expanded rows, quiet table regions, and structural alternation inside a joined sheet.
- **Carbon Ink** (`colors.carbon-ink`): Primary text, dark column bands, and decisive structure.
- **Steel Ink** (`colors.steel-ink`): Supporting instructions and row metadata that must remain readable.
- **Quiet Ink** (`colors.quiet-ink`): Tertiary metadata and nonessential annotations.
- **Carbon Rule** (`colors.carbon-rule`): Two-pixel outer frames and decisive separators.
- **Ledger Rule** (`colors.ledger-rule`): Strong one-pixel row divisions in dense score sheets.
- **Soft Rule** (`colors.soft-rule`): Quiet internal columns, compact grids, and secondary dividers.
- **Success, Warning, and Danger** (`colors.success`, `colors.warning`, `colors.danger`): Trust-critical grading, payment, submission, and error states.

### Named Rules

**The White Stock Rule.** Participant surfaces use clean white as their ground; cream is not a substitute.

**The Sparse Gold Rule.** Gold identifies the signed-in participant, a leader, keyboard focus, or active simulation feedback; it is not general decoration.

**The Tonal Step Rule.** Cool paper, scorebook wash, steel ink, and ledger rules may clarify hierarchy inside one sheet; they must not be promoted into floating neutral cards.

## Typography

**Display Font:** Barlow Condensed (with Arial Narrow and sans-serif fallbacks)

**Body Font:** Source Sans 3 (with system UI and sans-serif fallbacks)

**Character:** Barlow Condensed gives page identities, ranks, stamps, tabs, and score bands the authority of an arena program. Source Sans 3 carries instructions, questions, names, answers, and comparison values with restrained clarity.

### Hierarchy

- **Display** (800, fluid 50–86px desktop range, 0.86 line-height): Direct home and major page statements. Mobile endpoints may tighten to 48–76px to keep the task identity intact without pushing the action out of view.
- **Headline** (800, fluid 38–68px range, 0.9 line-height): Picks, leaderboard, profile, and Cup identities above current state or action.
- **Title** (800, 28px, 1 line-height): Ruled section heads, sheet mastheads, and passport groups.
- **Body** (400, 16px, 1.45 line-height): Explanations, deadlines, form text, and decision support; long passages stay near 42–48 characters per line.
- **Data** (700–800, 11–13px, at least 1.25 line-height): Player names, answers, score values, records, and dense row content. Eleven pixels is the compact mobile floor for meaningful data; use 13px when space permits.
- **Label** (800, 11px, 0.08em letter-spacing, uppercase): Navigation, controls, ranks, sheet headings, and compact states.
- **Microprint** (800, 9–10px, 0.08–0.16em letter-spacing, uppercase): Auxiliary kickers, abbreviations, and annotations only. It never carries a question, answer, score, or action by itself.

### Named Rules

**The Scorebook Voice Rule.** Use Barlow Condensed for identity, navigation, score, and state; use Source Sans 3 for reading and decision support.

**The Readable Ledger Rule.** Dense screens may use the intentional 9–13px scale, but core names, answers, values, and actions stay at 11px or larger; microprint remains supplemental.

**The Direct Headline Rule.** Fluid display endpoints are reserved for unmistakable page identity and must leave current entry or score context visible in the first viewport.

## Layout

Mobile is the primary operating composition. A fixed 56px masthead and persistent five-item bottom navigation reserve the top and thumb zones; the bottom bar is 74px plus the safe area. Pages use 12–16px outer insets, 8–12px compact gaps, and touch targets of at least 44px. Task identity and the current entry, deadline, score, or primary action appear before secondary detail.

At 768px, the bottom navigation becomes a fixed 220px ruled rail and the masthead grows to 64px. Participant content occupies the remaining canvas, generally capped near 1380px; the home album may widen to 1560px from 1200px upward. Home pairs its direct task statement with a flat attached entry ledger. Picks use ruled slips and a sticky submission ledger near the action edge. Profile assembles a season passport, four-part score strip, category ledger, recent calls, moments, and answer book. Cup leaders remain connected rows with prediction detail behind expansion.

Advanced comparison is one Fold-Out Comparison workspace. Sorting, selected players, live/private state, and score context remain attached above the data. The comparison roster and What-If explanation use bottom sheets on mobile and centered rule sheets on desktop. During simulation, the attached score band turns gold, totals and deltas update in place, moved teams show old→new ranks, the drop target draws a directional gold insertion stripe, and Reset What-If remains available beside the mode controls.

**The First Ledger Rule.** The first viewport must make the task unmistakable and show the participant's current entry, score, rank, deadline, or next action; mobile places the task and action before secondary detail.

**The Context Stays Attached Rule.** Sorting, compared players, participant identity, section mode, and What-If state remain visually attached to the data they change.

**The Mobile Comparison Transposition Rule.** Advanced standings intentionally transpose by viewport. Mobile uses player rows with fixed player and score cells while team columns swipe horizontally; desktop uses team rows with participant columns. This is the same comparison model optimized for each scan pattern, not an information-architecture divergence or responsive defect.

## Elevation & Depth

The album is flat at rest. White sheets separate through two-pixel carbon frames, one-pixel ledger rules, attached tonal fields, and hard league-color strips—not ambient card shadows. Open desktop menus may use a 4px carbon offset; desktop rule-sheet dialogs may use a 12px hard offset. Both flatten on mobile so bottom sheets feel physically attached to the viewport. Gold inset rules indicate identity or changed simulation state without suggesting floating depth.

### Shadow Vocabulary

- **Structural Menu Offset** (`4px 4px 0 var(--court-rule)`): Open comparison menus only.
- **Desktop Rule-Sheet Offset** (`12px 12px 0 rgb(5 25 45 / 28%)`): Player-roster and What-If sheets on desktop; removed on mobile.
- **Participant Identity Inset** (`inset 0 -5px 0 var(--court-gold)`): The signed-in participant or active simulation score band.

### Named Rules

**The Flat Scorebook Rule.** Surfaces stay flat at rest; use borders, rules, and tonal fields before a shadow.

## Shapes

The form language is square to near-square. Data tickets and dense table cells use 1px corners; ledgers, slips, expanded rows, and sheet sections use 2px; compact menus use 3px; ordinary controls use 4px; legacy broad panels may use 5px; and the home cover reaches only 6px. Internal table bands, tabs, score rows, choice segments, and bottom-sheet edges stay square.

Circular geometry is selective: authentic team logos retain their silhouettes, check marks may sit in square stamps, and a faint court circle can annotate the home cover. Pills are not the default. A rounded treatment is acceptable only when the underlying semantic object is truly circular or when a transient hint must float above the sheet.

**The Ruled Edge Rule.** If content belongs to one data sheet, join it with internal rules instead of scattering it into separate rounded cards.

**The Ticket Radius Rule.** One- and two-pixel radii are intentional softening for dense tickets and ledgers; they should still read as square print artifacts.

## Components

### Buttons

- **Shape:** Near-square controls with a visible carbon frame and 4px corners; segmented ledger actions are square.
- **Primary:** Flat NBA blue with white condensed uppercase text, at least 44px tall, and compact 11px by 12px insets.
- **Hover / Focus:** Hover deepens to dark blue over 160ms ease-out; active state moves down one pixel; keyboard focus uses a three-pixel gold outline offset by three pixels.
- **Secondary:** White stock, carbon text, and the same frame, size, and scorebook voice.
- **What-If / Reset:** Gold marks active simulation; Reset What-If remains written out and attached to the comparison controls.

### Chips

- **Style:** Tight 1–3px rectangular tickets and stamps, never soft capsules. Pale blue, red, gold, or neutral washes carry context while text remains high contrast.
- **State:** Prediction choices become flat NBA blue with white text when selected. Correct, partial, incorrect, pending, and simulated results use explicit color plus written or icon context.

### Cards / Containers

- **Corner Style:** Joined ledgers and score sheets use 1–2px corners; broad panels use 5px only where the composition needs an outer cover.
- **Background:** White stock with attached cool, blue, red, gold, or neutral fields tied to state.
- **Shadow Strategy:** None at rest; see the limited structural exceptions in Elevation & Depth.
- **Border:** Two-pixel carbon outer frame with one-pixel ledger or soft internal rules.
- **Internal Padding:** 12–20px according to density; row geometry carries rhythm in data-heavy sheets.

### Inputs / Fields

- **Style:** White field, decisive carbon stroke, 4px corners, dark text, and a 48px minimum height. Search fields may join directly to adjacent roster actions.
- **Focus:** Three-pixel gold outline with three-pixel separation; focus is never communicated by color alone.
- **Error / Disabled:** Use explicit danger or muted treatment and preserve readable labels. Payment, deadline, and submission validity stay written out.

### Navigation

Mobile uses a persistent five-cell bottom bar: Home, Picks, Cup, Leaders, and Profile. A line icon sits above a condensed uppercase label; soft rules divide cells and the active destination becomes solid NBA blue. At 768px it becomes a 220px ruled rail with the product logo, current season, full labels, and Advanced Board. Hover uses a pale blue field and carbon frame; active remains solid blue.

### Home Entry Ledger

The home cover pairs its direct task statement with a flat entry sheet attached to a blue binding stripe. A red masthead names the season preview, numbered ruled rows tell the enter→follow→climb story, and the footer joins deadline/account context to Log In or Create Entry actions. On mobile the ledger follows the primary task/action rather than preceding it.

### Season Passport and Answer Book

Profile is a season scorebook, not a settings dashboard. The passport joins a blue monogram, participant identity, current rank stamp, season selector, and four-part score strip. Below it, category rows, Recent Calls, Season Moments, and the full Answer Book use shared ruled-row geometry so a participant can move from total score to evidence without changing visual language.

### Pick Slips and Submission Ledger

Prediction categories use ruled entry slips, square choice scales, and attached headers instead of a form-card grid. The submission action stays near the bottom action edge, joins review and submit controls inside one carbon frame, and remains above the mobile navigation.

### Cup Leader Rows

Prediction leaders form one joined score table with Rank / Player, Record, and Points columns. A row reveals its pick breakdown through expansion; expanded state uses a restrained wash and red binding stripe rather than opening a separate card.

### Comparison Roster Rule Sheet

The player selector rises from the mobile bottom edge and centers on desktop. Its blue masthead, joined search/select/clear tools, black column band, ranked selectable rows, square check stamps, and attached Update Comparison footer make selection feel like editing the roster on a physical sheet.

### Fold-Out Comparison and What-If

Live/private status and participant scores form an attached score band above the workspace. What-If first opens a private rule sheet that explains the manipulation without implying publication. Active simulation turns the band gold; affected totals show deltas; moved teams show old→new rank; drag placeholders become gold insertion stripes; and reset remains attached. Awards and props use square, readable answer tickets with full answers and line values, never tiny decorative badges.

## Do's and Don'ts

### Do:

- **Do** start every participant page with an unmistakable task identity and current entry, score, rank, deadline, or primary action in the first viewport.
- **Do** use two-pixel carbon outer rules and one-pixel ledger or soft rules to build joined scorebook sheets.
- **Do** preserve real NBA team names, team-logo assets, and selective blue/red conference context.
- **Do** keep primary touch targets at least 44px and retain the persistent five-item mobile navigation.
- **Do** use the Mobile Comparison Transposition: player rows and swipable team columns on mobile; team rows and participant columns on desktop.
- **Do** reserve gold for participant identity, leaders, focus, active simulation, moved ranks, and insertion feedback.
- **Do** keep What-If visibly private and causal with an attached score band, written reset action, old→new ranks, insertion stripe, and in-place score updates.
- **Do** keep meaningful dense data at 11px or larger and use 9–10px only for supplemental microprint.

### Don't:

- **Don't** use cream or beige as the page background; hardwood tan is an accent, not stock.
- **Don't** fall back to generic SaaS cards, bento grids, glass, glossy gradients, soft shadow stacks, or excessive pill shapes.
- **Don't** treat the mobile standings transposition as a defect or force the desktop row orientation into a narrow viewport.
- **Don't** create separate visual languages for home, picks, profile, Cup, and advanced comparison; bind them into the same album.
- **Don't** let blue, red, gold, or new neutral steps become decorative noise across an entire screen.
- **Don't** hide participant identity, sorting, selected players, or simulation state once they affect visible scores.
- **Don't** make core interactions hover-dependent, encode meaning in microprint alone, or remove the gold keyboard-focus treatment.
