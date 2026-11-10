# Firechart

A tiny, free habit tracker for a group of friends. Pick what you want to be
disciplined about, tick it off each day, and watch each activity grow its own
"fire chart": a GitHub-style grid of days that gets hotter the longer your
streak runs. Friends see each other's public charts; private charts stay
private.

- Works on Windows and on phones, as an installed app.
- Costs nothing to run.
- Every person styles their own charts: colours, cell shape, background photo.

## Install it

Open **https://akiakist.github.io/firechart/** and add it to your device:

| Device | How |
|---|---|
| Android | In Chrome, open the menu (⋮) and choose **Add to Home screen**, then **Install**. |
| iPhone | In Safari, tap **Share**, then **Add to Home Screen**. |
| Windows, Mac | In Chrome or Edge, click the install icon at the right of the address bar. |

It then opens from its own icon, full screen, and works without a connection.
For now your charts live only on the device you entered them on; use
Settings → Export to keep a backup.

## Status

The first version works for one person on one device: charts, daily ticking,
streak heat, themes, a photo background, export and import, and installing it
as an offline app. Accounts, syncing between devices and friends come next.
See [docs/PROGRESS.md](docs/PROGRESS.md).

## Run it locally

Needs Node.js 22.12 or newer.

```bash
cd app
npm install
npm run dev
```

Then open the address it prints. Other commands, also inside `app/`:
`npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.

## Documents

| Document | What it covers |
|---|---|
| [docs/SPEC.md](docs/SPEC.md) | What the app does |
| [docs/DESIGN.md](docs/DESIGN.md) | How it looks |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How it is built and hosted for free |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Why each choice was made |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Milestones |
| [docs/RESEARCH.md](docs/RESEARCH.md) | Existing apps, free services and sources |
| [docs/PROGRESS.md](docs/PROGRESS.md) | Where things stand |
