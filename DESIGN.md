---
name: NBA Predictions Game — Courtside Album
description: A calm, collectible NBA scorebook for making picks, tracking rank, and unfolding deep comparisons.
colors:
  paper: "#ffffff"
  carbon-ink: "#101214"
  nba-blue: "#07549a"
  nba-blue-dark: "#063d70"
  nba-blue-soft: "#e8f2fb"
  nba-red: "#d52b1e"
  nba-red-dark: "#9f2018"
  nba-red-soft: "#fcecea"
  leader-gold: "#e7b92f"
  leader-gold-soft: "#fff4c7"
  hardwood-tan: "#c9985b"
  muted-ink: "#5d6368"
  carbon-rule: "#15181a"
  soft-rule: "#cfd4d8"
  success: "#15703b"
  warning: "#9a5a00"
  danger: "#b42318"
typography:
  display:
    fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif'
    fontSize: "clamp(2.7rem, 12vw, 5.5rem)"
    fontWeight: 800
    lineHeight: 0.84
    letterSpacing: "-0.025em"
  headline:
    fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif'
    fontSize: "clamp(2.25rem, 10vw, 4.75rem)"
    fontWeight: 800
    lineHeight: 0.88
    letterSpacing: "-0.02em"
  title:
    fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif'
    fontSize: "1.8rem"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.02em"
  body:
    fontFamily: '"Source Sans 3", system-ui, sans-serif'
    fontSize: "1rem"
    fontWeight: 400
  label:
    fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif'
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.035em"
rounded:
  square: "0"
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
  panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.carbon-ink}"
    rounded: "{rounded.panel}"
    padding: "16px"
  navigation-active:
    backgroundColor: "{colors.nba-blue}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    height: "52px"
  identity-score-strip:
    backgroundColor: "{colors.leader-gold-soft}"
    textColor: "{colors.carbon-ink}"
    typography: "{typography.label}"
    height: "52px"
---

# Design System: NBA Predictions Game — Courtside Album

## Overview

**Creative North Star: "The Courtside Album"**

The Courtside Album turns prediction data into a calm, collectible scorebook. Clean white stock, carbon rules, condensed display type, and flat league color make the experience feel printed and durable while real NBA names and team marks keep every decision immediately recognizable.

Simple participant tasks stay in the same album world: scan the season state, make or review picks, track rank, and manage the account. Dense comparison becomes a Fold-Out Comparison rather than a different product—controls, identity, scores, and simulated standings remain attached to the same ruled sheet as detail unfolds.

The system is mobile-primary and deliberately refuses generic SaaS cards, cream grounds, glass, glossy gradients, soft bento clusters, excessive pills, and neon esports spectacle. Information earns hierarchy through rules, strips, typography, and sparse color rather than decorative containers.

**Key Characteristics:**

- Clean white stock divided by crisp carbon rules.
- Condensed, uppercase scorebook display type paired with a highly legible text face.
- Flat NBA blue and red for navigation, conference, and league context.
- Sparse gold reserved for participant identity, leaders, and What-If feedback.
- Mobile masthead and persistent five-item bottom navigation that expand into a ruled desktop rail.
- Fold-out comparison tables that keep controls, context, and simulation state visible.

## Colors

The palette reads like ink on a white scorebook sheet: carbon establishes structure, league blue and red carry orientation, and hardwood tan and gold appear only where basketball context or participant identity needs emphasis.

### Primary

- **NBA Blue** (`colors.nba-blue`): Active navigation, primary actions, Eastern Conference strips, selection states, links, and key section markers.
- **Deep NBA Blue** (`colors.nba-blue-dark`): The pressed visual register for primary-action hover states.
- **Pale Blue Sheet** (`colors.nba-blue-soft`): Mastheads, control ledgers, selected data regions, and quiet NBA-blue emphasis.

### Secondary

- **NBA Red** (`colors.nba-red`): Western Conference strips, tournament counterpoint, and selective league context.
- **Deep NBA Red** (`colors.nba-red-dark`): Reserved darker red register for reinforced red states.
- **Pale Red Sheet** (`colors.nba-red-soft`): Quiet red status and contextual backing.

### Tertiary

- **Leader Gold** (`colors.leader-gold`): Signed-in participant identity, first-place emphasis, focus outlines, and live What-If manipulation.
- **Pale Leader Gold** (`colors.leader-gold-soft`): The participant's score strip, moved standings rows, simulation placeholders, and leader rows.
- **Hardwood Tan** (`colors.hardwood-tan`): A restrained basketball-material accent; never a page ground.

### Neutral

- **Clean Paper** (`colors.paper`): The universal page, panel, input, and navigation surface.
- **Carbon Ink** (`colors.carbon-ink`): Primary text and high-contrast scorebook headers.
- **Carbon Rule** (`colors.carbon-rule`): The dominant two-pixel frame and divider language.
- **Soft Rule** (`colors.soft-rule`): One-pixel internal row and cell divisions.
- **Muted Ink** (`colors.muted-ink`): Supporting copy and secondary metadata.
- **Success, Warning, and Danger** (`colors.success`, `colors.warning`, `colors.danger`): Trust-critical submission, payment, grading, and error states.

### Named Rules

**The White Stock Rule.** Participant surfaces use clean white as their ground; cream is not a substitute.

**The Sparse Gold Rule.** Gold identifies the signed-in participant, a leader, keyboard focus, or active simulation feedback; it is not general decoration.

**The Conference Pair Rule.** Blue and red may distinguish East and West or related NBA contexts, but they do not compete across every element on a screen.

## Typography

**Display Font:** Barlow Condensed (with Arial Narrow and sans-serif fallbacks)
**Body Font:** Source Sans 3 (with system UI and sans-serif fallbacks)

**Character:** Barlow Condensed gives page identities, score strips, ranks, controls, and section labels the compressed authority of an arena program. Source Sans 3 carries explanations, forms, and dense comparison content without turning the album into a novelty display.

### Hierarchy

- **Display** (800, responsive oversized scale, 0.84 line-height): Direct home statements and the largest identity moments; uppercase and normally limited to roughly 12 characters per line.
- **Headline** (800, responsive page scale, 0.88 line-height): Leaderboard, submissions, profile, and NBA Cup page identities above the first action or season state.
- **Title** (700, 1.8rem, 0.98 line-height): Ruled section heads and major cardless content groups.
- **Body** (400, 1rem): Explanations, deadlines, instructions, form text, and dense comparison values; long introductory copy stays near 48 characters per line where the implementation constrains it.
- **Label** (700, 0.75rem, 0.035em letter-spacing, uppercase): Navigation, scorebook headings, ranks, compact controls, and state labels.

### Named Rules

**The Scorebook Voice Rule.** Use Barlow Condensed for identity, navigation, score, and state; use Source Sans 3 for reading and decision support.

**The Direct Headline Rule.** The first viewport opens with an oversized headline or unmistakable page identity, never an ornamental eyebrow stack that delays the task.

## Layout

Mobile is the primary composition. A fixed 56px masthead and persistent five-item bottom navigation reserve the top and thumb zones; the bottom bar is 74px plus the device safe area, and every principal action has at least a 44px touch target. Pages use 12px outer insets, compact 8–12px gaps, direct page identity, and the primary action or state above the fold.

At 768px, the bottom navigation becomes a fixed 220px ruled rail, the top bar grows to 64px and starts after the rail, and the page canvas occupies the remaining width. Home becomes a two-part hero and a wide album sheet; conference standings may sit side by side. Core content uses up to 1380px where defined, while the home album caps at 1560px from 1200px upward.

Advanced leaderboard detail is a Fold-Out Comparison. On mobile it uses a viewport-height workspace with independently scrollable comparison content and compact horizontal controls. On desktop, headers and controls become sticky, the comparison is framed as one wide ruled sheet, and both the persistent score band and the current simulation state remain visible while data unfolds.

**The Context Stays Attached Rule.** Sorting, compared players, participant identity, section mode, and What-If state remain visually attached to the data they change.

**The Mobile Truth Rule.** Desktop reveals more columns and simultaneous context; it does not introduce a separate information architecture.

## Elevation & Depth

The system is flat by default and uses no ambient card shadows. White surfaces are separated by two-pixel carbon frames, one-pixel internal rules, alternating pale fields, and hard color strips. The single lifted treatment is a structural 4px carbon offset on open comparison menus; gold inset rules mark identity or changed simulation state without implying floating depth.

### Shadow Vocabulary

- **Structural Menu Offset** (`4px 4px 0 var(--court-rule)`): Open menus in the detailed comparison only.
- **Participant Identity Inset** (`inset 0 -5px 0 var(--court-gold)`): The signed-in participant's score strip.

### Named Rules

**The Flat Scorebook Rule.** Surfaces stay flat at rest; use borders, rules, and tonal fields before considering a shadow.

## Shapes

The form language is nearly square. Controls use gently eased 3–4px corners, ordinary panels use 5px corners, and the large home sheet reaches only 6px. Score cells, tab segments, table bands, selection groups, and most data rows stay square. Carbon borders are intentionally visible and usually two pixels at the outside edge, softening to one pixel for internal rules.

Circular geometry is selective: the home hero carries a faint court-circle diagram, and authentic team logos preserve their native silhouettes. Pills are reduced to tight rectangular tags; they are not the default container language.

**The Ruled Edge Rule.** If content belongs to one data sheet, join it with internal rules instead of scattering it into separate rounded cards.

## Components

### Buttons

- **Shape:** Compact rectangular controls with a visible carbon frame and 4px corners.
- **Primary:** Flat NBA blue with white condensed uppercase text, at least 44px tall, and compact 11px by 12px insets.
- **Hover / Focus:** Hover deepens to the dark blue register over 160ms ease-out; active state moves down one pixel; keyboard focus uses a three-pixel gold outline offset by three pixels.
- **Secondary:** White stock, carbon text, and the same frame, size, and type as primary.
- **What-If:** White while inactive and leader gold while enabled; simulation state must be visible without relying on hover.

### Chips

- **Style:** Tight 3px rectangular labels and score markers, not soft capsules. Pale blue, red, or gold backgrounds communicate context; carbon text remains the default.
- **State:** Selected prediction choices become flat NBA blue with white text. Trust-critical statuses use the dedicated success, warning, or danger colors.

### Cards / Containers

- **Corner Style:** Mostly 5px panels; 6px is reserved for the home hero.
- **Background:** White stock with occasional pale blue, red, or gold fields attached to a specific state.
- **Shadow Strategy:** None at rest; rely on the flat scorebook vocabulary.
- **Border:** Two-pixel carbon outer frame with one-pixel internal rules.
- **Internal Padding:** 12–20px according to density, with 16px as the recurring panel inset.

### Inputs / Fields

- **Style:** White, carbon two-pixel stroke, 4px corners, dark text, and a 48px minimum height.
- **Focus:** Three-pixel gold outline with three-pixel separation; the outline is never replaced by color alone.
- **Error / Disabled:** Use explicit danger or muted treatment and preserve readable labels; payment and deadline states remain written out.

### Navigation

Mobile uses a persistent five-column bottom bar: Home, Picks, Cup, Leaders, and Profile. Each item stacks a 23px line icon over a condensed uppercase label, with soft vertical rules between items; the active destination becomes a solid NBA-blue cell. Desktop replaces it at 768px with a 220px ruled rail, full labels, the product logo, current season, and a separate Advanced Board destination. Hover uses a pale blue field and carbon frame; active remains solid blue.

### Score Strips

The detailed leaderboard begins with a dark LIVE/SIM status cell and horizontally connected participant cells. The signed-in participant is placed first when available, receives a pale gold field and solid gold inset rule, and is explicitly labeled “You.” Ranks and points use tabular numerals.

### Fold-Out Comparison and What-If

Dense comparisons stay inside one ruled, scrollable workspace with sticky headers and controls on desktop. What-If is a signature direct-manipulation mode: draggable standings rows or columns gain a gold outline, moved items retain pale gold, and placeholders draw a gold insertion rule in the direction of travel. Score deltas update in place so cause and effect remain adjacent.

## Do's and Don'ts

### Do:

- **Do** start every participant page on clean white stock with a direct page identity and its primary action or state above the fold.
- **Do** use two-pixel carbon outer rules and one-pixel soft internal rules to build joined scorebook sheets.
- **Do** preserve real NBA team names, team-logo assets, and selective blue/red conference context.
- **Do** keep every primary touch target at least 44px and retain the persistent five-item mobile navigation.
- **Do** keep account, payment, deadline, and recovery surfaces inside the same ruled album shell.
- **Do** reserve gold for the signed-in participant, leaders, focus, and What-If feedback.
- **Do** keep What-If drag-and-drop visibly causal with an insertion rule, moved state, and in-place score updates.

### Don't:

- **Don't** use cream or beige as the page background; hardwood tan is an accent, not stock.
- **Don't** fall back to generic SaaS cards, bento grids, glass, glossy gradients, soft shadow stacks, or excessive pill shapes.
- **Don't** create a separate visual language for dense comparison; unfold the Courtside Album instead.
- **Don't** let blue, red, or gold become decorative noise across an entire screen.
- **Don't** hide participant identity, sorting, compared players, or simulation state once they affect visible scores.
- **Don't** make core interactions hover-dependent or remove the gold keyboard-focus treatment.
