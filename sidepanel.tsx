import { useEffect, useState } from "react"

import { BreakBanner } from "~components/BreakBanner"
import { Character } from "~components/Character"
import { ChatInterface } from "~components/ChatInterface"
import { GmailTriage } from "~components/GmailTriage"
import { SocialTimer } from "~components/SocialTimer"
import { TabList } from "~components/TabList"
import { TodoList } from "~components/TodoList"
import type { CharacterState } from "~types"

import "./style.css"

type TabId = "chat" | "tabs" | "gmail" | "social" | "todo"

interface PendingAction {
  target: TabId
  action: string | null
  ts: number
}

export default function SidePanel() {
  const [activeTab, setActiveTab] = useState<TabId>("chat")
  const [characterState, setCharacterState] = useState<CharacterState>("idle")
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  useEffect(() => {
    async function consumePending() {
      const res = await chrome.storage.local.get("pendingPanelAction")
      const pa = res.pendingPanelAction as PendingAction | undefined
      if (!pa) return
      // Only honor actions < 5s old so reloads don't replay stale intents.
      if (Date.now() - pa.ts > 5000) {
        await chrome.storage.local.remove("pendingPanelAction")
        return
      }
      setActiveTab(pa.target)
      if (pa.action) setPendingAction(pa.action)
      await chrome.storage.local.remove("pendingPanelAction")
    }
    consumePending()
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>
    ) => {
      if (changes.pendingPanelAction?.newValue) {
        consumePending()
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  return (
    <div className="flex h-screen flex-col bg-gray-950 text-white">
      <header className="flex items-center gap-3 border-b border-gray-800 p-3">
        <Character state={characterState} size={56} />
        <div className="flex-1">
          <h1 className="text-sm font-bold">Buddy</h1>
          <p className="text-xs text-gray-400">Your browser assistant</p>
        </div>
        <button
          onClick={() => chrome.runtime.openOptionsPage?.()}
          className="rounded bg-gray-800 px-2 py-1 text-[10px] text-gray-300 hover:bg-gray-700">
          Settings
        </button>
      </header>

      <nav className="flex border-b border-gray-800">
        {(["chat", "todo", "tabs", "gmail", "social"] as TabId[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs capitalize transition ${
              activeTab === tab
                ? "border-b-2 border-blue-500 text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}>
            {tab}
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-hidden">
        {activeTab === "chat" && (
          <ChatInterface
            setCharacterState={setCharacterState}
            pendingAction={pendingAction}
            onActionConsumed={() => setPendingAction(null)}
          />
        )}
        {activeTab === "tabs" && (
          <div className="h-full overflow-auto">
            <TabList />
          </div>
        )}
        {activeTab === "gmail" && (
          <div className="h-full overflow-auto">
            <GmailTriage />
          </div>
        )}
        {activeTab === "social" && (
          <div className="h-full overflow-auto">
            <SocialTimer />
          </div>
        )}
        {activeTab === "todo" && (
          <div className="h-full overflow-auto">
            <TodoList />
          </div>
        )}
      </main>

      <BreakBanner />
    </div>
  )
}
