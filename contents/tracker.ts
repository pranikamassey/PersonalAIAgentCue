import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: [
    "https://*.twitter.com/*",
    "https://x.com/*",
    "https://*.reddit.com/*",
    "https://*.linkedin.com/*",
    "https://*.youtube.com/*"
  ],
  run_at: "document_idle"
}

let startTime = document.hidden ? 0 : Date.now()

function flush() {
  if (startTime === 0) return
  const seconds = (Date.now() - startTime) / 1000
  startTime = 0
  if (seconds <= 0) return
  chrome.runtime
    .sendMessage({
      type: "TIME_UPDATE",
      domain: location.hostname,
      seconds
    })
    .catch(() => {
      /* background asleep */
    })
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    flush()
  } else {
    startTime = Date.now()
  }
})

window.addEventListener("beforeunload", flush)

// Periodic flush so long sessions still report.
setInterval(() => {
  if (!document.hidden) {
    flush()
    startTime = Date.now()
  }
}, 30_000)
