import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: 'Missing OPENAI_API_KEY' }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey })
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a health check.' },
        { role: 'user', content: 'Say OK.' },
      ],
      temperature: 0,
    })

    const content = response.choices?.[0]?.message?.content?.trim() || 'No content'
    return NextResponse.json({ ok: true, content })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: String(error?.message || error) }, { status: 500 })
  }
}
