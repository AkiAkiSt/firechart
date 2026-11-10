# Firechart: roadmap

Milestones are in build order. Each ends in something the owner can use, and
each lists what is needed from the owner. Live status is in `docs/PROGRESS.md`.

## M0. Spec and design

- [x] Research: existing apps, design references, free hosting, packaging,
      wallpaper feasibility
- [x] Product spec, architecture, decisions, roadmap
- [x] Design mockup of every main screen
- [x] GitHub repository created and pushed (private)
- [ ] Owner review of the spec and mockup

**From the owner:** reactions to the mockup and answers to the open questions
in the spec.

## M1. The app, for one person, on one device

Everything except accounts and friends, stored on the device.

- [ ] Project scaffold: Vite, React, TypeScript, Tailwind, tests, CI
- [ ] Design tokens and the eight colour ramps; custom-colour ramp generator
- [ ] Heatmap component: 20-week, half-year and 53-week layouts; shapes; today
      outline; off-days; tooltips; legend
- [ ] Date, streak, heat and consistency functions with unit tests
- [ ] Charts: create, edit, reorder, archive, delete
- [ ] Today screen with ticking and yesterday catch-up
- [ ] Chart detail: numbers, year view, last-7-days editing
- [ ] Style screen: colour, shape, heat mode, theme, background photo
- [ ] Phone and desktop layouts
- [ ] Local storage, export and import
- [ ] Installable web app (manifest, offline support) published to a link

**Done when:** the owner installs it on their phone and PC from a link and
tracks their own charts for a few days.

**From the owner:** feedback on the look once it is real. The repository goes
public at this point (already agreed), which is what makes the free link
possible.

## M2. Accounts and sync

- [ ] Supabase project created; schema and privacy rules as migrations
- [ ] Privacy tests with three users, run automatically
- [ ] Sign up, sign in, sign out
- [ ] Sync engine: outbox, pull, last-change-wins, soft deletes
- [ ] Background photo upload
- [ ] Keep-alive and encrypted weekly backup jobs

**Done when:** a tick made on the phone appears on the PC, and the app still
works with the network off.

**From the owner:** create a free Supabase account and project (about two
minutes; accounts cannot be created for you), then approve the command-line
tool's sign-in once.

## M3. Friends

- [ ] Create a circle; invite by link or code; join; leave; remove a member
- [ ] Friends screen: scoreboard by period, friend cards
- [ ] Friend profile in their style over their background
- [ ] Public and private charts enforced end to end; dropping charts that turn
      private
- [ ] First-run flow for an invited friend

**Done when:** the owner and at least one friend use it together for a week
and private charts are verified invisible.

**From the owner:** invite the friends.

## M4. The Windows app

- [ ] Tauri shell around the same build
- [ ] Installer and automatic updates from GitHub Releases
- [ ] Release workflow on a version tag
- [ ] Start with Windows; tray icon

**Done when:** the owner installs from a downloaded file and receives an update
without reinstalling.

**From the owner:** permission to install the Rust toolchain on the PC (only
needed to test the desktop app locally; release builds run on GitHub).

## M5. The phone app, beyond the web install

The group uses both Android phones and iPhones. Everyone already has the
installed web app from M1; this milestone adds what only a native shell can do
on Android.

- [ ] Android APK from the same build, with an in-app update check
- [ ] Daily reminder notification
- [ ] Android home-screen widget showing a chart
- [ ] iPhone: polish the installed web app; reminders if a free route exists

**Done when:** an Android user installs from a downloaded file and gets a daily
reminder.

**From the owner:** before Google's 2027 sideloading rules reach your country,
open a free limited-distribution developer account.

## M6. Fairness and delight

- [ ] Skip and rest days with a monthly budget
- [ ] Weekly targets ("4 times a week")
- [ ] Amount charts with heat by amount
- [ ] Late-tick marker
- [ ] Cheers and milestone badges
- [ ] Share a chart as an image

## M7. Wallpaper mode (Windows)

- [ ] Phase 0: a read-only "wall" view of your charts, usable today in Lively
      Wallpaper (free) or Wallpaper Engine as a web wallpaper
- [ ] Phase 1: the app renders your charts onto an image and sets it as the
      desktop wallpaper through the documented Windows API, refreshed on each
      tick and at midnight
- [ ] Phase 2: live wallpaper behind the desktop icons, with pause during
      full-screen apps and fallback to Phase 1

## Later, if wanted

Vault mode, several circles, shared challenges, a Microsoft Store listing, Mac
and Linux desktop builds.
