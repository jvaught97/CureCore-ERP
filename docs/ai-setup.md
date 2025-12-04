# CureCore AI – OpenAI Setup

## Env vars (in project root `.env.local`)
OPENAI_API_KEY=sk-...your-key...
OPENAI_MODEL=gpt-4o-mini

## Install SDK
npm install openai

## Verify
Visit /api/ai-test and expect: { ok: true, content: "OK" }
