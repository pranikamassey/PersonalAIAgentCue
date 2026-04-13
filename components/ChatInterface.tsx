import { useEffect, useRef, useState } from "react"

import { askClaude } from "~lib/claude"
import {
  buildGmailTriagePrompt,
  buildSystemPrompt,
  type CueContext
} from "~lib/prompts"
import {
  getApiKey,
  getGmailThreads,
  getSocialTime
} from "~lib/storage"
import type { CharacterState, ChatMessage } from "~types"

interface Props {
  setCharacterState: (state: CharacterState) => void
  pendingAction?: string | null
  onActionConsumed?: () => void
}

async function getActiveBrowserTab(): Promise<chrome.tabs.Tab | undefined> {
  // Side panel context: explicitly ask for the current browser window and
  // skip any non-normal windows (devtools, popups).
  try {
    const win = await chrome.windows.getLastFocused({ windowTypes: ["normal"] })
    const [tab] = await chrome.tabs.query({ active: true, windowId: win.id })
    if (tab) return tab
  } catch {
    /* fall through */
  }
  const [fallback] = await chrome.tabs.query({ active: true, currentWindow: true })
  return fallback
}

async function buildContext(): Promise<CueContext> {
  const [tabs, gmail, social, current] = await Promise.all([
    chrome.tabs.query({}),
    getGmailThreads(),
    getSocialTime(),
    getActiveBrowserTab()
  ])
  const minutes: Record<string, number> = {}
  for (const [k, v] of Object.entries(social.seconds)) {
    minutes[k] = Math.round(v / 60)
  }
  const unread = gmail.filter((t) => t.isUnread).length
  return {
    tabCount: tabs.length,
    currentUrl: current?.url ?? "",
    currentPageTitle: current?.title ?? "",
    gmailSummary: `${gmail.length} threads, ${unread} unread`,
    socialTimeToday: minutes
  }
}

async function getCurrentPageText(): Promise<{ text: string; title: string; url: string }> {
  const tab = await getActiveBrowserTab()
  if (!tab?.id) throw new Error("No active tab found.")
  if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("chrome-extension://")) {
    throw new Error("Can't read Chrome internal pages.")
  }
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const pick = (el: HTMLElement | null) => {
        if (!el) return ""
        const inner = (el.innerText ?? "").trim()
        if (inner.length > 200) return inner
        return (el.textContent ?? "").trim()
      }
      const candidates = [
        document.querySelector("main") as HTMLElement | null,
        document.querySelector("article") as HTMLElement | null,
        document.querySelector("[role=main]") as HTMLElement | null,
        document.body
      ]
      let best = ""
      for (const c of candidates) {
        const t = pick(c)
        if (t.length > best.length) best = t
      }
      return best.slice(0, 30000)
    }
  })
  const text = results[0]?.result ?? ""
  return { text, title: tab.title ?? "", url: tab.url ?? "" }
}

export function ChatInterface({
  setCharacterState,
  pendingAction,
  onActionConsumed
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, loading])

  useEffect(() => {
    if (pendingAction === "summarize") {
      summarizePage()
      onActionConsumed?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAction])

  async function tryGetPage() {
    try {
      const page = await getCurrentPageText()
      if (!page.text.trim()) return null
      const truncated = page.text.split(/\s+/).slice(0, 3000).join(" ")
      return { ...page, text: truncated }
    } catch {
      return null
    }
  }

  async function send(displayContent: string, includePage = true) {
    if (!displayContent.trim() || loading) return
    setError("")
    const next: ChatMessage[] = [...messages, { role: "user", content: displayContent }]
    setMessages(next)
    setInput("")
    setLoading(true)
    setCharacterState("thinking")
    try {
      const [key, ctx, page] = await Promise.all([
        getApiKey(),
        buildContext(),
        includePage ? tryGetPage() : Promise.resolve(null)
      ])
      let system = buildSystemPrompt(ctx)
      if (page) {
        system += `\n\nThe user is currently viewing this web page. Use it as context when answering their questions.\nTitle: ${page.title}\nURL: ${page.url}\n\n---\n${page.text}\n---`
      }
      const reply = await askClaude(next, system, key)
      setMessages([...next, { role: "assistant", content: reply }])
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
      setCharacterState("idle")
    }
  }

  async function summarizePage() {
    const page = await tryGetPage()
    if (!page) {
      setError("Couldn't read the current page.")
      return
    }
    send("Summarize this page.")
  }

  async function triageGmail() {
    const threads = await getGmailThreads()
    if (threads.length === 0) {
      setError("No Gmail data yet. Open Gmail in another tab.")
      return
    }
    send(buildGmailTriagePrompt(threads))
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2 border-b border-gray-800 p-2">
        <button
          onClick={summarizePage}
          className="rounded bg-gray-800 px-2 py-1 text-[11px] hover:bg-gray-700">
          Summarize page
        </button>
        <button
          onClick={triageGmail}
          className="rounded bg-gray-800 px-2 py-1 text-[11px] hover:bg-gray-700">
          Triage Gmail
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-auto p-3 text-sm">
        {messages.length === 0 && (
          <div className="text-xs text-gray-500">
            Ask me anything. I can see your tabs, Gmail, and time tracking.
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
              m.role === "user"
                ? "ml-6 bg-blue-600/30 text-blue-50"
                : "mr-6 bg-gray-800 text-gray-100"
            }`}>
            <div className="whitespace-pre-wrap">{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="mr-6 animate-pulse rounded-lg bg-gray-800 px-3 py-2 text-xs text-gray-400">
            Cue is thinking…
          </div>
        )}
        {error && (
          <div className="rounded bg-red-900/40 px-3 py-2 text-[11px] text-red-200">
            {error}
          </div>
        )}
      </div>

      <form
        className="flex gap-2 border-t border-gray-800 p-2"
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}>
        <input
          className="flex-1 rounded bg-gray-900 px-2 py-1.5 text-xs outline-none ring-1 ring-gray-800 focus:ring-blue-500"
          placeholder="Ask Cue…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold hover:bg-blue-500 disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  )
}
