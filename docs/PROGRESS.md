# Firechart: progress

The single place to see where the project stands. Updated in the same commit as
the work it describes.

## Now

**Milestone:** M1, the app for one person on one device. Built and tested;
one step left: publishing it to a link. **Updated:** 10 November 2026.

Everything in M1 works locally: creating and editing charts, ticking today,
catching up on yesterday, the year view, per-chart colour, shape and heat,
light and dark themes, a photo background, export and import, and installing
the app for offline use.

## Waiting on the owner

1. **The go-ahead to make the repository public and publish the link.** This
   was agreed in principle ("public at launch"); it is the last step of M1 and
   the first time anything becomes visible outside this PC.
2. Reactions to the look and feel once it is installed on a phone and the PC.
3. The remaining open questions in `docs/SPEC.md`, section 10.

Coming in M2: a free Supabase account, which the owner has to create
themselves.

## Decided by the owner

| Date | Decision |
|---|---|
| 2026-11-10 | The group uses both Android phones and iPhones, so the installable web app is the first phone version; an Android APK follows. |
| 2026-11-10 | The repository is private while building and becomes public when the first version ships. |
| 2026-11-10 | GitHub CLI and Node.js may be installed on the PC in the user folder. |
| 2026-11-10 | Build milestone 1. |

## Next

1. Make the repository public, enable GitHub Pages and run the `deploy-web`
   workflow. The app will be at `https://<github-user>.github.io/firechart/`.
2. The owner installs it on phone and PC and uses it for a few days.
3. M2: accounts and sync (`docs/ROADMAP.md`).

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

Not yet checked: installing on a real phone, and the export and import buttons
end to end (the logic is unit-tested; the file download itself was not).

## Known gaps, on purpose

- No accounts, sync or friends yet. Data lives only in the browser or installed
  app it was entered in. Export a backup before clearing site data.
- The day cannot yet be set to end after midnight.
- Charts are reordered with arrow buttons, not by dragging.

## Links

- Repository: private, on GitHub under the owner's account.
- Design canvas (private to the owner's Claude account; seven screens: Today,
  Chart detail, Friends, a friend's profile, Style, Desktop, Wallpaper):
  https://claude.ai/artifact/JbgewLZNSRouEqUTQv2g59

## State of the PC

| Tool | Status |
|---|---|
| git | Installed (2.53). Identity is set for this repository only, using the GitHub no-reply address. |
| GitHub CLI | 2.103.3, unpacked to `%LOCALAPPDATA%\Programs\gh`, signed in, used as git's credential helper for github.com |
| Node.js | 26.13.0 LTS with npm 11.20.0, unpacked to `%LOCALAPPDATA%\Programs\nodejs` |
| Python | Installed (3.14) |
| Java | Installed |
| Rust toolchain | Missing; needed to test the desktop app locally in M4 |

Both tools were added to the user PATH. They were installed from zip files
without admin rights, so they do not update themselves; removing them means
deleting the two folders and the two PATH entries. Programs that were already
running when they were installed do not see them on PATH until restarted.

Windows 10 (build 19045). Wallpaper mode on Windows 11 24H2 cannot be tested on
this machine.

## Log

### 2026-11-10, milestone 1

- Scaffolded the app under `app/`: Vite 8, React 19, TypeScript 7, Tailwind 4,
  Vitest, Oxlint.
- Wrote and tested the domain logic, colour ramps, storage and heatmap layout.
- Built the screens: Today, chart form, chart detail, chart list, Style,
  Settings, with a tab bar on phones and a sidebar on wider windows.
- Made the app installable with offline support and generated its icons.
- Added CI (`test`) and a Pages deployment workflow (`deploy-web`) that stays
  idle while the repository is private.
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
