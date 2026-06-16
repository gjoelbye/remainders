# Memento Mori

A time-aware lock-screen wallpaper for your phone. Visualize the current year as a dot grid, or your whole life in weeks — the "today" marker stays current because the image re-renders fresh on every request.

## Features

- **Year view** — the current year (months or days)
- **Life view** — your whole life in weeks (continuous grid, or year-blocks: square / 4×13)
- **Customizable** — colors & gradients, dot shapes (circle / square / rounded / diamond / ring), life expectancy, custom text
- **Stateless & private** — no accounts, no database; the config is encoded in the wallpaper URL
- **Always current** — re-renders fresh on every request

## Usage

1. Open the app (locally or your deployment).
2. Configure your wallpaper.
3. Copy the generated `/api/wallpaper?c=…` URL.
4. Set it as your lock screen with a daily auto-update shortcut — see [AUTOMATION.md](AUTOMATION.md).

Each configuration has its own unique URL. Re-configuring produces a new URL to copy.

## How it works

The editor keeps your settings in your browser (`localStorage`) and builds a URL like
`https://<your-app>/api/wallpaper?c=<encoded-config>`. That endpoint decodes the config and renders a PNG
at your device's native resolution with today's date — no server-side storage, so it deploys anywhere and
updates daily on its own.

## Run locally

Requires Node 18+.

```bash
npm install
npm run dev          # http://localhost:3000
```

No environment variables or database needed.

## Deploy to Vercel

Fully stateless (no filesystem writes, no env vars) — deploys with zero configuration:

1. Push this repo to GitHub.
2. In Vercel, **Import Project** and select the repo (Next.js is auto-detected).
3. Deploy, configure your wallpaper, and copy the generated URL to your phone.
