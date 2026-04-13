import { DotLottieReact } from "@lottiefiles/dotlottie-react"
import cssText from "data-text:./floater.css"
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { useEffect, useRef, useState } from "react"

import globbyUrl from "url:~assets/globby.lottie"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle",
  all_frames: false
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

const POS_KEY = "buddyFloaterPos"
const ORB_SIZE = 80
// Larger hit area so the mouse can travel from the orb onto the chips
// without leaving the root container (which would hide the chips mid-click).
const HIT_W = 340
const HIT_H = 280
const CHIP_W = 110
const CHIP_H = 34

type Pos = { x: number; y: number }
type Target = "chat" | "tabs" | "gmail" | "social" | "todo"
type Action = "summarize" | null

type Chip = {
  label: string
  target: Target
  action: Action
  icon: string
}

const CHIPS: Chip[] = [
  { label: "Summarize", target: "chat", action: "summarize", icon: "✨" },
  { label: "Chat", target: "chat", action: null, icon: "💬" },
  { label: "Todo", target: "todo", action: null, icon: "📋" },
  { label: "Gmail", target: "gmail", action: null, icon: "✉️" },
  { label: "Tabs", target: "tabs", action: null, icon: "🗂" }
]
const FAN_RADIUS = 140
const FAN_SPREAD = 108 // degrees covered by the whole fan
const DRAG_THRESHOLD = 5

// Pick the fan center angle so chips always go toward screen interior.
// 0deg = right, 90 = down, 180 = left, 270 = up.
function fanCenterDeg(cx: number, cy: number): number {
  const right = cx > window.innerWidth / 2
  const bottom = cy > window.innerHeight / 2
  if (right && bottom) return 225 // upper-left
  if (!right && bottom) return 315 // upper-right
  if (right && !bottom) return 135 // lower-left
  return 45 // lower-right
}

function clampPos(p: Pos, w: number, h: number): Pos {
  return {
    x: Math.max(0, Math.min(window.innerWidth - w, p.x)),
    y: Math.max(0, Math.min(window.innerHeight - h, p.y))
  }
}

function openSidePanel(target: Target, action: Action) {
  chrome.runtime
    .sendMessage({ type: "OPEN_SIDE_PANEL", target, action })
    .catch(() => {})
}

async function computeHint(): Promise<string | null> {
  try {
    const res = await chrome.storage.local.get([
      "buddySettings",
      "lastBreakAt",
      "gmailThreads",
      "socialTime"
    ])
    const settings = res.buddySettings ?? {}
    const intervalMin = settings.breakIntervalMinutes ?? 60
    const lastBreak = res.lastBreakAt ?? Date.now()
    const elapsedMin = (Date.now() - lastBreak) / 60000
    if (elapsedMin >= intervalMin) {
      return "time for a break 🌿"
    }
    const threads = (res.gmailThreads ?? []) as { isUnread: boolean }[]
    const unread = threads.filter((t) => t.isUnread).length
    if (unread >= 3) {
      return `${unread} unread emails waiting`
    }
    const social = res.socialTime?.seconds ?? {}
    const limits = settings.socialLimits ?? {}
    for (const [domain, secs] of Object.entries(social)) {
      const minutes = Math.round((secs as number) / 60)
      const limit = limits[domain] ?? 9999
      if (minutes >= limit) return `over your ${domain} limit`
    }
    return null
  } catch {
    return null
  }
}

export default function Floater() {
  const [pos, setPos] = useState<Pos>({
    x: window.innerWidth - ORB_SIZE - 24,
    y: window.innerHeight - ORB_SIZE - 24
  })
  const [dragging, setDragging] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [dismissedHint, setDismissedHint] = useState<string | null>(null)
  const dragStart = useRef<{ px: number; py: number; x: number; y: number } | null>(null)
  const movedRef = useRef(false)
  const hideTimerRef = useRef<number | undefined>(undefined)

  function enterHover() {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = undefined
    }
    setHovered(true)
  }

  function scheduleLeave() {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
    hideTimerRef.current = window.setTimeout(() => {
      setHovered(false)
      hideTimerRef.current = undefined
    }, 200)
  }

  useEffect(() => {
    chrome.storage.local.get(POS_KEY).then((r) => {
      const stored = r[POS_KEY] as Pos | undefined
      if (stored) setPos(clampPos(stored, ORB_SIZE, ORB_SIZE))
    })
  }, [])

  useEffect(() => {
    let mounted = true
    const refresh = async () => {
      const h = await computeHint()
      if (mounted) setHint(h)
    }
    refresh()
    const id = setInterval(refresh, 30_000)
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (
        changes.buddySettings ||
        changes.lastBreakAt ||
        changes.gmailThreads ||
        changes.socialTime
      ) {
        refresh()
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => {
      mounted = false
      clearInterval(id)
      chrome.storage.onChanged.removeListener(listener)
    }
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragStart.current) return
      const dx = e.clientX - dragStart.current.px
      const dy = e.clientY - dragStart.current.py
      if (!movedRef.current && Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) {
        movedRef.current = true
        setDragging(true)
      }
      if (movedRef.current) {
        setPos(
          clampPos(
            { x: dragStart.current.x + dx, y: dragStart.current.y + dy },
            ORB_SIZE,
            ORB_SIZE
          )
        )
      }
    }
    const onUp = () => {
      if (movedRef.current) {
        setDragging(false)
        setPos((p) => {
          chrome.storage.local.set({ [POS_KEY]: p })
          return p
        })
      }
      dragStart.current = null
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [])

  function onOrbMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return
    e.preventDefault()
    movedRef.current = false
    dragStart.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y }
  }

  function onOrbClick() {
    if (movedRef.current) return
    openSidePanel("chat", null)
  }

  // Root is positioned so the orb sits at the bottom-right corner of the hit area.
  // The orb's top-left in page coords is (pos.x, pos.y); root's top-left is
  // (pos.x - (HIT_W - ORB_SIZE), pos.y - (HIT_H - ORB_SIZE)).
  const rootLeft = pos.x - (HIT_W - ORB_SIZE)
  const rootTop = pos.y - (HIT_H - ORB_SIZE)
  const orbCx = HIT_W - ORB_SIZE / 2
  const orbCy = HIT_H - ORB_SIZE / 2

  const activeHint = hint && hint !== dismissedHint ? hint : null
  const showHint = activeHint && !hovered && !dragging
  const showChips = hovered && !dragging

  return (
    <>
      {/* Hint bubble lives OUTSIDE the hit area so hovering it (to click ×)
          doesn't trigger the orb's hover state. */}
      {showHint && (
        <div
          className="buddy-hint-bubble"
          style={{
            left: pos.x + ORB_SIZE / 2 - 110,
            top: pos.y - 44
          }}>
          <span>{activeHint}</span>
          <button
            className="buddy-hint-close"
            aria-label="Dismiss"
            onClick={(e) => {
              e.stopPropagation()
              setDismissedHint(hint)
            }}>
            ×
          </button>
        </div>
      )}

      <div
        className="buddy-floater-root"
        style={{ left: rootLeft, top: rootTop, width: HIT_W, height: HIT_H }}>
        {CHIPS.map((chip, i) => {
          const center = fanCenterDeg(pos.x + ORB_SIZE / 2, pos.y + ORB_SIZE / 2)
          const step = FAN_SPREAD / (CHIPS.length - 1)
          const angle = center - FAN_SPREAD / 2 + i * step
          const rad = (angle * Math.PI) / 180
          const cx = orbCx + Math.cos(rad) * FAN_RADIUS - CHIP_W / 2
          const cy = orbCy + Math.sin(rad) * FAN_RADIUS - CHIP_H / 2
          const restX = orbCx - CHIP_W / 2
          const restY = orbCy - CHIP_H / 2
          return (
            <button
              key={chip.label}
              className={`buddy-chip ${showChips ? "buddy-chip-visible" : ""}`}
              style={{
                width: CHIP_W,
                height: CHIP_H,
                transform: showChips
                  ? `translate(${cx}px, ${cy}px) scale(1)`
                  : `translate(${restX}px, ${restY}px) scale(0.3)`
              }}
              onMouseEnter={enterHover}
              onMouseLeave={scheduleLeave}
              onClick={(e) => {
                e.stopPropagation()
                openSidePanel(chip.target, chip.action)
              }}>
              <span className="buddy-chip-icon">{chip.icon}</span>
              <span>{chip.label}</span>
            </button>
          )
        })}

        <div
          className={`buddy-orb ${hovered ? "buddy-orb-hovered" : ""} ${dragging ? "buddy-orb-dragging" : ""}`}
          style={{
            left: HIT_W - ORB_SIZE,
            top: HIT_H - ORB_SIZE,
            width: ORB_SIZE,
            height: ORB_SIZE
          }}
          onMouseEnter={enterHover}
          onMouseLeave={scheduleLeave}
          onMouseDown={onOrbMouseDown}
          onClick={onOrbClick}
          title="Click to chat · hover for actions · drag to move">
          <DotLottieReact
            src={globbyUrl}
            loop
            autoplay
            style={{ width: "100%", height: "100%", pointerEvents: "none" }}
          />
        </div>
      </div>
    </>
  )
}
