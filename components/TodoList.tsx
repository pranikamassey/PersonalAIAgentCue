import { useEffect, useState } from "react"

import { addTodo, getTodos, removeTodo } from "~lib/storage"
import type { TodoItem, TodoType } from "~types"

const TYPE_ICON: Record<TodoType, string> = {
  form: "📝",
  article: "📰",
  custom: "⭐"
}

const TYPE_LABEL: Record<TodoType, string> = {
  form: "Unfinished form",
  article: "Unread article",
  custom: "Reminder"
}

const REMIND_OPTIONS: { label: string; minutes: number }[] = [
  { label: "No reminder", minutes: 0 },
  { label: "In 15 minutes", minutes: 15 },
  { label: "In 1 hour", minutes: 60 },
  { label: "In 3 hours", minutes: 180 },
  { label: "Tomorrow", minutes: 60 * 24 }
]

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
  const [showAdd, setShowAdd] = useState(false)
  const [newText, setNewText] = useState("")
  const [remindMinutes, setRemindMinutes] = useState(0)

  async function refresh() {
    setTodos(await getTodos())
  }

  async function submitCustom(e: React.FormEvent) {
    e.preventDefault()
    const text = newText.trim()
    if (!text) return
    const id = `custom:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`
    const remindAt = remindMinutes > 0 ? Date.now() + remindMinutes * 60_000 : undefined
    const item: TodoItem = {
      id,
      type: "custom",
      url: "",
      title: text,
      note: "Reminder",
      createdAt: Date.now(),
      remindAt
    }
    await addTodo(item)
    if (remindAt) {
      chrome.alarms.create(`todoRemind:${id}`, { when: remindAt })
    }
    setNewText("")
    setRemindMinutes(0)
    setShowAdd(false)
    refresh()
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
    if (!item.url) return
    await chrome.tabs.create({ url: item.url })
  }

  async function done(item: TodoItem) {
    if (item.type === "custom" && item.remindAt) {
      chrome.alarms.clear(`todoRemind:${item.id}`)
    }
    await removeTodo(item.id)
  }

  const addBar = (
    <div className="flex items-center justify-between">
      <div className="text-xs text-gray-400">
        {todos.length} item{todos.length === 1 ? "" : "s"}
      </div>
      <button
        onClick={() => setShowAdd((v) => !v)}
        className="rounded bg-blue-600 px-2 py-0.5 text-[11px] font-semibold hover:bg-blue-500">
        {showAdd ? "Cancel" : "+ New"}
      </button>
    </div>
  )

  const addForm = showAdd && (
    <form
      onSubmit={submitCustom}
      className="flex flex-col gap-2 rounded border border-gray-800 bg-gray-900/60 p-2">
      <input
        autoFocus
        value={newText}
        onChange={(e) => setNewText(e.target.value)}
        placeholder="What do you need to remember?"
        className="rounded bg-gray-950 px-2 py-1 text-xs outline-none ring-1 ring-gray-800 focus:ring-blue-500"
      />
      <div className="flex items-center gap-2">
        <select
          value={remindMinutes}
          onChange={(e) => setRemindMinutes(Number(e.target.value))}
          className="flex-1 rounded bg-gray-950 px-2 py-1 text-[11px] ring-1 ring-gray-800">
          {REMIND_OPTIONS.map((o) => (
            <option key={o.minutes} value={o.minutes}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!newText.trim()}
          className="rounded bg-blue-600 px-3 py-1 text-[11px] font-semibold hover:bg-blue-500 disabled:opacity-50">
          Add
        </button>
      </div>
    </form>
  )

  if (todos.length === 0) {
    return (
      <div className="flex flex-col gap-2 p-3 text-sm">
        {addBar}
        {addForm}
        <div className="text-xs text-gray-400">
          No todos yet. Start a form or open an article — if you don't finish,
          Cue will remember it here. Or click + New to add your own.
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-3 text-sm">
      {addBar}
      {addForm}
      {todos.map((item) => {
        let host = item.url
        try {
          if (item.url) host = new URL(item.url).hostname
        } catch {
          /* ignore */
        }
        const remindLabel =
          item.remindAt && item.remindAt > Date.now()
            ? `⏰ ${new Date(item.remindAt).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit"
              })}`
            : null
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
                {item.url && (
                  <div className="truncate text-[11px] text-gray-500" title={item.url}>
                    {host}
                  </div>
                )}
                {remindLabel && (
                  <div className="text-[11px] text-amber-300">{remindLabel}</div>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                {item.url && (
                  <button
                    onClick={() => open(item)}
                    className="rounded bg-blue-600/80 px-2 py-0.5 text-[10px] font-semibold hover:bg-blue-500">
                    Open
                  </button>
                )}
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
