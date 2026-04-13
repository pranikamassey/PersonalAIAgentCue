import {
  DEFAULT_SETTINGS,
  MAX_TODOS,
  type CueSettings,
  type GmailThread,
  type SocialTimeEntry,
  type TabOpenTimes,
  type TodoItem
} from "~types"

const KEYS = {
  settings: "buddySettings",
  gmailThreads: "gmailThreads",
  socialTime: "socialTime",
  tabOpenTimes: "tabOpenTimes",
  lastBreakAt: "lastBreakAt",
  todos: "todos"
} as const

export async function getSettings(): Promise<CueSettings> {
  const res = await chrome.storage.local.get(KEYS.settings)
  return { ...DEFAULT_SETTINGS, ...(res[KEYS.settings] ?? {}) }
}

export async function saveSettings(settings: CueSettings): Promise<void> {
  await chrome.storage.local.set({ [KEYS.settings]: settings })
}

export async function getApiKey(): Promise<string> {
  const s = await getSettings()
  return s.claudeApiKey || process.env.PLASMO_PUBLIC_CLAUDE_KEY || ""
}

export async function getGmailThreads(): Promise<GmailThread[]> {
  const res = await chrome.storage.local.get(KEYS.gmailThreads)
  return res[KEYS.gmailThreads] ?? []
}

export async function saveGmailThreads(threads: GmailThread[]): Promise<void> {
  await chrome.storage.local.set({ [KEYS.gmailThreads]: threads })
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function getSocialTime(): Promise<SocialTimeEntry> {
  const res = await chrome.storage.local.get(KEYS.socialTime)
  const entry: SocialTimeEntry | undefined = res[KEYS.socialTime]
  const today = todayKey()
  if (!entry || entry.date !== today) {
    return { date: today, seconds: {} }
  }
  return entry
}

export async function addSocialTime(domain: string, seconds: number): Promise<void> {
  const entry = await getSocialTime()
  entry.seconds[domain] = (entry.seconds[domain] ?? 0) + seconds
  await chrome.storage.local.set({ [KEYS.socialTime]: entry })
}

export async function getTabOpenTimes(): Promise<TabOpenTimes> {
  const res = await chrome.storage.local.get(KEYS.tabOpenTimes)
  return res[KEYS.tabOpenTimes] ?? {}
}

export async function setTabOpenTime(tabId: number, timestamp: number): Promise<void> {
  const times = await getTabOpenTimes()
  times[tabId] = timestamp
  await chrome.storage.local.set({ [KEYS.tabOpenTimes]: times })
}

export async function removeTabOpenTime(tabId: number): Promise<void> {
  const times = await getTabOpenTimes()
  delete times[tabId]
  await chrome.storage.local.set({ [KEYS.tabOpenTimes]: times })
}

export async function getLastBreakAt(): Promise<number> {
  const res = await chrome.storage.local.get(KEYS.lastBreakAt)
  return res[KEYS.lastBreakAt] ?? Date.now()
}

export async function setLastBreakAt(ts: number): Promise<void> {
  await chrome.storage.local.set({ [KEYS.lastBreakAt]: ts })
}

export async function getTodos(): Promise<TodoItem[]> {
  const res = await chrome.storage.local.get(KEYS.todos)
  return res[KEYS.todos] ?? []
}

export async function addTodo(item: TodoItem): Promise<void> {
  const todos = await getTodos()
  const existingIdx = todos.findIndex((t) => t.id === item.id)
  if (existingIdx >= 0) {
    // Refresh timestamp on the existing entry, keep at top.
    todos.splice(existingIdx, 1)
  }
  todos.unshift(item)
  const trimmed = todos.slice(0, MAX_TODOS)
  await chrome.storage.local.set({ [KEYS.todos]: trimmed })
}

export async function removeTodo(id: string): Promise<void> {
  const todos = await getTodos()
  const next = todos.filter((t) => t.id !== id)
  if (next.length !== todos.length) {
    await chrome.storage.local.set({ [KEYS.todos]: next })
  }
}
