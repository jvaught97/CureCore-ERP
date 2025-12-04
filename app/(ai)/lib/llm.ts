import OpenAI from 'openai'

export function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY')
  return new OpenAI({ apiKey })
}

export function getModel() {
  return process.env.OPENAI_MODEL || 'gpt-4o-mini'
}

export const SYSTEM_PROMPT = `
You are CureCore AI. Be concise and practical.
If the user is requesting an action (create supplier, map item, draft PO, re-cost formula),
reply: "Switch to Do mode" and provide a one-line plan.
Otherwise, answer directly in 2–6 sentences using only the provided context.
`
