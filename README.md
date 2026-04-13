# Buddy — AI Chrome Extension Assistant

Your personal AI assistant living in Chrome's side panel. Manages your tabs,
triages Gmail, tracks social-media time, and chats via Claude.

Built with [Plasmo](https://docs.plasmo.com/) + React + TypeScript + Tailwind.

## Setup (5 minutes)

1. **Clone & install**
   ```bash
   git clone <this-repo> buddy-extension
   cd buddy-extension
   npm install
   ```

2. **(Optional) pre-fill your Claude API key**
   ```bash
   cp .env.example .env
   # edit .env and set PLASMO_PUBLIC_CLAUDE_KEY=sk-ant-...
   ```
   You can also paste your key into the Settings page at runtime — either works.
   Get a key at https://console.anthropic.com.

3. **Run in development**
   ```bash
   npm run dev
   ```
   Then load `build/chrome-mv3-dev` in `chrome://extensions` with Developer Mode on
   (or let Plasmo's auto-reload handle it).

4. **Set it up**
   - Click the Buddy icon in the Chrome toolbar → opens the side panel.
   - Click **Settings** (top-right of the panel) and paste your API key.
   - Open any page, then chat with Buddy in the side panel.

## Build for production

```bash
npm run build
# Outputs to build/chrome-mv3-prod/
```

Load that folder in `chrome://extensions`.

## Features

- **Chat** — full Claude chat with live context (tabs, Gmail, social time).
- **Tabs** — grouped by domain, stale tabs (>24h) flagged in amber, one-click close.
- **Gmail** — reads your inbox on `mail.google.com`, triages and drafts replies.
- **Social timer** — tracks time on Twitter/X, Reddit, LinkedIn, YouTube.
- **Break reminders** — notifies you every N minutes (configurable).

## Privacy

Everything stays on your machine. Your API key lives in `chrome.storage.local`.
The only network call is directly from your browser to `api.anthropic.com` when
you chat with Buddy.

## Known caveats

- **Gmail DOM selectors** (`contents/gmail.ts`) are brittle — Gmail changes its
  obfuscated class names. Update the selectors if the Gmail tab goes empty.
- **Lottie character** is currently a lightweight emoji placeholder. To swap in
  real Lottie animations, drop `idle.json` / `thinking.json` / `alert.json` into
  `assets/animations/` and wire them up in `components/Character.tsx`.
- **Side Panel API** requires Chrome 114+.

## Project layout

```
background.ts              service worker — alarms, tab tracking, message hub
sidepanel.tsx              side panel entry (Plasmo convention)
popup.tsx                  toolbar popup
options.tsx                settings page (chrome://extensions → Options)
contents/gmail.ts          Gmail DOM reader
contents/tracker.ts        Social-media time tracker
components/*               React UI
lib/*                      claude API, storage, tabs, prompts
types/index.ts             shared types
```
