import { useEffect, useState } from "react"

import {
  closeTab,
  getAllTabs,
  groupTabsByDomain,
  getStaleTabIds
} from "~lib/tabs"

export function TabList() {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([])
  const [stale, setStale] = useState<Set<number>>(new Set())

  async function refresh() {
    const [allTabs, staleIds] = await Promise.all([
      getAllTabs(),
      getStaleTabIds(24)
    ])
    setTabs(allTabs)
    setStale(staleIds)
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleClose(id?: number) {
    if (id == null) return
    await closeTab(id)
    refresh()
  }

  async function closeAllStale() {
    const ids = Array.from(stale)
    await Promise.all(ids.map((id) => closeTab(id)))
    refresh()
  }

  const grouped = groupTabsByDomain(tabs)
  const domains = Object.keys(grouped).sort(
    (a, b) => grouped[b].length - grouped[a].length
  )

  return (
    <div className="flex flex-col gap-3 p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-gray-300">
          {tabs.length} tabs · {domains.length} domains
        </span>
        {stale.size > 0 && (
          <button
            onClick={closeAllStale}
            className="rounded bg-amber-500/20 px-2 py-1 text-xs text-amber-200 hover:bg-amber-500/30">
            Close {stale.size} stale
          </button>
        )}
      </div>

      {domains.map((domain) => (
        <div key={domain} className="rounded border border-gray-800 p-2">
          <div className="mb-1 text-xs font-semibold text-blue-300">
            {domain}{" "}
            <span className="text-gray-500">({grouped[domain].length})</span>
          </div>
          <ul className="flex flex-col gap-1">
            {grouped[domain].map((tab) => {
              const isStale = tab.id != null && stale.has(tab.id)
              return (
                <li
                  key={tab.id}
                  className={`flex items-center justify-between gap-2 rounded px-1 py-0.5 text-xs ${
                    isStale ? "bg-amber-500/10 text-amber-200" : "text-gray-200"
                  }`}>
                  <span className="truncate" title={tab.title}>
                    {tab.title || tab.url}
                  </span>
                  <button
                    onClick={() => handleClose(tab.id)}
                    className="shrink-0 text-gray-400 hover:text-red-400">
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
