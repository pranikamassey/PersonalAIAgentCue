export type CharacterState = "idle" | "thinking" | "alert"

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface GmailThread {
  sender: string
  subject: string
  snippet: string
  isUnread: boolean
}

export interface BuddySettings {
  claudeApiKey: string
  breakIntervalMinutes: number
  breakRemindersEnabled: boolean
  socialLimits: Record<string, number> // minutes per domain
}

export interface SocialTimeEntry {
  date: string // YYYY-MM-DD
  seconds: Record<string, number> // domain -> seconds
}

export interface TabOpenTimes {
  [tabId: number]: number // timestamp ms
}

export type TodoType = "form" | "article"

export interface TodoItem {
  id: string // e.g. `form:<url>` or `article:<url>`
  type: TodoType
  url: string
  title: string
  note: string
  createdAt: number
}

export const MAX_TODOS = 50

export const DEFAULT_SETTINGS: BuddySettings = {
  claudeApiKey: "",
  breakIntervalMinutes: 60,
  breakRemindersEnabled: true,
  socialLimits: {
    "twitter.com": 20,
    "x.com": 20,
    "reddit.com": 20,
    "linkedin.com": 20,
    "youtube.com": 30
  }
}

export const TRACKED_DOMAINS = [
  "twitter.com",
  "x.com",
  "reddit.com",
  "linkedin.com",
  "youtube.com"
]
