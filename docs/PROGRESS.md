# Firechart: progress

The single place to see where the project stands. Updated in the same commit as
the work it describes.

## Now

**Milestone:** M1 is complete and live. M2 (accounts and sync) is next.
**Updated:** 10 November 2026.

The app is published at https://akiakist.github.io/firechart/ and installs on
phones and desktops. It does everything planned for M1: creating and editing
charts, ticking today, catching up on yesterday, the year view, per-chart
colour, shape and heat, light and dark themes, a photo background, export and
import, and working offline.

## Waiting on the owner

1. Install it on a phone and the PC, use it for a few days, and say what should
   change in the look or the behaviour.
2. The go-ahead to start M2. The owner asked for it not to start yet.
3. The remaining open questions in `docs/SPEC.md`, section 10.

## Ready for M2

- The owner created the Supabase project (free plan, Frankfurt) on 10 November
  2026, with the Data API on, new tables not exposed automatically, and
  row-level security switched on automatically for new tables. Every table
  will therefore need explicit grants in its migration.
- The Supabase CLI (3.1.0) is a dev dependency of the repository root; run it
  as `npx supabase` from there. The owner is signed in and the folder is linked
  to the project. The CLI acts on a local stack unless `--remote` is passed.
- Verified: `npx supabase migration list --remote` reaches the database and
  reports no migrations.
- The project's address and publishable key are not in the repository yet; M2
  adds them to the app, where they are meant to be public.

## Decided by the owner

| Date | Decision |
|---|---|
| 2026-11-10 | The group uses both Android phones and iPhones, so the installable web app is the first phone version; an Android APK follows. |
| 2026-11-10 | The repository is private while building and becomes public when the first version ships. |
| 2026-11-10 | GitHub CLI and Node.js may be installed on the PC in the user folder. |
| 2026-11-10 | Build milestone 1. |
| 2026-11-10 | Make the repository public and publish the app. |

## Next

M2: accounts and sync (`docs/ROADMAP.md`). The schema, privacy rules, sign-in
screens and sync engine can be written before the Supabase project exists;
testing them against a real project needs the owner's account.

## Verified in M1

| What | How |
|---|---|
| Dates, schedules, streaks, heat, consistency | 37 unit tests |
| Colour ramps, including custom colours across every hue | 24 unit tests |
| Heatmap layout and month labels | 10 unit tests |
| Storage, export, import, delete | 14 unit tests against an in-memory database |
| Routes | 2 unit tests |
| Screens on a phone-sized and a desktop-sized window | Driven in a browser: create, tick, catch up on yesterday, select and change a past day by tap and by arrow keys, edit, archive, restore, reorder, delete, switch theme, week start and photo background |
| Installable and offline | Production build served from `/firechart/`: service worker active, and a reload with the server stopped still loads the app |
| CI | The `test` workflow passes on GitHub |
| The published site | Loads at the public address with its manifest, icons and service worker |

Not yet checked: installing on a real phone, and the export and import buttons
end to end (the logic is unit-tested; the file download itself was not).

## Known gaps, on purpose

- No accounts, sync or friends yet. Data lives only in the browser or installed
  app it was entered in. Export a backup before clearing site data.
- The day cannot yet be set to end after midnight.
- Charts are reordered with arrow buttons, not by dragging.

## Links

- The app: https://akiakist.github.io/firechart/
- Repository: https://github.com/AkiAkiSt/firechart (public since 10 November
  2026)
- Design canvas (private to the owner's Claude account; seven screens: Today,
  Chart detail, Friends, a friend's profile, Style, Desktop, Wallpaper):
  https://claude.ai/artifact/JbgewLZNSRouEqUTQv2g59

## Tooling

Building needs Node.js 22.12 or newer and, for releases, the GitHub CLI. Both
are installed on the owner's PC. Testing the desktop app locally (M4) will also
need the Rust toolchain. The development PC runs Windows 10, so wallpaper mode
on Windows 11 24H2 cannot be tested on it.

## Log

### 2026-11-10, Supabase tooling

- Installed the Supabase CLI, initialised `supabase/`, signed in and linked the
  owner's new project. Nothing was changed on the project itself.

### 2026-11-10, milestone 1

- Scaffolded the app under `app/`: Vite 8, React 19, TypeScript 7, Tailwind 4,
  Vitest, Oxlint.
- Wrote and tested the domain logic, colour ramps, storage and heatmap layout.
- Built the screens: Today, chart form, chart detail, chart list, Style,
  Settings, with a tab bar on phones and a sidebar on wider windows.
- Made the app installable with offline support and generated its icons.
- Added CI (`test`) and a Pages deployment workflow (`deploy-web`) that stays
  idle while the repository is private.
- With the owner's go-ahead, made the repository public, enabled GitHub Pages
  and deployed. The first push after the visibility change was refused for a
  few seconds ("repository is disabled") and went through on retry.
- Two rules were settled while building; see `docs/DECISIONS.md`, D14 and D15.

### 2026-11-10, milestone 0

- Researched existing habit trackers, the GitHub and Anki heatmap designs, free
  backends, free distribution on Windows, Android and iPhone, and live
  wallpaper feasibility. Findings and sources: `docs/RESEARCH.md`.
- Wrote the product spec, design document, architecture, decision log and
  roadmap.
- Designed and checked eight colour ramps for dark and light themes
  (`tools/ramps.py`).
- Built the design mockup: seven screens on a design canvas. The canvas has not
  been visually checked after publishing; flag anything that looks wrong.
- Installed GitHub CLI and Node.js, signed in to GitHub, created the private
  repository and pushed.
