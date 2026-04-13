import type { ChatMessage } from "~types"

// NOTE: temporarily using OpenAI's API. The function is still called
// `askClaude` so the rest of the app doesn't need to change — we'll swap
// back to Anthropic later.
const OPENAI_URL = "https://api.openai.com/v1/chat/completions"
const MODEL = "gpt-4o-mini"

export async function askClaude(
  messages: ChatMessage[],
  systemPrompt: string,
  apiKey: string,
  maxTokens = 1024
): Promise<string> {
  if (!apiKey) {
    throw new Error("Missing OpenAI API key. Add one in Settings.")
  }

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ]
    })
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenAI API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== "string") {
    throw new Error("Unexpected OpenAI response shape")
  }
  return content
}
