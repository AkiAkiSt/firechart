# Firechart: research notes

Collected 10 November 2026. Items marked **(re-checked)** were confirmed a
second time against the primary page. Items under "Not verified" at the end of
each section should be confirmed before anything depends on them.

## 1. What already exists

No free product covers all five needs: per-activity heatmaps, friends seeing
each other's charts, private charts, strong visual customization, and Windows
plus phone apps.

| Product | Platforms | Free tier | Heatmap | Friends and privacy | What is missing for us |
|---|---|---|---|---|---|
| [HabitKit](https://www.habitkit.app/) | iOS, Android | A few habits | Tile grid per habit, many colours | None, by design | No social, [no device sync](https://www.habitkit.app/faq) |
| [Loop](https://github.com/iSoron/uhabits) | Android | Free, open source | Calendar history, [habit score](https://github.com/iSoron/uhabits/discussions/689) | None | No sync, iOS or desktop |
| [Table Habit](https://github.com/FriesI23/mhabit) | Android, iOS, Windows, macOS, Linux | Free, Apache-2.0 | Heatmap, full colour picker | None | No sharing |
| [Streak](https://github.com/InlitX/streak) | Android, Windows, Linux | Free, GPLv3 | GitHub-style grid, photo backgrounds | None, fully offline | No sharing, no iOS |
| [HabitShare](https://habitshareapp.com/) | iOS, Android | Free | None | Per-habit choice of which friends see it; private by default | No heatmap, no Windows |
| [HabitRix](https://apps.apple.com/us/app/habit-share-habitrix/id6745905628) | Apple, Android | One shared habit | GitHub-style grid | Groups by link or code, leaderboard | No Windows or web; paid beyond one shared habit |
| [Habitica](https://en.wikipedia.org/wiki/Habitica) | Web, iOS, Android | Free core | None | Parties; missed tasks damage teammates | Guilt mechanic, no heatmap |
| [Squad](https://www.joinsquad.co/) | iOS, Android | Friend squads free | None | Small groups, check-ins, nudges | No heatmap, no Windows |
| [HabitSync](https://github.com/jofoerster/habitsync) | Self-hosted web app | Free, needs a server | Activity calendar | Shared habits, challenges | Needs an always-on server; little customization |

Open-source candidates to fork were considered and rejected: the ones with
heatmaps and desktop builds are local-only Flutter apps, and the social core
would be new work regardless.

**Name.** "FireCharts" is an existing paid crypto-trading heat-map product
([Material Indicators](https://materialindicators.com/)). No habit app uses the
name. No conflict for a private app; crowded search results if it ever went
public.

## 2. What keeps a small group going

Ideas worth copying:

- Charts private by default with the audience chosen per chart (HabitShare).
- Targets as "X times per Y days" (HabitKit).
- A skip state that does not break the streak, with a budget. In a step-goal
  experiment, a 7-day goal with 2 emergency skips beat plain 5-day and 7-day
  goals ([UCLA Anderson Review](https://anderson-review.ucla.edu/emergency-reserves/)).
- Streak freezes: Duolingo reports a small rise in daily use after allowing two
  ([Duolingo](https://blog.duolingo.com/how-duolingo-streak-builds-habit)).
- Compare on a normalized score, not raw counts (Loop's habit score).
- Visible comparison in small groups with weekly resets. A trial with
  six-person groups found attendance far higher with social comparison
  ([PubMed 27617191](https://pubmed.ncbi.nlm.nih.gov/27617191/)); in the STEP UP
  trial, clusters of three with weekly leaderboards were the only arm still
  ahead after the game ended ([PubMed 31498375](https://pubmed.ncbi.nlm.nih.gov/31498375/)).
- Allow back-filling but mark it, as BeReal shows how late a post was.

Pitfalls:

- Showing a broken streak reduces later engagement; being able to repair it
  softens the effect ([Silverman and Barasch 2023](https://doi.org/10.1093/jcr/ucac029)).
- Shared punishment breeds guilt; keep consequences individual.
- Support-only groups can drift downward together
  ([ScienceDaily](https://www.sciencedaily.com/releases/2016/10/161027122554.htm)).
- Very large gaps between people demotivate
  ([Feltz 2012](https://pubmed.ncbi.nlm.nih.gov/22920808/)).
- Missing sync is the standard complaint about HabitKit and Loop.

Not verified: exact free caps for HabitKit and Everyday (third-party pages);
privacy behaviour of HabitRix and HabitSync (undocumented); the often-quoted
"63% quit after one missed day" could not be traced to a paper and is not used.

## 3. Free backends

| Backend | Free limits that matter | Inactivity | Backups | Files | Sign-in | Recent changes |
|---|---|---|---|---|---|---|
| Supabase | 500 MB database, 2 active projects ([pricing](https://supabase.com/pricing)) | Paused after 7 days of low database activity | None | 1 GB, 50 MB per file | Password, emailed codes, OAuth | Email templates locked on new free projects since June 2026 |
| Firebase Spark | Firestore 1 GiB, 50k reads and 20k writes a day ([quotas](https://firebase.google.com/docs/firestore/quotas)) | None found | Paid plan only | None | Password with free reset emails | Storage moved to the paid plan |
| Cloudflare | Workers 100k requests a day, D1 5 GB ([pricing](https://developers.cloudflare.com/workers/platform/pricing/)) | None found | D1 time travel, 7 days | R2 probably needs a card | None built in | Durable Objects free since April 2025 |
| Convex | 1M calls a month, 0.5 GB ([limits](https://docs.convex.dev/production/state/limits)) | None found | Manual | 1 GB | Convex Auth (beta) | n/a |
| Neon | 1 GB per project, never paused, compute sleeps when idle ([pricing](https://neon.com/pricing)) | None | 6-hour restore window | 5 GB | Managed, with a shared mail sender | Sign-in, storage and functions launched September 2026 |
| InstantDB | Sign-ups closed, cloud ends August 2027 ([pricing](https://www.instantdb.com/pricing)) | n/a | n/a | n/a | n/a | Team joined OpenAI |
| Appwrite Cloud | 2 projects | Paused after 7 days, deleted after 90 more | Unknown | 2 GB | Full | Both rules new in 2026 |
| PocketBase | Self-host only | n/a | Do it yourself | Local disk | Built in | No free host remains |
| Turso | 5 GB | None found | 1-day restore | None | None, no row security | Being acquired by Supabase |

Facts the design leans on:

- **Supabase pausing (re-checked).** "Supabase pauses Free Plan projects that
  show low activity over a 7-day period." A few database requests a day is
  typically enough to prevent it. A warning email arrives about a week before,
  and a paused project can be resumed from the dashboard for up to one year
  ([docs](https://supabase.com/docs/guides/platform/free-project-pausing)).
  Scheduled keep-alive requests are not officially guaranteed to count.
- **Supabase email (re-checked).** The built-in mail service refuses addresses
  outside the project's team, is limited to 2 messages an hour and "is not
  meant for production use" ([docs](https://supabase.com/docs/guides/auth/auth-smtp)).
  Emailed sign-in codes for friends therefore need a separate mail service.
- **Firebase Storage (re-checked).** Since 3 February 2026 it requires the
  pay-as-you-go plan; free-plan projects get errors
  ([FAQ](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)).
- **Sign-in inside packaged apps.** Email plus password is the only method that
  behaves identically in a browser, a Tauri window and an Android shell. Google
  rejects embedded web views for OAuth
  ([Google](https://developers.google.com/identity/protocols/oauth2/native-app)),
  and desktop deep links need extra plumbing
  ([Tauri](https://v2.tauri.app/plugin/deep-linking/)).
- **Sync options.** A hand-written outbox fits one-row-per-day data. PowerSync's
  free instances are deprovisioned after 7 idle days
  ([docs](https://docs.powersync.com/resources/usage-and-billing)).

Not verified: whether Supabase's "before user created" hook is available on the
free plan (two official pages disagree), so invite checks use a database
function instead; whether a personal Gmail account works as a free mail sender
for Supabase; whether any of these services needs a card to sign up (official
pages do not say; Supabase and Firebase are not known to).

## 4. Packaging and distribution

- **Tauri** 2.12.5 is the current stable release
  ([crates.io](https://crates.io/crates/tauri)). Desktop is solid. Mobile is
  second-tier: the updater does not cover Android or iOS, the GitHub Action's
  mobile support is experimental, and scheduled Android notifications are lost
  after a reboot ([issue](https://github.com/tauri-apps/plugins-workspace/issues/3550)).
  Updates on Windows are free: a self-generated signing key and GitHub Releases
  as the source ([docs](https://v2.tauri.app/plugin/updater/)).
- **Windows.** An unsigned installer triggers SmartScreen's "Windows protected
  your PC"; the user picks More info, then Run anyway
  ([Microsoft](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation)).
  Microsoft Store registration is free for individuals, and Store-hosted MSIX
  packages are signed and updated by the Store
  ([docs](https://learn.microsoft.com/en-us/windows/apps/publish/partner-center/open-a-developer-account)).
- **Android sideloading (re-checked).** Developer verification is enforced
  since 30 September 2026 only for certain stores in four countries; directly
  sideloaded apps are not affected yet, with a global rollout planned for 2027.
  A free limited-distribution account allows sharing with up to 20 devices
  without ID
  ([FAQ](https://developer.android.com/developer-verification/guides/faq)).
  Samsung phones may need Auto Blocker switched off to install an APK.
- **Android web install.** Chrome installs a web app as a Google-signed
  package, so there are no sideloading prompts, and it updates itself
  ([web.dev](https://web.dev/learn/pwa/installation)).
- **iPhone.** A native app needs Apple's 99 USD a year programme. Free
  sideloading expires every 7 days. An installed web app gets its own icon,
  full-screen display, offline storage and push notifications
  ([WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)).
- **Web app limits.** No scheduled local notifications without a push server,
  and no home-screen widgets.
- **GitHub free plan (re-checked).** Pages is included for public repositories
  only. Private repositories get 12 USD of Actions compute a month; public ones
  are free. Release files can be up to 2 GiB each, but downloading from a
  private repository needs access
  ([plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans)).
  Scheduled workflows in public repositories are disabled after 60 days without
  repository activity.
- **Private-source alternative.** Cloudflare Pages hosts static sites free with
  direct upload and a 25 MiB per-file limit
  ([limits](https://developers.cloudflare.com/pages/platform/limits/)).

Not verified: whether installers downloaded by the Tauri updater trigger
SmartScreen again; how well Microsoft's tool for packaging a Tauri app as MSIX
works on Windows 10.

## 5. Wallpaper mode

- **How live wallpapers work on Windows.** Apps send an undocumented message to
  the desktop's Progman window and attach their own window behind the icons.
  Windows 11 24H2 changed the window layout and broke this for a year until
  apps adapted ([Lively issue](https://github.com/lively-community/lively/issues/2074),
  [Microsoft release health](https://learn.microsoft.com/en-us/windows/release-health/resolved-issues-windows-11-24h2)).
- **Tauri can do it.** [tauri-plugin-wallpaper](https://github.com/meslzy/tauri-plugin-wallpaper)
  (v4.1.0, October 2026) attaches a Tauri window per monitor and re-attaches
  after Explorer restarts. It has one maintainer; its readme suggests copying
  the logic into the app.
- **Zero-code route.** [Lively Wallpaper](https://github.com/rocksdanister/lively)
  (free) shows any URL or local page as wallpaper using the system's Edge
  engine. By default it does not keep sign-ins between restarts, so the page it
  shows must not need a login. Wallpaper Engine runs local web projects.
- **Documented route.** Windows has an official API for setting a wallpaper
  image per monitor
  ([IDesktopWallpaper](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nf-shobjidl_core-idesktopwallpaper-setwallpaper)).
  Rendering the charts to an image and setting it on each tick is robust and
  costs nothing while idle.
- **Phones.** An Android home-screen widget must be native code that draws the
  grid as a bitmap, fed by the app; updates are immediate while the app is open
  and limited to about every 30 minutes otherwise. iPhone widgets need a native
  app and the paid programme.
- **Plan.** A read-only wall view first, then a static wallpaper image, then
  live mode with fallback.

Not verified: memory cost of a live web view wallpaper; behaviour of a Tauri
window under the Windows 11 24H2 layout (this PC runs Windows 10).

## 6. Design references

See `docs/DESIGN.md`, section 1.
