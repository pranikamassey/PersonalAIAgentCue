import { DotLottieReact } from "@lottiefiles/dotlottie-react"

import globbyUrl from "url:~assets/globby.lottie"

import type { CharacterState } from "~types"

const LABEL: Record<CharacterState, string> = {
  idle: "Ready",
  thinking: "Thinking…",
  alert: "Heads up!"
}

interface Props {
  state: CharacterState
  size?: number
}

export function Character({ state, size = 64 }: Props) {
  return (
    <div
      title={LABEL[state]}
      aria-label={LABEL[state]}
      className={state === "thinking" ? "animate-pulse" : ""}
      style={{ width: size, height: size }}>
      <DotLottieReact
        src={globbyUrl}
        loop
        autoplay
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  )
}
