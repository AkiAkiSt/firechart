# Firechart: working agreements

Firechart is a small, free habit tracker for one friend group. Each person ticks
their activities daily and every activity gets a GitHub-style heatmap (a "fire
chart"). Friends see each other's public charts; private charts stay private.

Read these before changing anything:

- `docs/PROGRESS.md`: where the project stands and what is next. Start here.
- `docs/SPEC.md`: what the product does.
- `docs/DESIGN.md`: how it looks (tokens, heatmap geometry, screens).
- `docs/ARCHITECTURE.md`: how it is built.
- `docs/DECISIONS.md`: why, and what would make us revisit a choice.
- `docs/ROADMAP.md`: milestones and their exit criteria.

## How to work on this project

- Work autonomously. Ask the owner only for decisions that are theirs to make
  (accounts they must create, money, privacy, taste). Batch questions.
- Commit and push as you go, in small commits with clear messages.
- Update `docs/PROGRESS.md` in the same commit as the work it describes. When a
  decision changes, add an entry to `docs/DECISIONS.md` instead of silently
  editing history.
- Keep the docs true. If the code and a doc disagree, fix one of them.

## Hard constraints

- **Everything stays free.** No paid services, no credit cards, no paid
  certificates. If something can only be done by paying, stop and tell the owner.
- **Privacy is a feature.** Private charts must be unreadable by other users,
  enforced on the server and covered by tests. Never weaken a privacy rule to
  make something easier.
- **No secrets in the repo.** Only the Supabase URL and publishable (anon) key
  may appear in client code. Service keys, signing keys and tokens live in
  GitHub Actions secrets or on the owner's machine.
- **No personal data in the repo.** The repo may become public. Do not write the
  owner's or friends' real names or email addresses into code, docs, fixtures
  or commit messages. Use made-up names in examples.
- **Simple beats clever.** The daily interaction is: open, tick, close. Do not
  add features, settings or dependencies the spec does not call for.

## Commands

All inside `app/`: `npm run dev`, `npm test`, `npm run lint`,
`npm run typecheck`, `npm run build`, `npm run icons`.

- Before every commit: lint, type-check and tests must pass.
- Check interface changes in a browser at phone width (375 px) and desktop
  width (1360 px) before calling them done.
- `FIRECHART_BASE` sets the path the build is served from (`/firechart/` on
  GitHub Pages). Set it from PowerShell or CI; Git Bash rewrites values that
  start with a slash into Windows paths.
- On the owner's PC, Node.js and GitHub CLI live in
  `%LOCALAPPDATA%\Programs\nodejs` and `%LOCALAPPDATA%\Programs\gh\bin`. A
  shell started before they were installed needs them added to PATH.

## Conventions

- One web codebase (TypeScript, React, Vite) shipped three ways: installable web
  app, Tauri desktop app, Android app.
- Dates are the user's local calendar dates stored as `YYYY-MM-DD` strings.
  Never convert a day through UTC.
- All date, streak and heat maths are pure functions with unit tests.
- Colours come from design tokens (CSS custom properties), never hard-coded in
  components.
