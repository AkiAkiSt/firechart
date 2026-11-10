# Firechart: architecture

Status: draft 1, 10 November 2026. The reasoning behind each choice, and what
would make us change it, is in `docs/DECISIONS.md`. Sources for every outside
fact are in `docs/RESEARCH.md`.

## 1. Shape of the system

```
            one web codebase (TypeScript + React + Vite)
                             |
        +--------------------+---------------------+
        |                    |                     |
  installable web app   Windows desktop app   Android app
  (any phone/browser,   (Tauri v2 installer,  (same web build in a
   iPhone included)      auto-updating)        native shell, later)
        |                    |                     |
        +--------------------+---------------------+
                             |
                 local store on the device (IndexedDB)
                 the app reads and writes here first
                             |
                     sync when online
                             |
                    Supabase (free plan)
          sign-in  ·  Postgres with row-level security  ·  file storage
```

The app is **local-first**: every screen reads from a store on the device, so
it is instant and works offline. A small sync layer pushes your changes to the
server and pulls your friends' changes down.

## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript 7 | One language across app, tests and tooling. |
| UI | React 19 + Vite 8 | Largest ecosystem; fast builds; first-class in Tauri. |
| Styling | Tailwind CSS v4 + CSS custom properties | Theming is the product; every colour is a variable a user can change. |
| Heatmap | Our own component (a CSS grid of cells) | Shape, ramp and per-chart styling are the core feature; libraries get in the way. |
| Navigation | Routes in the URL hash, no library | Works from any folder on a static host, in the desktop shell and offline. |
| Icons and fonts | Lucide icons; Inter and Space Grotesk bundled with the app | Nothing is fetched from another site, so the app is private and works offline. |
| Local store | IndexedDB via Dexie | Reactive queries, works in every shell, handles years of data. |
| Installable web app | vite-plugin-pwa (Workbox) | Manifest, icons and an offline cache that updates itself. |
| Backend | Supabase free plan | Sign-in, Postgres, per-row privacy rules and file storage in one free service. |
| Desktop shell | Tauri v2 | A few megabytes instead of 100+, low memory, and native Windows access for wallpaper mode later. |
| Phone | Installable web app first; Android shell second | The web app is the only free route to iPhone and the least friction on Android. |
| Tests | Vitest for logic and storage; SQL policy tests from M2; browser smoke tests later | Date and privacy bugs are the ones that matter. |
| Lint | Oxlint | The Vite template's default; fast. |
| CI and hosting | GitHub Actions, Pages and Releases | Free for a public repository. |

## 3. Repository layout

```
firechart/
  app/                    the web app
    src/
      domain/             dates, schedules, streaks, heat, consistency (pure, unit-tested)
      theme/              colour ramps and the custom-colour generator
      store/              local database, reads and writes, export and import, React hooks
      heatmap/            the grid component, its layout maths and cell descriptions
      app/                data provider and the shell (tab bar, sidebar, background)
      features/           today, chart (detail and form), charts (list), style, settings
      ui/                 buttons, segmented controls, swatches, dialog, icons
      router.ts           hash routes
      index.css           design tokens for dark, light and frosted-glass modes
    public/               icons (generated from favicon.svg by `npm run icons`)
    src-tauri/            desktop (and later Android) shell: planned, M4
  supabase/               schema, privacy rules and their tests: planned, M2
  tools/ramps.py          generates and checks the colour ramps
  docs/
  .github/workflows/      test, deploy-web; later: release, backup, keep-alive
```

Running it: `npm install`, then `npm run dev`, `npm test`, `npm run lint`,
`npm run typecheck` or `npm run build`, all inside `app/`.

## 4. Data model

Postgres tables. Every table has `updated_at`, set by the server on each write.

| Table | Columns that matter | Notes |
|---|---|---|
| `profiles` | `id` (the auth user), `username`, `display_name`, `style` (JSON: theme, background, card style, week start) | One row per person. |
| `circles` | `id`, `name`, `created_by` | A friend group. |
| `circle_members` | `circle_id`, `user_id`, `role` | Who is in which circle. |
| `invites` | `code`, `circle_id`, `expires_at`, `max_uses`, `uses` | Redeemed through one server function. |
| `charts` | `id`, `owner_id`, `name`, `icon`, `color`, `shape`, `heat_mode`, `visibility` (`friends` or `private`), `schedule` (JSON), `start_date`, `sort_order`, `archived_at`, `deleted_at` | One row per fire chart. |
| `entries` | `chart_id`, `day` (date), `state` (done, skipped), `value` (number, later), `logged_at` | Primary key is (`chart_id`, `day`): one row per chart per day. |

Background photos live in a private storage bucket at
`backgrounds/<user id>/...`, compressed on the device to roughly 300 KB first.

Size check: 10 people × 10 charts × 365 days × 10 years is about 365,000 small
rows, well under 1% of the 500 MB free database.

## 5. Privacy and security

Row-level security is on for every table. The rules, in plain words:

- **Your own rows**: full access.
- **Charts**: another user can read a chart only if it is `friends`-visible,
  not deleted, and they share a circle with its owner.
- **Entries**: readable exactly when their chart is readable.
- **Profiles and backgrounds**: readable by people who share a circle with you.
- **Circles and membership**: visible to members; joining happens only through
  the `redeem_invite(code)` server function.
- **Nobody without a circle can write anything.** Creating an account alone
  gives a stranger no way to store data or see anyone.
- Per-user caps (charts, entries per day) stop abuse if the invite leaks.

Supporting rules:

- The app ships only the Supabase URL and publishable key, which are designed
  to be public. The service key never leaves GitHub Actions secrets.
- Privacy rules have automated tests that act as four people: two members of
  one circle, an account with no invite, and a signed-out visitor. They try
  every forbidden read and write, once inside the database and once through
  the public API. They run on a throwaway stack, never on the real project.
- Until M3 adds friends, even members of the same circle cannot read each
  other's charts or ticks; only names are visible within a circle.
- Known limit: the database administrator can read stored rows. Vault mode
  (spec, section 6) closes that for private chart names.

## 6. Sync

- Every local write marks its row as **unsent**. Nothing else is needed to
  queue a change, and a change made offline is simply sent later.
- A sync **sends** unsent rows (charts first, then ticks, the photo, settings)
  as "insert, or update if it exists", then **pulls** every row the server
  stored since the last pull and merges it.
- **The newest change wins**, judged by the timestamp of the device that made
  it. The server enforces the same rule in a trigger, so a stale change that
  arrives late is ignored there too. A timestamp from a clock running far
  ahead is pulled back to the server's time so it cannot win for ever.
- A row with no unsent local change always takes the server's version.
- **Deleting a chart is final.** The row stays as a marker so the deletion
  reaches other devices, its ticks are removed everywhere, and a device that
  had not heard of the deletion cannot bring the chart back.
- Pulls are by the server's own clock (`synced_at`), re-reading the last 30
  seconds each time so a row that became visible just after the previous pull
  is not missed. Merging the same row twice is harmless.
- A sync runs shortly after any local change, when the app comes back into
  view or back online, and once a minute while open.
- **Signing in on a device that already has charts** asks whether to add them
  to the account or remove them. **Signing out** removes the account's data
  from the device after trying to send anything unsent.
- Settings sync as one row per person; the background photo is stored once per
  person and downloaded by other devices when its version changes.
- When friends arrive (M3): a chart that turns private stops appearing in a
  friend's pull, so each sync will also fetch the list of chart ids the person
  may see and drop local copies that are no longer on it.

The engine (`app/src/sync/engine.ts`) talks to the server through a small
interface, so it is tested twice: against an in-memory server in unit tests,
and against a real Supabase stack in CI.

## 7. Dates

- A day is the device's local calendar date, stored as `YYYY-MM-DD`. No UTC
  conversion anywhere.
- All date arithmetic, streaks, heat levels and consistency scores are pure
  functions in `app/src/domain/`, with tests for month ends, leap years,
  week-start settings, schedule gaps and daylight-saving changes.

## 8. How people get the app (all free)

| Device | First version | Install steps | Updates | Later |
|---|---|---|---|---|
| Windows PC | Tauri installer on GitHub Releases | Download, run; Windows shows a "protected your PC" notice once, choose More info, then Run anyway | Built-in updater | Microsoft Store listing (free for individuals) removes the notice |
| Android | Installable web app | Open the link in Chrome, tap Install | Automatic | Downloadable APK with an in-app update check, then a home-screen widget |
| iPhone | Installable web app | Open the link in Safari, Share, Add to Home Screen | Automatic | Nothing better is free; Apple charges 99 USD a year for native apps |
| Mac, Linux | Installable web app | Browser install | Automatic | Tauri builds if anyone wants them |

Notes:

- An installed web app has its own icon, opens full screen without browser
  bars and works offline. On a phone it is hard to tell from a store app.
- From 2027 Google plans to require developer registration for sideloaded
  Android apps worldwide. A free "limited distribution" account covers up to 20
  devices without ID, which is enough for a friend group.
- Unsigned Windows installers always show the SmartScreen notice. Paid
  certificates are the usual fix; we do not buy one.

## 9. Automation (GitHub Actions)

| Workflow | Trigger | Does |
|---|---|---|
| `test` | every push | Lint, type-check, unit tests, build. |
| `database` | changes to the schema, the sync code or the local store | Starts a throwaway Supabase stack, applies every migration, runs the privacy tests (pgTAP) and the end-to-end account and sync tests. |
| `deploy-web` | push to `main` | Builds and publishes the web app. |
| `release` | version tag (planned, M4) | Builds the Windows installer, attaches it to a GitHub Release, publishes updater metadata. |
| `backup` | weekly | Dumps the database, encrypts it and keeps it for 90 days. Idle until its two secrets are set. |
| `keep-alive` | daily | One tiny database request, so a quiet week does not pause the project. |

## 10. Keeping it alive for years

- **Pausing.** Supabase pauses free projects after about a week of low database
  activity and emails a warning first. Normal use by a few people prevents it;
  the keep-alive job is insurance. If it happens anyway, the owner clicks
  Resume in the dashboard; nothing is lost, and everyone's app keeps working
  offline in the meantime.
- **Backups.** The free plan has none, so the weekly job makes them. The dump
  is encrypted because a public repository's workflow artefacts can be
  downloaded by others. Each user can also export their own data.
- **Escape hatch.** The data is ordinary Postgres. If Supabase's free plan
  changes, a dump restores onto another Postgres host such as Neon.

## 11. What it costs

| Thing | Cost | Limit that applies | Our use |
|---|---|---|---|
| Supabase free plan | 0 | 500 MB database, 1 GB files, 2 projects | Under 1% |
| GitHub (public repo) | 0 | Unlimited Actions minutes, Pages, Releases up to 2 GB per file | Tiny |
| Tauri, React, Dexie, etc. | 0 | Open source | n/a |
| Domain name | 0 | We use the free `github.io` address | n/a |

Things that would cost money and are therefore out: an iPhone App Store app
(99 USD a year), a Windows code-signing certificate, a custom domain, a Google
Play listing (25 USD once).

## 12. Risks

| Risk | What we do about it |
|---|---|
| A privacy rule is wrong and a private chart leaks | Automated policy tests on every change; rules written once in SQL, not scattered in app code. |
| Sync bug loses a tick | The local store is the source of truth for your own data; outbox entries are kept until the server confirms; export is always available. |
| Supabase pauses or changes its free plan | Keep-alive, warning emails, weekly backups, Postgres portability. |
| The invite code leaks | Codes expire and have a use limit; the owner can remove members; sign-ups can be switched off in the dashboard once everyone has joined. |
| Someone forgets their password | The built-in mailer cannot email friends on the free plan, so the owner resets it from the dashboard. A free SMTP sender can be added later. |
| Tauri's Android support has rough edges | The web app already covers phones; if the Tauri Android shell disappoints, Capacitor wraps the same build. |
| Wallpaper mode relies on undocumented Windows behaviour | Phased: a static wallpaper image through the documented API first, live mode second, with fallback. |
