'use server'

import { getOpenAI, getModel, SYSTEM_PROMPT } from '../lib/llm'
import { createServerClient } from '@/app/utils/supabase/server'

export async function askAction(question: string) {
  const q = (question ?? '').trim()
  if (!q) return { ok: false, answer: 'Please type a question.' }

  const supabase = await createServerClient()
  let context = '--- CureCore Context ---\n'

  try {
    const { data: low } = await supabase
      .from('ingredients')
      .select('name, current_stock, reorder_level')
      .lte('current_stock', 20)
      .order('current_stock', { ascending: true })
      .limit(10)

    if (low?.length) {
      context += '\nLow Stock Items:\n'
      low.forEach((row: any) => {
        context += `• ${row.name} — ${row.current_stock} units (reorder ≤ ${row.reorder_level})\n`
      })
    } else {
      context += '\nLow Stock Items:\n• None currently flagged (<= 20 units)\n'
    }

    const { count: suppliers } = await supabase
      .from('suppliers')
      .select('*', { count: 'exact', head: true })

    context += `\nTotal Suppliers: ${suppliers || 0}\n`

    const { count: batches } = await supabase
      .from('batches')
      .select('*', { count: 'exact', head: true })

    context += `Active Batches: ${batches || 0}\n`
  } catch (error) {
    console.error('Context fetch failed:', error)
  }

  try {
    const openai = getOpenAI()
    const response = await openai.chat.completions.create({
      model: getModel(),
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Question:\n${q}\n\nContext:\n${context}`,
        },
      ],
    })

    const answer = response.choices?.[0]?.message?.content?.trim() || 'No answer.'
    return { ok: true, answer }
  } catch (error: any) {
    console.error('LLM error:', error)
    const message = error?.message ?? (typeof error === 'string' ? error : JSON.stringify(error))
    return { ok: false, answer: `OpenAI error: ${message}` }
  }
}
