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

export interface CueSettings {
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

export type TodoType = "form" | "article" | "custom"

export interface TodoItem {
  id: string // e.g. `form:<url>`, `article:<url>`, or `custom:<uuid>`
  type: TodoType
  url: string
  title: string
  note: string
  createdAt: number
  remindAt?: number // epoch ms, for custom todos
}

export const MAX_TODOS = 50

export const DEFAULT_SETTINGS: CueSettings = {
  claudeApiKey: "",
  breakIntervalMinutes: 60,
  breakRemindersEnabled: true,
  socialLimits: {
    "instagram.com": 20,
    "x.com": 20,
    "reddit.com": 20,
    "linkedin.com": 20,
    "youtube.com": 30
  }
}

export const TRACKED_DOMAINS = [
  "instagram.com",
  "x.com",
  "reddit.com",
  "linkedin.com",
  "youtube.com"
]
