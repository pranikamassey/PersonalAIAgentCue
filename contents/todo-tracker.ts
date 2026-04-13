import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle",
  all_frames: false
}

const MIN_FORM_CHARS = 20
const ARTICLE_MIN_READ_MS = 30_000

// ---------- form detection ----------
let formDirty = false
let formCleared = false

function isInteresting(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  if (el instanceof HTMLInputElement) {
    const t = (el.type || "").toLowerCase()
    return ["text", "email", "tel", "url", "number", "search", "password"].includes(t)
  }
  if (el instanceof HTMLTextAreaElement) return true
  if (el.isContentEditable) return true
  return false
}

function totalTypedLength(): number {
  let total = 0
  document
    .querySelectorAll<HTMLElement>("input, textarea, [contenteditable='true']")
    .forEach((el) => {
      if (el instanceof HTMLInputElement) {
        if (["text", "email", "tel", "url", "number", "search", "password"].includes(el.type)) {
          total += el.value?.length ?? 0
        }
      } else if (el instanceof HTMLTextAreaElement) {
        total += el.value?.length ?? 0
      } else if (el.isContentEditable) {
        total += (el.textContent ?? "").length
      }
    })
  return total
}

document.addEventListener(
  "input",
  (e) => {
    if (!isInteresting(e.target)) return
    formDirty = true
  },
  true
)

document.addEventListener(
  "submit",
  () => {
    formDirty = false
    formCleared = true
    chrome.runtime
      .sendMessage({ type: "TODO_REMOVE", id: `form:${location.href}` })
      .catch(() => {})
  },
  true
)

// ---------- article detection ----------
function isArticlePage(): boolean {
  const og = document.querySelector(
    'meta[property="og:type"]'
  ) as HTMLMetaElement | null
  if (og?.content?.toLowerCase().includes("article")) return true

  const art = document.querySelector("article")
  if (art && (art.textContent?.length ?? 0) > 1000) return true

  const main = document.querySelector("main, [role=main]") as HTMLElement | null
  if (
    main &&
    (main.textContent?.length ?? 0) > 2000 &&
    main.querySelectorAll("p").length >= 4
  ) {
    return true
  }
  return false
}

const articlePage = isArticlePage()
let visibleMs = 0
let lastVisibleAt = document.hidden ? 0 : Date.now()

function accumulate() {
  if (lastVisibleAt > 0) {
    visibleMs += Date.now() - lastVisibleAt
    lastVisibleAt = 0
  }
}

function resumeVisible() {
  if (!document.hidden && lastVisibleAt === 0) {
    lastVisibleAt = Date.now()
  }
}

function report() {
  accumulate()

  // Form todo
  if (formDirty && !formCleared && totalTypedLength() >= MIN_FORM_CHARS) {
    chrome.runtime
      .sendMessage({
        type: "TODO_ADD",
        item: {
          id: `form:${location.href}`,
          type: "form",
          url: location.href,
          title: document.title || location.hostname,
          note: "Unfinished form",
          createdAt: Date.now()
        }
      })
      .catch(() => {})
  }

  // Article todo
  if (articlePage) {
    if (visibleMs < ARTICLE_MIN_READ_MS) {
      chrome.runtime
        .sendMessage({
          type: "TODO_ADD",
          item: {
            id: `article:${location.href}`,
            type: "article",
            url: location.href,
            title: document.title || location.hostname,
            note: "Unread article",
            createdAt: Date.now()
          }
        })
        .catch(() => {})
    } else {
      chrome.runtime
        .sendMessage({ type: "TODO_REMOVE", id: `article:${location.href}` })
        .catch(() => {})
    }
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    report()
  } else {
    resumeVisible()
  }
})

window.addEventListener("pagehide", report, { capture: true })
