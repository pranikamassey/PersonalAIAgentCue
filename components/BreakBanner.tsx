import { useEffect, useState } from "react"

import { getLastBreakAt, getSettings, setLastBreakAt } from "~lib/storage"

export function BreakBanner() {
  const [lastBreak, setLastBreak] = useState<number>(Date.now())
  const [intervalMin, setIntervalMin] = useState<number>(60)
  const [now, setNow] = useState<number>(Date.now())

  useEffect(() => {
    ;(async () => {
      const [lb, s] = await Promise.all([getLastBreakAt(), getSettings()])
      setLastBreak(lb)
      setIntervalMin(s.breakIntervalMinutes)
    })()
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const elapsedMin = Math.floor((now - lastBreak) / 60000)
  const overdue = elapsedMin >= intervalMin

  async function reset() {
    const ts = Date.now()
    await setLastBreakAt(ts)
    setLastBreak(ts)
  }

  return (
    <div
      className={`flex items-center justify-between border-t px-3 py-2 text-xs ${
        overdue
          ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
          : "border-gray-800 text-gray-400"
      }`}>
      <span>
        {overdue ? "Time for a break!" : "Last break"} · {elapsedMin} min ago
      </span>
      <button
        onClick={reset}
        className="rounded bg-gray-800 px-2 py-0.5 hover:bg-gray-700">
        I took a break
      </button>
    </div>
  )
}
