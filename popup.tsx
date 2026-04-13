import "./style.css"

export default function Popup() {
  async function openPanel() {
    const window = await chrome.windows.getCurrent()
    if (window.id != null) {
      await chrome.sidePanel.open({ windowId: window.id })
    }
  }

  return (
    <div className="flex w-56 flex-col gap-2 bg-gray-950 p-3 text-white">
      <h1 className="text-sm font-bold">Cue</h1>
      <p className="text-xs text-gray-400">
        Personal AI agent that watches your back.
      </p>
      <button
        onClick={openPanel}
        className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold hover:bg-blue-500">
        Open side panel
      </button>
      <button
        onClick={() => chrome.runtime.openOptionsPage?.()}
        className="rounded bg-gray-800 px-3 py-1.5 text-xs hover:bg-gray-700">
        Open settings
      </button>
    </div>
  )
}
