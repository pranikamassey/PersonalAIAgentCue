import type { PlasmoCSConfig } from "plasmo"
import type { GmailThread } from "~types"

export const config: PlasmoCSConfig = {
  matches: ["https://mail.google.com/*"],
  run_at: "document_idle"
}

function parseInbox(): GmailThread[] {
  // NOTE: Gmail obfuscates class names and changes them periodically.
  // Verify these selectors in DevTools before shipping.
  const rows = document.querySelectorAll<HTMLTableRowElement>("tr.zA")
  const results: GmailThread[] = []

  rows.forEach((row) => {
    const senderEl = row.querySelector(".yP, .zF")
    const sender =
      senderEl?.getAttribute("name") ??
      senderEl?.getAttribute("email") ??
      senderEl?.textContent?.trim() ??
      "Unknown"
    const subject =
      row.querySelector(".y6 span")?.textContent?.trim() ??
      row.querySelector(".bog")?.textContent?.trim() ??
      ""
    const snippet =
      row.querySelector(".y2")?.textContent?.trim() ??
      row.querySelector(".xS")?.textContent?.trim() ??
      ""
    const isUnread = row.classList.contains("zE")
    if (subject || sender !== "Unknown") {
      results.push({ sender, subject, snippet, isUnread })
    }
  })

  return results.slice(0, 20)
}

let lastSerialized = ""
let debounceTimer: number | undefined

function pushUpdate() {
  const data = parseInbox()
  const serialized = JSON.stringify(data)
  if (serialized === lastSerialized) return
  lastSerialized = serialized
  chrome.runtime.sendMessage({ type: "GMAIL_UPDATE", data }).catch(() => {
    /* background may be sleeping */
  })
}

function schedulePush() {
  window.clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(pushUpdate, 800)
}

schedulePush()
const observer = new MutationObserver(schedulePush)
observer.observe(document.body, { childList: true, subtree: true })
