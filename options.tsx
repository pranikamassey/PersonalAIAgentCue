import { useEffect, useState } from "react"

import { getSettings, saveSettings } from "~lib/storage"
import { DEFAULT_SETTINGS, TRACKED_DOMAINS, type BuddySettings } from "~types"

import "./style.css"

export default function Options() {
  const [settings, setSettings] = useState<BuddySettings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  function update<K extends keyof BuddySettings>(key: K, value: BuddySettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }))
  }

  function updateLimit(domain: string, minutes: number) {
    setSettings((s) => ({
      ...s,
      socialLimits: { ...s.socialLimits, [domain]: minutes }
    }))
  }

  async function handleSave() {
    await saveSettings(settings)
    await chrome.runtime.sendMessage({ type: "UPDATE_BREAK_ALARM" }).catch(() => {})
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-950 p-8 text-white">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <header>
          <h1 className="text-2xl font-bold">Buddy Settings</h1>
          <p className="text-sm text-gray-400">
            Configure your AI browser assistant.
          </p>
        </header>

        <section className="flex flex-col gap-2">
          <label className="text-sm font-semibold">OpenAI API Key</label>
          <input
            type="password"
            value={settings.claudeApiKey}
            onChange={(e) => update("claudeApiKey", e.target.value)}
            placeholder="sk-..."
            className="rounded bg-gray-900 px-3 py-2 text-sm outline-none ring-1 ring-gray-800 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">
            Stored locally in chrome.storage. Get a key at{" "}
            <a
              className="text-blue-400 underline"
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noreferrer">
              platform.openai.com/api-keys
            </a>
            . (Temporary — we'll switch back to Claude later.)
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={settings.breakRemindersEnabled}
              onChange={(e) =>
                update("breakRemindersEnabled", e.target.checked)
              }
            />
            Break reminders
          </label>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Every</span>
            <input
              type="number"
              min={5}
              max={240}
              value={settings.breakIntervalMinutes}
              onChange={(e) =>
                update("breakIntervalMinutes", Number(e.target.value))
              }
              className="w-20 rounded bg-gray-900 px-2 py-1 ring-1 ring-gray-800 focus:ring-blue-500"
            />
            <span className="text-gray-400">minutes</span>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <label className="text-sm font-semibold">
            Social media daily limits (minutes)
          </label>
          {TRACKED_DOMAINS.map((domain) => (
            <div key={domain} className="flex items-center gap-2 text-sm">
              <span className="w-32 text-gray-300">{domain}</span>
              <input
                type="number"
                min={0}
                max={600}
                value={settings.socialLimits[domain] ?? 20}
                onChange={(e) => updateLimit(domain, Number(e.target.value))}
                className="w-20 rounded bg-gray-900 px-2 py-1 ring-1 ring-gray-800 focus:ring-blue-500"
              />
            </div>
          ))}
        </section>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500">
            Save settings
          </button>
          {saved && (
            <span className="text-sm text-green-400">Saved ✓</span>
          )}
        </div>
      </div>
    </div>
  )
}
