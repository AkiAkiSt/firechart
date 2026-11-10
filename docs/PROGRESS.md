# Firechart: progress

The single place to see where the project stands. Updated in the same commit as
the work it describes.

## Now

**Milestone:** M0, spec and design, complete apart from the owner's review.
**Updated:** 10 November 2026.

Research, spec, architecture, decisions, roadmap and the design mockup are
written and pushed. Building (M1) starts once the owner has looked at the spec
and mockup.

## Waiting on the owner

1. Reactions to the mockup: the overall look, streak heat, anything that feels
   wrong.
2. The remaining open questions in `docs/SPEC.md`, section 10.
3. The go-ahead to start M1.

Not needed yet, but coming in M2: a free Supabase account, which the owner has
to create themselves.

## Decided by the owner

| Date | Decision |
|---|---|
| 2026-11-10 | The group uses both Android phones and iPhones, so the installable web app is the first phone version; an Android APK follows. |
| 2026-11-10 | The repository is private while building and becomes public when the first version ships. |
| 2026-11-10 | GitHub CLI and Node.js may be installed on the PC in the user folder. |

## Next

M1: scaffold the app and build the heatmap, Today, chart detail and Style
screens with on-device storage (`docs/ROADMAP.md`).

## Links

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
deleting the two folders and the two PATH entries.

Windows 10 (build 19045). Wallpaper mode on Windows 11 24H2 cannot be tested on
this machine.

## Log

### 2026-11-10

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
