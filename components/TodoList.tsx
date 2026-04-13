import { useEffect, useState } from "react"

import { getTodos, removeTodo } from "~lib/storage"
import type { TodoItem, TodoType } from "~types"

const TYPE_ICON: Record<TodoType, string> = {
  form: "📝",
  article: "📰"
}

const TYPE_LABEL: Record<TodoType, string> = {
  form: "Unfinished form",
  article: "Unread article"
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function TodoList() {
  const [todos, setTodos] = useState<TodoItem[]>([])

  async function refresh() {
    setTodos(await getTodos())
  }

  useEffect(() => {
    refresh()
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>
    ) => {
      if (changes.todos) setTodos(changes.todos.newValue ?? [])
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  async function open(item: TodoItem) {
    await chrome.tabs.create({ url: item.url })
  }

  async function done(item: TodoItem) {
    await removeTodo(item.id)
  }

  if (todos.length === 0) {
    return (
      <div className="p-3 text-sm text-gray-400">
        No todos yet. Start a form or open an article — if you don't finish,
        Buddy will remember it here.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-3 text-sm">
      <div className="text-xs text-gray-400">
        {todos.length} item{todos.length === 1 ? "" : "s"}
      </div>
      {todos.map((item) => {
        let host = item.url
        try {
          host = new URL(item.url).hostname
        } catch {
          /* ignore */
        }
        return (
          <div
            key={item.id}
            className="rounded border border-gray-800 bg-gray-900/40 p-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">
                    {TYPE_ICON[item.type]}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-blue-300">
                    {TYPE_LABEL[item.type]}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    · {relativeTime(item.createdAt)}
                  </span>
                </div>
                <div className="mt-1 truncate text-xs text-gray-100" title={item.title}>
                  {item.title}
                </div>
                <div className="truncate text-[11px] text-gray-500" title={item.url}>
                  {host}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  onClick={() => open(item)}
                  className="rounded bg-blue-600/80 px-2 py-0.5 text-[10px] font-semibold hover:bg-blue-500">
                  Open
                </button>
                <button
                  onClick={() => done(item)}
                  className="rounded bg-gray-800 px-2 py-0.5 text-[10px] text-gray-300 hover:bg-gray-700">
                  Done
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
