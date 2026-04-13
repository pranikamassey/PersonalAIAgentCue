import { getTabOpenTimes } from "./storage"

export async function getAllTabs(): Promise<chrome.tabs.Tab[]> {
  return chrome.tabs.query({})
}

export function safeHostname(url: string | undefined): string {
  if (!url) return "unknown"
  try {
    return new URL(url).hostname || "unknown"
  } catch {
    return "unknown"
  }
}

export function groupTabsByDomain(
  tabs: chrome.tabs.Tab[]
): Record<string, chrome.tabs.Tab[]> {
  return tabs.reduce<Record<string, chrome.tabs.Tab[]>>((groups, tab) => {
    const domain = safeHostname(tab.url)
    if (!groups[domain]) groups[domain] = []
    groups[domain].push(tab)
    return groups
  }, {})
}

export async function getStaleTabIds(hoursThreshold = 24): Promise<Set<number>> {
  const openTimes = await getTabOpenTimes()
  const threshold = Date.now() - hoursThreshold * 60 * 60 * 1000
  const stale = new Set<number>()
  for (const [idStr, ts] of Object.entries(openTimes)) {
    if (ts < threshold) stale.add(Number(idStr))
  }
  return stale
}

export async function closeTab(tabId: number): Promise<void> {
  await chrome.tabs.remove(tabId)
}
