# Firechart: design

Status: draft 1, 10 November 2026. The mockup of every screen lives on a design
canvas (private link in `docs/PROGRESS.md`). This document is the written
version: the references, the tokens and the rules the code must follow.

## 1. References and what we take from them

### GitHub contribution graph

Measured on live profiles and GitHub's own colour tokens
([contributions page](https://github.com/users/octocat/contributions),
[Primer primitives](https://unpkg.com/@primer/primitives@11.10.0/dist/css/functional/themes/light.css)).

- 53 week-columns by 7 day-rows, a rolling year ending today.
- Cells 10 px with 3 px gaps (11 px with 4 px gaps on profiles without the
  activity overview section), 2 px corner radius, hairline border.
- 12 px muted labels: three-letter months above, only Mon, Wed and Fri at the
  side.
- Five levels. Dark theme: `#151b23 #033a16 #196c2e #2ea043 #56d364`; light:
  `#eff2f5 #aceebb #4ac26b #2da44e #116329`. On dark, brighter means more.
- "Less ▢▢▢▢▢ More" legend at the bottom right.
- Tooltip on hover and keyboard focus: "26 contributions on January 18th."
- Every cell is focusable, described in words, and reachable with arrow keys
  ([GitHub changelog](https://github.blog/changelog/2023-03-02-accessibility-improvements-for-the-contribution-graph/)).
- Weakness to avoid: on a phone the grid opens scrolled to the oldest week.

**We take:** the geometry, the label rules, the legend, the tooltip, the
keyboard model, and "brighter means more" on dark.

### Anki Review Heatmap (Glutanimate)

From the add-on's source ([repository](https://github.com/glutanimate/review-heatmap)).

- 10 px square cells, 2 px gaps, weeks start on Monday.
- Five named colour schemes: Lime, Olive, Ice, Magenta, Flame.
- Four streak numbers under the chart: daily average, days learned (%),
  longest streak, current streak. The numbers are coloured by how good they
  are.
- Today is outlined. The current streak survives until a full day is missed,
  and the day rolls over at 4 am by default.
- Two views: one calendar year per page, or a continuous run of months.
- Weaknesses users mention: no legend, and a dark-mode ramp that reads as
  reversed.

**We take:** named colour schemes, the four numbers, the outlined today, the
streak surviving until the day is over, the optional late day rollover, and a
year-per-page view.

### Others

- **Everyday**: colour saturation grows with streak length. This is the
  precedent for our streak heat.
- **Loop**: skipped days drawn half-tint with diagonal hatching; the number of
  columns adapts to the width; today is always the rightmost column.
- **HabitKit**: today at the right edge, about a month on overview cards and a
  year in detail; home-screen widgets.
- **Habitify, Streaks**: a quick fill animation, a light haptic, one
  celebration a day.
- **Monkeytype**: a fluid CSS grid with the ramp derived from one theme colour.

## 2. Direction: Coal and Ember

A matte, near-black, utilitarian tracker in which the only colour on screen is
the heat itself. No gradients, no shadows, hairline borders, generous dark
space. What people should remember is **streak heat**: cells that burn brighter
the longer the run.

Because every person restyles their own charts, the chrome stays neutral so
that any colour a person picks looks right on it.

## 3. Tokens

### Surfaces and ink

| Token | Dark | Light | Use |
|---|---|---|---|
| `plane` | `#0c0d10` | `#f4f5f7` | App background |
| `surface` | `#15171c` | `#ffffff` | Cards |
| `raised` | `#1c1f26` | `#f0f1f4` | Selected rows, pressed states |
| `line` | `#262a32` | `#dcdfe5` | Hairline borders |
| `control-line` | `#3a3f49` | `#c3c8d0` | Borders of buttons and inputs |
| `empty` | `#22262e` | `#e6e8ec` | A cell with no tick |
| `ink` | `#f2f3f5` | `#14161a` | Primary text |
| `ink-2` | `#b4bac4` | `#454b57` | Secondary text |
| `muted` | `#8b93a1` | `#626a78` | Labels and captions |

Text contrast on `surface`: ink 16:1, ink-2 9:1, muted 5.8:1 (dark); 18:1,
8.8:1, 5.5:1 (light). All clear 4.5:1.

### Heat ramps

Four levels per ramp. On dark, level 1 is the dimmest and level 4 the
brightest; on light it runs the other way, so "more" always means "further from
the background". Every ramp has evenly rising lightness (so the order does not
depend on telling hues apart), and its level 1 clears 2:1 against the card.
`tools/ramps.py` generates and checks these.

| Ramp | Dark, level 1 to 4 | Light, level 1 to 4 |
|---|---|---|
| Ember | `#953a1c #cf5604 #f68c11 #ffd15a` | `#e5a83a #dc7702 #c14802 #971d08` |
| Moss | `#1d6835 #21954a #37c667 #65f68e` | `#58cd78 #1eab53 #02853c #005e28` |
| Ice | `#225b8d #2c83c5 #4eb2f1 #a1defe` | `#73baea #3c96d8 #0f72bb #014f8a` |
| Orchid | `#7d397c #b151af #df7ddd #fcbbf9` | `#e18fde #c760c6 #a33ea2 #762575` |
| Bone | `#55585d #7d8085 #abaeb3 #dfe1e5` | `#aeb1b6 #8c8f94 #696c71 #45484c` |
| Sun | `#72560f #9f7f12 #cfaf1d #f9e03f` | `#cfaf1d #ae8a0d #8c6802 #654702` |
| Coral | `#8e3642 #ca4c58 #f77d80 #fec3c0` | `#f98e8f #e45b63 #c13045 #8c1832` |
| Teal | `#026565 #08908c #24bfb8 #65eee3` | `#49c7c0 #0ca4a0 #0c7f7e #055959` |

Ember is the signature ramp. It is the one ramp that bends its hue, from deep
red-orange toward yellow, so that it reads as fire; its lightness still rises
evenly.

**Custom colours.** When a person picks their own colour, the app keeps its hue
and builds four steps at fixed lightness values (0.46, 0.59, 0.73, 0.87 on
dark; 0.76, 0.65, 0.54, 0.42 on light, in OKLCH), reducing saturation only
where the screen cannot show it. Every custom ramp therefore passes the same
checks as the presets.

### Type

- **Inter** for interface text (400, 500, 600).
- **Space Grotesk** for headings and numbers (600).
- Sizes: screen title 30/36, card title 16/22, body 14/20, caption 12/16, chart
  labels 10/12 to 11/14.
- Numbers in text ink, never in the chart's colour; a small flame in the
  chart's colour sits beside a streak.

### Shape and spacing

- Cards: 18 px radius, 1 px `line` border, 14 to 16 px padding.
- Controls: 44 px minimum touch height, 12 to 14 px radius.
- Spacing steps: 2, 4, 8, 10, 12, 16, 20, 24.

## 4. The heatmap

### Geometry

| Context | Columns | Cell | Gap |
|---|---|---|---|
| Phone chart card | 20 weeks, fills the card | about 13 px | 3 px |
| Phone year view | two blocks of 27 weeks | 10 px | 2 px |
| Phone friend preview | 15 weeks | about 8 px | 2 px |
| Desktop | 53 weeks | 10 px | 3 px |
| Wallpaper | 26 weeks | 10 px | 3 px |

- Seven rows, week starting Monday by default. Cells flow down each column,
  oldest column on the left, the current week on the right.
- The number of columns adapts to the width; today is always in the last
  column. Never open scrolled to old history.

### Cell states

| State | Looks like |
|---|---|
| Done | A ramp colour, level 1 to 4 |
| Not done | `empty` |
| Still open (today or yesterday, unticked) | `empty`, the same as not done; it just does not break the streak yet |
| Today | A 1.5 px ink outline around the cell, whatever its fill |
| Future | A faint 1 px outline, no fill |
| Not planned (off-day) | Hollow: 1 px `line` outline, no fill |
| Skipped (later) | Half-tint of the ramp with diagonal hatching |
| Before the chart existed | `empty` |

States differ in more than colour (outline, hollow, hatching), so they survive
colour blindness and forced-colour modes.

### Shapes

Rounded (radius about 25% of the cell), square (1 px), or dot (circle). Shape
is chosen per chart.

### Labels, legend, tooltip

- Month labels above the first week of each month, in `muted`. On desktop, Mon,
  Wed and Fri at the side.
- Legend "Less ▢▢▢▢▢ More" on detail views.
- Tooltip on hover, tap and keyboard focus: "Mon 9 Nov · done".
- Each cell has a text description, and arrow keys move between cells.

### On a photo background

A chart is never drawn directly on a photo. It sits on a card at 72% opacity
with background blur, and the empty-cell colour becomes white at 12% opacity.
The photo itself gets a dimming layer (adjustable, 20 to 40%).

## 5. Components

- **Chart card**: icon, name, streak line, tick button, grid.
- **Tick button**: 44 px square, 14 px radius. Empty: `control-line` outline,
  muted check. Done: filled with the chart's level 4, dark check.
- **Yesterday prompt**: dashed outline, the chart's name, an "I did it" button.
- **Stat tile**: number in Space Grotesk 20/26 over a caption.
- **Segmented control**: pill group on `plane`, selected segment on `raised`.
- **Swatch row**: 26 px colour dots in 44 px targets; the selected one has an
  ink ring; a dashed "+" opens the custom picker.
- **Scoreboard row**: rank, avatar initial on the person's colour, name,
  percentage, a 4 px bar in the person's colour, streak with flame. Your own
  row sits on `raised`.
- **Tab bar** (phone): Today, Charts, Friends, Style. **Sidebar** (desktop):
  the same, plus Wallpaper and the account chip. Until friends exist the items
  are Today, Charts, Style and Settings. Screens opened from another screen
  (chart detail, the chart form) hide the tab bar and show a back arrow.

Each person has one identity colour (the ramp of their first public chart),
used for their avatar and scoreboard bar everywhere.

## 6. Screens

The canvas has seven boards: Today, Chart detail, Friends, a friend's profile,
Style, the desktop app, and wallpaper mode. Layout notes:

- **Today (phone)** fits three charts without scrolling; more scroll.
- **Chart detail** edits recent days with large round day buttons rather than
  by tapping 10 px cells.
- **Friends** leads with the scoreboard, because comparison is the point, then
  friend cards.
- **Friend profile** is that friend's space: their photo, their shapes, their
  colours.
- **Desktop** shows every chart at full year width in the main column, with
  friends and the scoreboard in a side column that drops below on narrow
  windows.

## 7. Motion and feedback

- Ticking: the cell fills over about 150 ms and the streak number rolls up.
- A light haptic on phones.
- One small celebration a day, when the last chart is ticked.
- All motion respects the system's reduced-motion setting.

## 8. Accessibility

- Text contrast at least 4.5:1; ramp level 1 at least 2:1 against its card.
- Order within a ramp is carried by lightness, not hue.
- Real buttons and links throughout; visible focus rings.
- Touch targets at least 44 px.
- The grid is keyboard-navigable and each cell is described in words.
