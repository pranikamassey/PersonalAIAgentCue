import type { GmailThread } from "~types"

export interface CueContext {
  tabCount: number
  currentUrl: string
  currentPageTitle: string
  gmailSummary: string
  socialTimeToday: Record<string, number> // minutes
}

export function buildSystemPrompt(ctx: CueContext): string {
  return `You are Cue, a friendly personal AI agent that watches the user's back while they browse.

Current context:
- Open tabs: ${ctx.tabCount}
- Current page: ${ctx.currentPageTitle} (${ctx.currentUrl})
- Gmail: ${ctx.gmailSummary}
- Social media today (minutes): ${JSON.stringify(ctx.socialTimeToday)}

You can:
- Summarize the current page if asked (the user will paste page content)
- Help draft email replies
- Suggest which emails to prioritize
- Advise on focus and break timing
- Answer general questions

Respond in a friendly, slightly playful tone. Be concise. Keep responses under 150 words unless the user explicitly asks for something detailed.`
}

export const SUMMARIZE_PAGE_PROMPT =
  "Summarize the following page in 5 concise bullet points. Focus on the key takeaways. Page content:\n\n"

export function buildGmailTriagePrompt(threads: GmailThread[]): string {
  const list = threads
    .slice(0, 10)
    .map(
      (t, i) =>
        `${i + 1}. ${t.isUnread ? "[UNREAD] " : ""}From: ${t.sender}\n   Subject: ${t.subject}\n   Snippet: ${t.snippet}`
    )
    .join("\n\n")
  return `Here are my top Gmail threads. Which need a reply? Rank by urgency and flag anything that looks like it has been waiting. Be concise.\n\n${list}`
}

export function buildDraftReplyPrompt(thread: GmailThread): string {
  return `Draft a short, professional reply to this email. Keep it under 100 words.\n\nFrom: ${thread.sender}\nSubject: ${thread.subject}\nMessage snippet: ${thread.snippet}`
}
