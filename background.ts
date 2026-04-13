import {
  addSocialTime,
  addTodo,
  getSettings,
  getTodos,
  removeTabOpenTime,
  removeTodo,
  saveGmailThreads,
  setTabOpenTime
} from "~lib/storage"
import { TRACKED_DOMAINS, type GmailThread, type TodoItem } from "~types"

const BREAK_ALARM = "buddyBreakReminder"
const TODO_REMIND_PREFIX = "todoRemind:"

// Allow the toolbar icon to open the side panel.
chrome.sidePanel
  ?.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => {
    /* older Chrome */
  })

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings()
  if (settings.breakRemindersEnabled) {
    chrome.alarms.create(BREAK_ALARM, {
      periodInMinutes: settings.breakIntervalMinutes
    })
  }
})

chrome.runtime.onStartup?.addListener(async () => {
  const settings = await getSettings()
  if (settings.breakRemindersEnabled) {
    chrome.alarms.create(BREAK_ALARM, {
      periodInMinutes: settings.breakIntervalMinutes
    })
  }
})

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === BREAK_ALARM) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icon.png"),
      title: "Cue says: Take a break!",
      message: "You've been browsing a while. Step away for 5 minutes."
    })
    return
  }
  if (alarm.name.startsWith(TODO_REMIND_PREFIX)) {
    const id = alarm.name.slice(TODO_REMIND_PREFIX.length)
    const todos = await getTodos()
    const todo = todos.find((t) => t.id === id)
    if (!todo) return
    chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icon.png"),
      title: "Cue reminder",
      message: todo.title
    })
  }
})

// Track when tabs are created so we can flag stale ones later.
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id != null) setTabOpenTime(tab.id, Date.now())
})

chrome.tabs.onRemoved.addListener((tabId) => {
  removeTabOpenTime(tabId)
})

// Message hub
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // sidePanel.open must be called synchronously in the message handler,
  // before any `await`, or Chrome drops the user gesture and silently fails.
  if (message?.type === "OPEN_SIDE_PANEL") {
    const windowId = sender.tab?.windowId
    const target: string | undefined = message.target
    const action: string | null = message.action ?? null
    if (target) {
      chrome.storage.local.set({
        pendingPanelAction: { target, action, ts: Date.now() }
      })
    }
    if (windowId != null) {
      chrome.sidePanel
        .open({ windowId })
        .catch((e) => console.error("[Cue] sidePanel.open failed", e))
    }
    sendResponse({ ok: true })
    return false
  }

  ;(async () => {
    try {
      switch (message?.type) {
        case "GMAIL_UPDATE": {
          const threads: GmailThread[] = message.data ?? []
          await saveGmailThreads(threads)
          sendResponse({ ok: true })
          return
        }
        case "TIME_UPDATE": {
          const domain: string = message.domain ?? ""
          const seconds: number = Math.max(0, Number(message.seconds) || 0)
          const matched = TRACKED_DOMAINS.find((d) => domain.endsWith(d))
          if (matched && seconds > 0) await addSocialTime(matched, seconds)
          sendResponse({ ok: true })
          return
        }
        case "TODO_ADD": {
          const item = message.item as TodoItem | undefined
          if (item && item.id && item.type && item.url) {
            await addTodo(item)
          }
          sendResponse({ ok: true })
          return
        }
        case "TODO_REMOVE": {
          const id: string | undefined = message.id
          if (id) await removeTodo(id)
          sendResponse({ ok: true })
          return
        }
        case "UPDATE_BREAK_ALARM": {
          const settings = await getSettings()
          await chrome.alarms.clear(BREAK_ALARM)
          if (settings.breakRemindersEnabled) {
            chrome.alarms.create(BREAK_ALARM, {
              periodInMinutes: settings.breakIntervalMinutes
            })
          }
          sendResponse({ ok: true })
          return
        }
        default:
          sendResponse({ ok: false, error: "unknown message type" })
      }
    } catch (err) {
      sendResponse({ ok: false, error: String(err) })
    }
  })()
  return true // keep channel open for async sendResponse
})
