# Buddy — AI Chrome Extension Personal Assistant
## Complete MVP Specification & Build Guide

---

## Project Overview

**Buddy** is a Chrome extension that acts as a personal assistant living in your browser's side panel. It watches your tabs, reads your Gmail, tracks your time on social media, and chats with you using Claude AI. The goal is a single GitHub repo that anyone can clone, add their Claude API key, and have a working AI assistant in under 5 minutes.

**Core Philosophy for MVP:** No backend server. No accounts. Everything runs in the extension using the user's own Claude API key stored locally. Ship fast, keep it simple.

---

## MVP Feature Scope

### ✅ IN — Build These First

1. **Side Panel UI with Animated Character** — Buddy lives in Chrome's side panel. Has idle/thinking/alert animation states.
2. **Tab Intelligence** — List all open tabs, group by domain, flag tabs open for more than 1 day, one-click close stale tabs.
3. **Gmail Triage** — Content script reads Gmail inbox and surfaces unanswered threads, showing who's waiting on a reply.
4. **Current Page Summarizer** — Summarize any webpage you're on, on demand.
5. **Social Media Time Tracker** — Track time spent on Twitter/X, Reddit, LinkedIn, YouTube. Show daily totals and nudge after a threshold.
6. **Break Reminder** — Alert user every 60 minutes of continuous browsing (configurable).
7. **Chat Interface** — Full chat with Claude in the side panel. Claude has context of your current tab, open tab count, and Gmail summary.
8. **Settings Page** — Claude API key input, social media thresholds, break reminder interval, character skin selection.

### ❌ OUT — Phase 2 Later

- Google Calendar API integration
- Slack/Teams integration
- Cross-device sync
- User accounts or backend
- Meeting briefings
- Reading queue / bookmarking system
- On-device LLM (no internet mode)

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Extension Framework | **Plasmo** | React support, hot reload, handles manifest boilerplate |
| UI | **React + TypeScript** | Component model, type safety |
| Styling | **Tailwind CSS** | Fast to iterate, utility classes |
| Character Animation | **Lottie React** | Simple JSON animations, free assets on LottieFiles |
| AI | **Claude API (claude-sonnet-4-5)** | Best for reasoning + summarization, cheap per call |
| Storage | **chrome.storage.local** | Local, private, no backend needed |
| Gmail Reading | **Content Script on mail.google.com** | Direct DOM access, no OAuth needed for reading |
| Build / Package | **Plasmo CLI** | Outputs production .zip ready for Chrome |

---

## Project File Structure

```
buddy-extension/
├── package.json
├── .env.example                  # PLASMO_PUBLIC_CLAUDE_KEY=your_key_here
├── README.md                     # Setup instructions for GitHub users
│
├── assets/
│   └── animations/
│       ├── idle.json             # Lottie: character idle loop
│       ├── thinking.json         # Lottie: character thinking (during AI calls)
│       └── alert.json            # Lottie: character alert/nudge
│
├── contents/                     # Content scripts (injected into web pages)
│   ├── gmail.ts                  # Reads Gmail inbox DOM
│   └── tracker.ts                # Social media time tracker
│
├── background/
│   └── index.ts                  # Service worker: alarms, tab tracking, message hub
│
├── sidepanel/
│   ├── index.tsx                 # Side panel entry point
│   └── index.html
│
├── popup/
│   ├── index.tsx                 # Small popup (just a "Open Buddy" button)
│   └── index.html
│
├── tabs/
│   └── settings.tsx              # Full settings page (opened as a tab)
│
├── components/
│   ├── Character.tsx             # Lottie character component with state switching
│   ├── ChatInterface.tsx         # Claude chat UI
│   ├── TabList.tsx               # Tab overview with grouping + stale flagging
│   ├── GmailTriage.tsx           # Gmail threads needing reply
│   ├── SocialTimer.tsx           # Time tracker display
│   └── BreakBanner.tsx           # Break reminder overlay
│
├── lib/
│   ├── claude.ts                 # Claude API client (fetch wrapper)
│   ├── storage.ts                # chrome.storage helpers (get/set with types)
│   ├── tabs.ts                   # Tab query/grouping logic
│   └── prompts.ts                # All Claude system prompts in one place
│
└── types/
    └── index.ts                  # Shared TypeScript interfaces
```

---

## Chrome Extension Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CHROME BROWSER                        │
│                                                          │
│  ┌──────────────┐    ┌──────────────────────────────┐   │
│  │   POPUP      │    │        SIDE PANEL             │   │
│  │  (icon btn)  │───▶│  Character + Chat + Tabs      │   │
│  └──────────────┘    │  Gmail Triage + Social Timer  │   │
│                      └──────────────────────────────┘   │
│                                   │                      │
│  ┌────────────────────────────────▼─────────────────┐   │
│  │              BACKGROUND SERVICE WORKER            │   │
│  │  - chrome.alarms (break reminders, tab checks)   │   │
│  │  - Message hub between content scripts & panel   │   │
│  │  - Tab tracking state                            │   │
│  └────────────────────────────────┬─────────────────┘   │
│                                   │                      │
│  ┌────────────────────────────────▼─────────────────┐   │
│  │              CONTENT SCRIPTS                      │   │
│  │  gmail.ts → injected on mail.google.com          │   │
│  │  tracker.ts → injected on twitter/reddit/etc     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
                           │
                    Claude API (HTTPS)
```

**Message Flow Example (Gmail Triage):**
1. User opens Gmail → `gmail.ts` content script activates
2. Script parses inbox DOM → finds unanswered threads
3. Sends message to background worker via `chrome.runtime.sendMessage`
4. Background stores result in `chrome.storage.local`
5. Side panel reads from storage and renders `GmailTriage` component

---

## Step-by-Step Build Order

Follow this exact sequence. Each step produces something you can see and test.

### Step 1 — Scaffold the Project
```bash
npm create plasmo buddy-extension
cd buddy-extension
npm install
npm install lottie-react @anthropic-ai/sdk tailwindcss
npx tailwindcss init
```
Set up `tailwind.config.js` and import Tailwind in your global CSS. Confirm `npm run dev` opens a working Chrome extension with a blank side panel.

### Step 2 — Settings Page + API Key Storage
Build `tabs/settings.tsx` first. It needs:
- A text input for Claude API key (saved to `chrome.storage.local` with key `"claudeApiKey"`)
- A toggle for break reminders + interval input (default 60 min)
- Social media daily limit inputs per site (default 20 min)
- A save button that shows a success toast

Build `lib/storage.ts` with typed helpers:
```typescript
export async function getApiKey(): Promise<string | null> {
  const result = await chrome.storage.local.get("claudeApiKey")
  return result.claudeApiKey ?? null
}

export async function saveApiKey(key: string): Promise<void> {
  await chrome.storage.local.set({ claudeApiKey: key })
}
// Follow same pattern for all settings
```

**Test:** Open extension settings, save an API key, refresh, confirm it persists.

### Step 3 — Claude API Client
Build `lib/claude.ts`:
```typescript
export interface Message {
  role: "user" | "assistant"
  content: string
}

export async function askClaude(
  messages: Message[],
  systemPrompt: string,
  apiKey: string
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  })
  const data = await response.json()
  return data.content[0].text
}
```

**Test:** Call `askClaude` from the browser console with a hardcoded key and confirm you get a response.

### Step 4 — Character Component
Build `components/Character.tsx`:
```typescript
type CharacterState = "idle" | "thinking" | "alert"

export function Character({ state }: { state: CharacterState }) {
  const animations = {
    idle: idleJson,      // import from assets/animations/
    thinking: thinkingJson,
    alert: alertJson,
  }
  return (
    <Lottie
      animationData={animations[state]}
      loop={true}
      style={{ width: 120, height: 120 }}
    />
  )
}
```

For Lottie animations: go to [lottiefiles.com](https://lottiefiles.com), search "cute character", download 3 free JSON files for idle/thinking/alert states. Rename and place in `assets/animations/`.

**Test:** Render `<Character state="idle" />` in the side panel and confirm it animates.

### Step 5 — Tab Intelligence
Build `lib/tabs.ts`:
```typescript
export async function getAllTabs() {
  return await chrome.tabs.query({})
}

export function groupTabsByDomain(tabs: chrome.tabs.Tab[]) {
  return tabs.reduce((groups, tab) => {
    const domain = new URL(tab.url ?? "").hostname
    if (!groups[domain]) groups[domain] = []
    groups[domain].push(tab)
    return groups
  }, {} as Record<string, chrome.tabs.Tab[]>)
}

export function getStaleTabs(tabs: chrome.tabs.Tab[], hoursThreshold = 24) {
  const threshold = Date.now() - hoursThreshold * 60 * 60 * 1000
  // Note: chrome.tabs doesn't give open time natively.
  // Track this in background service worker using chrome.tabs.onCreated
  // Store { tabId: timestamp } in chrome.storage.local
}
```

Build `components/TabList.tsx` that displays grouped tabs with a "close" button per tab and highlights stale ones in amber.

**Test:** Open 10+ tabs across different sites. Open the side panel and confirm they appear grouped.

### Step 6 — Gmail Content Script
Build `contents/gmail.ts`. Plasmo automatically injects this on matching URLs.

```typescript
// contents/gmail.ts
export const config = {
  matches: ["https://mail.google.com/*"],
}

function parseInbox() {
  // Gmail DOM selectors (verify these are current):
  const threads = document.querySelectorAll("tr.zA")
  const results = []

  threads.forEach((thread) => {
    const sender = thread.querySelector(".yP, .zF")?.getAttribute("name") ?? "Unknown"
    const subject = thread.querySelector(".y6 span")?.textContent ?? ""
    const snippet = thread.querySelector(".y2")?.textContent ?? ""
    const isUnread = thread.classList.contains("zE")

    results.push({ sender, subject, snippet, isUnread })
  })

  return results.slice(0, 20) // Top 20 threads
}

// Send parsed data to background on load and on DOM changes
chrome.runtime.sendMessage({ type: "GMAIL_UPDATE", data: parseInbox() })

// Watch for inbox changes
const observer = new MutationObserver(() => {
  chrome.runtime.sendMessage({ type: "GMAIL_UPDATE", data: parseInbox() })
})
observer.observe(document.body, { childList: true, subtree: true })
```

> **Note on Gmail DOM selectors:** Gmail updates its DOM classes periodically. The selectors above are a starting point — inspect Gmail in DevTools and update the `querySelectorAll` selectors to match the current structure when building.

In `background/index.ts`, listen for this message and store in `chrome.storage.local`:
```typescript
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "GMAIL_UPDATE") {
    chrome.storage.local.set({ gmailThreads: message.data })
  }
})
```

Build `components/GmailTriage.tsx` to read `gmailThreads` from storage and display them with a "Claude, draft a reply" button per thread.

### Step 7 — Social Media Time Tracker
Build `contents/tracker.ts`. Apply it to all sites, filter by hostname in the logic:

```typescript
export const config = {
  matches: ["https://*.twitter.com/*", "https://x.com/*",
            "https://*.reddit.com/*", "https://*.linkedin.com/*",
            "https://*.youtube.com/*"],
}

// Track time spent on this tab using Page Visibility API
let startTime = Date.now()
let totalSeconds = 0

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    totalSeconds += (Date.now() - startTime) / 1000
    chrome.runtime.sendMessage({
      type: "TIME_UPDATE",
      domain: location.hostname,
      seconds: totalSeconds,
    })
  } else {
    startTime = Date.now()
  }
})
```

In background, accumulate per-domain seconds in storage, keyed by date (reset daily).

Build `components/SocialTimer.tsx` showing a simple bar chart per domain with remaining time before the configured limit, going red when close.

### Step 8 — Chat Interface
Build `components/ChatInterface.tsx`. This is the main feature.

System prompt (`lib/prompts.ts`):
```typescript
export function buildSystemPrompt(context: {
  tabCount: number
  currentUrl: string
  currentPageTitle: string
  gmailSummary: string
  socialTimeToday: Record<string, number>
}): string {
  return `You are Buddy, a friendly personal assistant living in the user's Chrome browser.

Current context:
- Open tabs: ${context.tabCount}
- Current page: ${context.currentPageTitle} (${context.currentUrl})
- Gmail: ${context.gmailSummary}
- Social media today: ${JSON.stringify(context.socialTimeToday)}

Be concise and helpful. You can:
- Summarize the current page if asked (the user will paste page content)
- Help draft email replies
- Suggest which emails to prioritize
- Advise on focus and break timing
- Answer general questions

Respond in a friendly, slightly playful tone. Keep responses under 150 words unless the user asks for something detailed.`
}
```

The chat UI should:
- Show message history (stored in component state, not persisted)
- Switch Character to "thinking" state while awaiting Claude response
- Have a "Summarize this page" quick button that auto-injects current tab content
- Have a "Triage my Gmail" quick button that sends the stored Gmail data to Claude and asks for priority advice

### Step 9 — Break Reminder
In `background/index.ts`:
```typescript
// Set up alarm on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("breakReminder", { periodInMinutes: 60 })
})

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "breakReminder") {
    const settings = await chrome.storage.local.get("breakIntervalMinutes")
    chrome.notifications.create({
      type: "basic",
      iconUrl: "assets/icon.png",
      title: "Buddy says: Take a break!",
      message: "You've been browsing for a while. Step away for 5 minutes.",
    })
  }
})
```

Also render `<BreakBanner />` in the side panel that shows elapsed time since last break and a "I took a break" reset button.

### Step 10 — Side Panel Layout + Final Polish
Wire everything together in `sidepanel/index.tsx`:

```tsx
export default function SidePanel() {
  const [activeTab, setActiveTab] = useState<"chat" | "tabs" | "gmail" | "social">("chat")
  const [characterState, setCharacterState] = useState<"idle" | "thinking" | "alert">("idle")

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <header className="flex items-center gap-3 p-3 border-b border-gray-800">
        <Character state={characterState} />
        <div>
          <h1 className="font-bold text-sm">Buddy</h1>
          <p className="text-xs text-gray-400">Your browser assistant</p>
        </div>
      </header>

      <nav className="flex border-b border-gray-800">
        {["chat", "tabs", "gmail", "social"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)}
            className={`flex-1 py-2 text-xs capitalize ${activeTab === tab ? "border-b-2 border-blue-500" : "text-gray-400"}`}>
            {tab}
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-auto">
        {activeTab === "chat" && <ChatInterface setCharacterState={setCharacterState} />}
        {activeTab === "tabs" && <TabList />}
        {activeTab === "gmail" && <GmailTriage />}
        {activeTab === "social" && <SocialTimer />}
      </main>

      <BreakBanner />
    </div>
  )
}
```

---

## manifest.json (Plasmo auto-generates, but key permissions needed)

In `package.json`, add this Plasmo manifest config:
```json
{
  "manifest": {
    "permissions": [
      "tabs",
      "storage",
      "alarms",
      "notifications",
      "sidePanel"
    ],
    "host_permissions": [
      "https://mail.google.com/*",
      "https://*.twitter.com/*",
      "https://x.com/*",
      "https://*.reddit.com/*",
      "https://*.linkedin.com/*",
      "https://*.youtube.com/*",
      "https://api.anthropic.com/*"
    ],
    "side_panel": {
      "default_path": "sidepanel/index.html"
    },
    "action": {
      "default_title": "Open Buddy"
    }
  }
}
```

---

## Claude API Usage & Prompting Strategy

All prompts live in `lib/prompts.ts`. Key principles:

**For Page Summarization:**
- Extract page text via `document.body.innerText` in a content script
- Truncate to ~3000 words before sending (keep tokens low)
- Prompt: "Summarize this in 5 bullet points. Focus on the key takeaways."

**For Gmail Triage:**
- Send top 10 thread subjects + senders
- Prompt: "Which of these need a reply? Rank by urgency. Flag anything that looks like it's been waiting more than 2 days."

**For Draft Replies:**
- Send thread subject, sender, and snippet
- Prompt: "Draft a short, professional reply to this email. Keep it under 100 words."

**Token Cost Estimate (rough):**
- Page summary: ~1500 tokens in, ~200 out → ~$0.002 per call
- Gmail triage: ~500 tokens in, ~200 out → ~$0.001 per call
- Chat message: varies, ~$0.001–0.005 per exchange
- Typical user: 20–50 calls/day → ~$0.05–0.15/day per user (extremely cheap)

---

## README for GitHub (copy this into README.md)

```markdown
# Buddy — AI Chrome Extension Assistant

Your personal AI assistant living in Chrome's side panel. Manages your tabs, 
triages Gmail, tracks social media time, and chats via Claude AI.

## Setup (5 minutes)

1. Clone this repo
   git clone https://github.com/yourusername/buddy-extension
   cd buddy-extension

2. Install dependencies
   npm install

3. Add your Claude API key
   cp .env.example .env
   # Edit .env and add: PLASMO_PUBLIC_CLAUDE_KEY=sk-ant-...
   # Get a key at: https://console.anthropic.com

4. Run in development
   npm run dev
   # This opens Chrome with the extension loaded

5. Set up Buddy
   - Click the Buddy icon in Chrome toolbar
   - Click "Open Settings"
   - Paste your API key and save
   - Open any page and click the side panel icon to start

## Build for production
   npm run build
   # Outputs to build/chrome-mv3-prod/
   # Load this folder in chrome://extensions with Developer Mode on

## Privacy
All data stays on your machine. Your Claude API key is stored locally in 
Chrome's storage. No data is sent anywhere except directly to Anthropic's 
API when you use the chat feature.
```

---

## .env.example

```
# Get your Claude API key from https://console.anthropic.com
PLASMO_PUBLIC_CLAUDE_KEY=
```

---

## Key Implementation Notes for Claude in VS Code

1. **Gmail DOM selectors will need verification.** Gmail uses obfuscated class names that change. Before finalizing `gmail.ts`, open Gmail in Chrome DevTools, inspect the inbox rows, and update the selectors accordingly. This is the most brittle part of the project.

2. **Content Security Policy.** Chrome extensions have strict CSP. All fetch calls to `api.anthropic.com` must go through the background service worker, not directly from content scripts. Route API calls: `ContentScript → background → Claude API → background → ContentScript`.

3. **Side Panel API.** The Chrome Side Panel API requires Chrome 114+. The popup `index.tsx` should open the side panel using:
   ```typescript
   chrome.sidePanel.open({ windowId: currentWindow.id })
   ```

4. **Lottie animations.** If you don't have custom animations, use these free ones from LottieFiles:
   - Search "robot idle" for the character
   - Download 3 variations and rename to idle/thinking/alert

5. **React state vs chrome.storage.** Use React state for ephemeral UI data (chat messages, current tab). Use `chrome.storage.local` for anything that needs to persist across sessions (API key, social media timers, Gmail data).

6. **Tab stale tracking.** `chrome.tabs` does not expose when a tab was opened. Track this yourself in the background worker by listening to `chrome.tabs.onCreated` and storing `{ [tabId]: timestamp }` in storage. Clean up on `chrome.tabs.onRemoved`.

---

## Phase 2 Feature Ideas (after MVP ships)

- Google Calendar OAuth integration for meeting briefings
- Slack web app content script for message triage
- Reading queue: save tabs to read later with Claude-generated summaries
- Character customization: different character skins
- Productivity analytics dashboard (weekly report)
- Smart tab grouping using Claude (cluster tabs by project/topic)
- "Focus mode" that blocks distracting sites for a set duration
- Voice interface using Web Speech API
