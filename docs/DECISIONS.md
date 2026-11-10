# Firechart: decision log

Each entry records what was decided, what else was considered, and what would
make us revisit it. New decisions are appended; old ones are superseded, not
rewritten. Facts cited here are sourced in `docs/RESEARCH.md`.

---

## D1. Build it rather than adopt an existing app

**Date:** 2026-11-10 · **Status:** accepted

No existing free product combines per-activity heatmaps, friends seeing each
other's charts, private charts, strong visual customization, and Windows plus
phone apps. The closest:

- HabitRix: heatmaps and groups, but no Windows or web client and only one
  shared habit free.
- HabitShare: free with per-habit privacy, but no heatmaps and no Windows.
- Table Habit and Streak: free, open source, Windows and phone, heatmaps (Streak
  even has photo backgrounds), but no accounts or sharing at all.

Forking was considered. The open-source candidates are local-only Flutter apps;
the social core (accounts, sync, privacy) is most of this product and would be
new work either way.

**Revisit if:** an open-source project with real multi-user sharing and a
heatmap-first interface appears.

---

## D2. One web codebase, shipped three ways

**Date:** 2026-11-10 · **Status:** accepted

The app is a TypeScript web app that ships as an installable web app, a Tauri
desktop app and, later, an Android app wrapping the same build.

Alternatives:

- **Flutter**: one codebase for every platform with the most mature widget and
  notification plugins, but a rewrite in Dart, heavier web output, and no
  iPhone distribution without paying Apple anyway.
- **React Native / Expo**: good on phones, weak on Windows desktop.
- **Native apps per platform**: three codebases for a five-person app.

The web route is the only one that reaches iPhones for free, and it lets the
whole app be developed and tested in a browser.

**Revisit if:** home-screen widgets become the main way people use the app; at
that point the phone shell needs real native code.

---

## D3. React, Vite, Tailwind v4

**Date:** 2026-11-10 · **Status:** accepted

React has the largest ecosystem and first-class Tauri support. Svelte would
produce a slightly smaller app, which does not matter at this size. Styling is
Tailwind v4 on top of CSS custom properties, because user-chosen colours must
flow into every component as variables.

**Revisit if:** never, short of a rewrite.

---

## D4. Supabase free plan as the backend

**Date:** 2026-11-10 · **Status:** accepted, pending the owner creating the
account

Needs: sign-in, a small relational dataset, per-row privacy enforced on the
server, one small image per user, no cost, no card.

| Option | Verdict |
|---|---|
| **Supabase** | Chosen. Postgres with row-level security matches "private charts are unreadable" exactly; sign-in and file storage included; data is portable. Weaknesses: pauses after a quiet week, no backups, built-in email cannot reach friends. All three have mitigations (`docs/ARCHITECTURE.md`, section 10). |
| **Firebase (Spark)** | Runner-up. Never pauses, free password-reset emails, built-in offline cache. But file storage now requires a card, the data model is documents rather than tables, and leaving later means rewriting the data layer. |
| **Neon** | Postgres that never pauses, with sign-in and storage added in September 2026. Too new to build on, but it is the escape hatch: our SQL moves there unchanged. |
| **Cloudflare (Workers + D1)** | No pausing and generous limits, but no sign-in service; we would write our own authentication, which is where security bugs come from. |
| **Convex** | Works, but privacy lives in application code rather than the database, and there is no offline support. |
| **InstantDB, Appwrite, PocketBase, Turso** | InstantDB's cloud is shutting down; Appwrite pauses too and deletes after 90 days; PocketBase has no free host left; Turso has no sign-in or row security. |

**Revisit if:** pausing becomes a real nuisance in practice, or Supabase
tightens the free plan again. First fallback is Neon (same SQL), second is
Firebase.

---

## D5. Email and password sign-in, invite codes for circles

**Date:** 2026-11-10 · **Status:** accepted

Email plus password works identically in a browser, a Tauri window and an
Android shell: plain HTTPS calls, no redirects, and with confirmation switched
off it needs no email delivery at all.

Alternatives:

- **Emailed codes or magic links**: Supabase's built-in mailer only delivers to
  the project's own team and is limited to two messages an hour, so friends
  could not sign in without us setting up a separate mail service.
- **Sign in with Google**: Google rejects embedded web views, and returning
  from a browser to a desktop or Android app needs deep links, which is the
  most fragile part of packaged apps.

Joining a circle goes through a single server function that checks an invite
code. Accounts that have not joined a circle cannot read or write anything.

**Cost of this choice:** no self-service password reset. The owner resets
passwords from the dashboard.

**Revisit if:** a free mail sender that needs no domain is confirmed to work
(a personal Gmail account as SMTP is the likely candidate), which would enable
reset emails.

---

## D6. Local-first with a hand-written sync

**Date:** 2026-11-10 · **Status:** accepted

The data is one row per chart per day, so two devices can only disagree about
the same day of the same chart, and "last change wins" is correct. A small
outbox plus periodic pulls is enough and has no vendor risk.

Alternatives: RxDB's Supabase replication (adds a framework for a simple
problem), PowerSync (free tier is deprovisioned after seven idle days, a second
pause risk), ElectricSQL and Zero (extra services to host), InstantDB (shutting
down).

**Revisit if:** the sync layer grows past a few hundred lines or produces a
data-loss bug we cannot pin down.

---

## D7. Our own heatmap component

**Date:** 2026-11-10 · **Status:** accepted

A year is 371 rectangles. Writing the grid ourselves gives full control over
cell shape, ramps, off-days, today's outline and per-chart styling, which is
the product. Existing libraries (cal-heatmap, react-activity-calendar and
others) cover the GitHub look but resist the customization we need.

**Revisit if:** never; it is small.

---

## D8. Tauri for the desktop; phones start as an installable web app

**Date:** 2026-11-10 · **Status:** accepted. The owner confirmed the group
uses both Android phones and iPhones, so the installable web app is the first
phone version for everyone

- **Windows**: Tauri v2. Installers are a few megabytes (Electron's are over a
  hundred), memory use is far lower, which matters for an always-running
  wallpaper mode, and Rust gives direct access to the Windows APIs that mode
  needs.
- **Phones**: the installable web app first. On Android, Chrome installs it as
  a real app with no warnings and silent updates; on iPhone it is the only free
  option. A downloadable Android APK comes second, for people who want a file
  and for the home-screen widget later. Tauri's Android target is the first
  choice for that shell; Capacitor is the fallback because its notification
  and widget plugins are more mature.

**Revisit if:** the owner wants the APK before the web app, or Tauri's Android
notification bug is still open when we get there.

---

## D9. Repository private now, public at first release

**Date:** 2026-11-10 · **Status:** accepted by the owner on 2026-11-10; the
repository went public the same day, when milestone 1 was ready to install

GitHub's free plan gives Pages hosting and unlimited build minutes only to
public repositories, and release downloads from a private repository need a
GitHub account with access. A public repository is therefore the simplest free
way to host the web app and the installers. Nothing secret lives in the
repository either way.

The alternative, had the owner preferred private source: host the web app on
Cloudflare Pages and publish installers to a second, public "releases"
repository. It works, with one more account and a monthly build-minute budget.

**Revisit if:** the owner changes their mind before the first release.

---

## D10. Streak heat as the default look

**Date:** 2026-11-10 · **Status:** accepted, pending the owner's reaction to
the mockup

A yes/no chart has only two colours, which looks flat next to a GitHub graph.
Making brightness follow the length of the run gives four levels, rewards
consistency visually, and makes the name literal. "Flat" remains available per
chart.

**Revisit if:** people find a cool cell after a broken streak discouraging;
research on streaks suggests making breaks easy to repair, which late ticking
already does.

---

## D11. Private charts: server rules now, on-device encryption later

**Date:** 2026-11-10 · **Status:** accepted

Row-level security makes private charts unreadable to every other user. It does
not hide them from the database administrator. Encrypting private chart names
on the device ("Vault mode") would, at the cost of key handling and a recovery
phrase. Version 1 ships the server rules and states the caveat plainly.

**Revisit if:** anyone in the group wants the stronger guarantee.

---

## D12. The name

**Date:** 2026-11-10 · **Status:** accepted for now

"Firechart" is the working name. A paid crypto-trading heat-map product called
FireCharts exists; for a private friends app there is no conflict, but search
results would be crowded if this ever went public.

**Revisit if:** the app is ever offered to people outside the group.

---

## D13. Fair comparison by consistency, with skips planned

**Date:** 2026-11-10 · **Status:** accepted

People track different things, so the scoreboard ranks by the share of planned
days done, not by tick counts. Later additions follow what the evidence
supports: a limited budget of skip days, weekly rather than daily targets, and
weekly scoreboard periods so nobody is permanently behind. Shared punishments
are excluded.

**Revisit if:** the group wants a different scoring rule; it is one function.

---

## D14. Today and yesterday stay open

**Date:** 2026-11-10 · **Status:** accepted

A streak is not broken by today or yesterday being unticked; a day counts as
missed once it is two days old. The spec originally gave only today this grace.
Building the catch-up prompt showed the problem: a goal such as "screen time
under 1.5 h" can only be logged the next morning, so with one day of grace its
streak would read zero every morning until logged. The chart itself is not
affected: an unticked day is drawn empty either way.

The cost is that a streak can read one day optimistic for up to a day.

**Revisit if:** friends feel the number flatters people who simply forgot.

---

## D15. A photo background means dark frosted cards in both themes

**Date:** 2026-11-10 · **Status:** accepted

Heat colours need a predictable surface behind them. Over an arbitrary photo
the cards become dark glass (72% opaque with blur) and the charts use the dark
ramps, whichever theme is selected. A light glass variant would need its own
contrast checks against every possible photo.

**Revisit if:** someone wants a light look over a photo; it would need a
stronger scrim.

---

## D16. Routes in the URL hash; no router library

**Date:** 2026-11-10 · **Status:** accepted

Seven screens do not need a routing library. Routes live in the hash
(`#/chart/<id>`), which works from any folder on a static host, inside the
desktop shell and offline, with no server configuration.

**Revisit if:** screens need nested layouts or data loading tied to routes.

---

## D17. The newest change wins, by the device's clock

**Date:** 2026-11-10 · **Status:** accepted

Each change carries the timestamp of the device that made it, and both the app
and a database trigger keep whichever is newer. Ordering by arrival at the
server instead would be simpler, but a phone that was offline for a day would
then overwrite newer changes made elsewhere the moment it reconnected.

A wrong device clock is the risk. Two guards: the server pulls back any
timestamp more than five minutes ahead of its own time, and a row with no
unsent local change always takes the server's version.

**Revisit if:** two people ever edit the same row (shared challenges would do
that); it would need a proper merge.

---

## D18. Accounts are optional

**Date:** 2026-11-10 · **Status:** accepted

The app stays usable with no account, so anyone can try it and nothing breaks
offline. Signing in claims the device for an account. A device that already
holds charts asks whether to add them or remove them; signing out removes the
account's data from the device.

**Revisit if:** the choice at sign-in confuses people.

---

## D19. Tests that need accounts never touch the real project

**Date:** 2026-11-10 · **Status:** accepted

Privacy and sync are tested on a throwaway Supabase stack that CI starts for
each run: once inside the database with pgTAP, once from outside through the
public API with real sign-ups. The real project only ever receives migrations
that passed both. The first owner invite was created with one SQL statement
rather than by special-casing the first account to sign up.

Supabase's security advisor reports two functions as callable by signed-in
users with elevated rights. That is their purpose: `redeem_invite` and
`delete_my_account` check who is calling and act only on that person.

**Revisit if:** a problem appears that only the real project can reproduce.

---

## D20. Backups are encrypted with a passphrase and kept as workflow artefacts

**Date:** 2026-11-10 · **Status:** accepted; waiting for the owner to set the secrets

The weekly job dumps accounts, charts and ticks, encrypts the file with a
passphrase only the owner knows, and stores it as a workflow artefact for 90
days. Artefacts of a public repository can be downloaded by any signed-in
GitHub user, which is why the file is encrypted before it leaves the runner.
Background photos are left out: every device keeps its own copy.

**Revisit if:** 90 days of weekly copies is not enough history, or a restore
rehearsal fails.

