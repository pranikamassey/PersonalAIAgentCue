import { useEffect, useState } from "react"

import { askClaude } from "~lib/claude"
import { buildDraftReplyPrompt, buildGmailTriagePrompt } from "~lib/prompts"
import { getApiKey, getGmailThreads } from "~lib/storage"
import type { GmailThread } from "~types"

export function GmailTriage() {
  const [threads, setThreads] = useState<GmailThread[]>([])
  const [loading, setLoading] = useState(false)
  const [advice, setAdvice] = useState<string>("")
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [error, setError] = useState<string>("")

  useEffect(() => {
    getGmailThreads().then(setThreads)
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>
    ) => {
      if (changes.gmailThreads) {
        setThreads(changes.gmailThreads.newValue ?? [])
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  async function triage() {
    setError("")
    setLoading(true)
    try {
      const key = await getApiKey()
      const result = await askClaude(
        [{ role: "user", content: buildGmailTriagePrompt(threads) }],
        "You are Buddy, a concise inbox triage assistant.",
        key
      )
      setAdvice(result)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  async function draft(index: number) {
    setError("")
    try {
      const key = await getApiKey()
      const result = await askClaude(
        [{ role: "user", content: buildDraftReplyPrompt(threads[index]) }],
        "You are Buddy, a concise email drafting assistant.",
        key
      )
      setDrafts((d) => ({ ...d, [index]: result }))
    } catch (e) {
      setError(String(e))
    }
  }

  if (threads.length === 0) {
    return (
      <div className="p-3 text-sm text-gray-400">
        Open Gmail in another tab and Buddy will start reading your inbox.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-3 text-sm">
      <button
        disabled={loading}
        onClick={triage}
        className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold hover:bg-blue-500 disabled:opacity-50">
        {loading ? "Thinking…" : "Triage my Gmail"}
      </button>

      {error && <div className="text-xs text-red-400">{error}</div>}
      {advice && (
        <div className="whitespace-pre-wrap rounded border border-blue-900 bg-blue-950/40 p-2 text-xs text-blue-100">
          {advice}
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {threads.map((t, i) => (
          <li
            key={i}
            className={`rounded border border-gray-800 p-2 ${
              t.isUnread ? "bg-gray-900/80" : ""
            }`}>
            <div className="flex items-center justify-between">
              <span className="truncate text-xs font-semibold text-blue-300">
                {t.sender}
              </span>
              <button
                onClick={() => draft(i)}
                className="shrink-0 text-[10px] text-gray-400 hover:text-blue-300">
                Draft reply
              </button>
            </div>
            <div className="truncate text-xs text-gray-200">{t.subject}</div>
            <div className="truncate text-[11px] text-gray-500">{t.snippet}</div>
            {drafts[i] && (
              <div className="mt-1 whitespace-pre-wrap rounded bg-gray-800 p-1.5 text-[11px] text-gray-200">
                {drafts[i]}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
