'use client'

import { FormEvent, useState, useTransition } from 'react'
import { MessageCircle, Rocket, ShieldCheck, Send, CheckCircle2, TriangleAlert } from 'lucide-react'
import { dispatchTool } from '../actions/dispatch'
import { askAction } from '../actions/ask'

type Mode = 'ask' | 'do' | 'explain'
type ToolName = 'createSupplier' | 'upsertSupplierItem' | 'mapSupplierToIngredient' | 'repriceFormula' | 'createPurchaseOrder' | 'attachDocument'

export default function ChatDock() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('ask')
  const [input, setInput] = useState('')
  const [plan, setPlan] = useState<string | null>(null)
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null)
  const [pendingTool, setPendingTool] = useState<{ name: ToolName; payload: Record<string, unknown> } | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()

  function push(message: string) {
    setLog((current) => [...current, message])
  }

  function getExplainResponse(message: string) {
    if (/plan|preview/i.test(message)) {
      return 'Plan shows the ordered steps before an action runs; Preview mirrors the payload that will be sent to Supabase. Confirm only when both look right.'
    }
    if (/rbac|permission/i.test(message)) {
      return 'Every action calls an RBAC RPC (currently a placeholder). If the check fails you will see “Permission denied”; contact ops to grant access.'
    }
    return `Explain mode shares implementation notes. For now: actions call Supabase server actions, log to audit_log, and require confirmation. Ask about “plan”, “permissions”, or “audit” for specific details.`
  }

  function routeToTool(message: string) {
    const s = message.trim()
    const supplierMatch = s.match(
      /(?:^|\b)(?:new|create)\s+supplier\s*:?\s*([^,]+)(?:,|$).*?(?:website\s*:?\s*(\S+))?.*?(?:terms\s*:?\s*([^,]+))?/i
    )

    if (supplierMatch) {
      const name = supplierMatch[1]?.trim() || ''
      const website = supplierMatch[2]?.trim()
      const terms = supplierMatch[3]?.trim()

      const payload = {
        name,
        website: website || undefined,
        terms: terms || undefined,
      }

      const planText = `Plan:\n1) Create supplier "${payload.name}"\n2) Store optional website and terms\n3) Write audit log`
      setPlan(planText)
      setPreview(payload)
      setPendingTool({ name: 'createSupplier', payload })
      push(`🧭 ${planText}`)
      return true
    }

    return false
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!input.trim()) return

    if (mode === 'ask') {
      const res = await askAction(input)
      setInput('')
      if (res.ok) {
        push(`🤖 ${res.answer}`)
      } else {
        push(`⚠️ ${res.answer}`)
      }
      return
    }

    if (mode === 'do') {
      const routed = routeToTool(input)
      if (!routed) {
        push('🤖 No matching tool. Try: "new supplier: ACME Labs, website: https://acme.test, terms: Net 30"')
      }
    } else {
      push('📘 ' + getExplainResponse(input))
    }

    setInput('')
  }

  function execute() {
    if (!pendingTool) return
    push('⏳ Executing...')
    startTransition(async () => {
      try {
        const result = await dispatchTool(pendingTool.name, pendingTool.payload)
        if (result.ok) {
          push(`✅ ${pendingTool.name} succeeded`)
        } else {
          push(`⚠️ ${'error' in result ? result.error : 'Unknown error'}`)
        }
      } catch (err) {
        push(`⚠️ ${(err as Error).message}`)
      } finally {
        setPlan(null)
        setPreview(null)
        setPendingTool(null)
      }
    })
  }

  return (
    <>
      <button
        className="fixed bottom-5 right-5 rounded-full shadow-lg p-4 bg-black text-white flex gap-2 items-center"
        onClick={() => setOpen((state) => !state)}
        aria-label="Open CureCore AI"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="hidden md:inline">CureCore AI</span>
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 w-[380px] max-h-[75vh] bg-white border shadow-xl rounded-2xl flex flex-col">
          <div className="p-3 border-b flex items-center gap-2">
            <Rocket className="w-4 h-4" />
            <span className="font-medium">CureCore AI Copilot</span>
            <div className="ml-auto flex gap-2 text-sm">
              <button className={mode === 'ask' ? 'font-semibold' : ''} onClick={() => setMode('ask')}>
                Ask
              </button>
              <span>·</span>
              <button className={mode === 'do' ? 'font-semibold' : ''} onClick={() => setMode('do')}>
                Do
              </button>
              <span>·</span>
              <button className={mode === 'explain' ? 'font-semibold' : ''} onClick={() => setMode('explain')}>
                Explain
              </button>
            </div>
          </div>

          <div className="p-3 overflow-auto space-y-2 text-sm">
            {log.map((entry, index) => (
              <div key={index}>{entry}</div>
            ))}

            {plan && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded">
                <div className="flex items-center gap-2 mb-1 text-amber-800">
                  <ShieldCheck className="w-4 h-4" />
                  <strong>Plan</strong>
                </div>
                <pre className="whitespace-pre-wrap text-amber-900 text-xs">{plan}</pre>
              </div>
            )}

            {preview && (
              <div className="p-2 bg-slate-50 border rounded">
                <div className="flex items-center gap-2 mb-1">
                  <TriangleAlert className="w-4 h-4" />
                  <strong>Preview changes</strong>
                </div>
                <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(preview, null, 2)}</pre>
                <button
                  onClick={execute}
                  disabled={isPending}
                  className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded bg-black text-white disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm & Execute
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
            <input
              className="flex-1 border rounded px-3 py-2 text-sm"
              placeholder={
                mode === 'do'
                  ? 'e.g., new supplier: Jedwards, website: https://jedwards.com, terms: Net 30'
                  : 'Ask CureCore…'
              }
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button className="px-3 py-2 rounded bg-black text-white" type="submit">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
