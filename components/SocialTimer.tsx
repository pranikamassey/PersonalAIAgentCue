import { useEffect, useState } from "react"

import { getSettings, getSocialTime } from "~lib/storage"
import { TRACKED_DOMAINS, type CueSettings, type SocialTimeEntry } from "~types"

export function SocialTimer() {
  const [entry, setEntry] = useState<SocialTimeEntry | null>(null)
  const [settings, setSettings] = useState<CueSettings | null>(null)

  async function refresh() {
    const [e, s] = await Promise.all([getSocialTime(), getSettings()])
    setEntry(e)
    setSettings(s)
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 10_000)
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.socialTime || changes.buddySettings) refresh()
    }
    chrome.storage.onChanged.addListener(listener)
    return () => {
      clearInterval(id)
      chrome.storage.onChanged.removeListener(listener)
    }
  }, [])

  if (!entry || !settings) return null

  return (
    <div className="flex flex-col gap-2 p-3 text-sm">
      <div className="text-xs text-gray-400">Today · {entry.date}</div>
      {TRACKED_DOMAINS.map((domain) => {
        const seconds = entry.seconds[domain] ?? 0
        const minutes = Math.floor(seconds / 60)
        const limit = settings.socialLimits[domain] ?? 20
        const pct = Math.min(100, (minutes / limit) * 100)
        const over = minutes >= limit
        const near = !over && minutes >= limit * 0.8
        return (
          <div key={domain} className="flex flex-col gap-0.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-200">{domain}</span>
              <span
                className={
                  over
                    ? "text-red-400"
                    : near
                      ? "text-amber-300"
                      : "text-gray-400"
                }>
                {minutes}/{limit} min
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded bg-gray-800">
              <div
                className={`h-full transition-all ${
                  over ? "bg-red-500" : near ? "bg-amber-400" : "bg-blue-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
