# Firechart: progress

The single place to see where the project stands. Updated in the same commit as
the work it describes.

## Now

**Milestone:** M2, accounts and sync, is built and live. One check is left for
the owner: a tick made on the phone should appear on the PC.
**Updated:** 10 November 2026.

The app at https://akiakist.github.io/firechart/ now has accounts. It still
works without one; signing in keeps charts, ticks, settings and the background
photo in step between devices.

## Waiting on the owner

1. **Create your account**: in the app, Settings, Create an account, using the
   one-time owner invite code given in chat (valid until 17 November 2026).
   Then sign in on the second device and check that a tick travels across.
2. **Switch on backups** (ten minutes, once): the two secrets described in
   `docs/OPERATIONS.md`. Until then there is no server-side backup.
3. Reactions to the look and behaviour, and the open questions in
   `docs/SPEC.md`, section 10.

## Decided by the owner

| Date | Decision |
|---|---|
| 2026-11-10 | The group uses both Android phones and iPhones, so the installable web app is the first phone version; an Android APK follows. |
| 2026-11-10 | The repository is private while building and becomes public when the first version ships. |
| 2026-11-10 | GitHub CLI and Node.js may be installed on the PC in the user folder. |
| 2026-11-10 | Build milestone 1. |
| 2026-11-10 | Make the repository public and publish the app. |
| 2026-11-10 | Supabase project created with new tables not exposed automatically and row-level security on by default; GitHub integration left unconnected. |
| 2026-11-10 | Build milestone 2. |

## Next

M3: friends. Circles and invites already exist in the database; what is missing
is the invite screen, the Friends screen, friends being allowed to read each
other's public charts, and the profile view (`docs/ROADMAP.md`).

## State of the live project

- Supabase project `firechart` (free plan, Frankfurt). Two migrations applied.
- Sign-up needs no email confirmation; passwords need 8 characters.
- One circle, "Firechart", with one unused owner invite. No accounts yet.
- `supabase/config.toml` matches the project for every setting it declares.
- Security advisor: two notices remain, both by design (`redeem_invite` and
  `delete_my_account` are meant to be callable by signed-in users).

## Verified in M2

| What | How |
|---|---|
| Privacy rules inside the database | 69 pgTAP checks acting as two circle members, an account with no invite and a signed-out visitor |
| Sign-up, invite codes, privacy through the public API, two devices syncing, account deletion | 5 end-to-end tests against a real Supabase stack started in CI |
| Sync engine: first upload, second device, conflicts, deletes, settings, photo, offline, edits during a sync | 15 unit tests against an in-memory server |
| The live project | Tables, policies and privileges read back after applying; a signed-out request for charts is refused; the keep-alive request answers |
| Sign-in screens and the account section | Rendered in a browser at phone width; no errors |

Not checked, because test accounts must never be created on the real project:
signing up and syncing through the published app. That is the owner's check
above. The backup job has not run yet; it needs its secrets first.

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

### 2026-11-11, colours on phones with forced dark mode

- The owner's first screenshot from a Samsung phone showed the heat colours
  inverted: empty cells white, the hottest cells dull. The phone browser's
  "dark mode for websites" was recolouring a page that is already dark.
- The page now declares its colour scheme in a `color-scheme` meta tag, kept
  in step with the chosen theme (`dark`, or `only light`), and the light theme
  and frosted-glass mode declare theirs in CSS. Released as 0.2.1.
- Not confirmed: forced dark mode cannot be reproduced on the development PC,
  so this needs a fresh screenshot from the phone.

### 2026-11-10, milestone 2

- Wrote the schema, privacy rules and helper functions as a migration, with a
  pgTAP suite, and a CI job that runs them on a throwaway Supabase stack.
- Built the sync engine, the Supabase adapter, account handling and the
  sign-in, sign-up and invite screens; Settings gained an account section.
- Added an end-to-end suite that signs up real accounts on the throwaway stack
  and syncs two devices through the public API.
- Applied both migrations to the live project, set the sign-in options, and
  created the owner's circle and a one-time invite.
- Added the keep-alive and backup workflows and `docs/OPERATIONS.md`.

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
