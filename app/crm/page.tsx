'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AppNav } from '@/components/nav/AppNav'
import { createClient } from '@/app/utils/supabase/client'
import { Loader2, Plus, Users, Target, FileText } from 'lucide-react'

type TabType = 'leads' | 'opportunities' | 'quotes' | 'follow-ups';

type PipelineStageSummary = {
  stage: string
  total: number
}

type KpiSnapshot = {
  winRate: number | null
  avgSalesCycle: number | null
  topAccounts: Array<{ name: string; value: number }>
}

// Lead types
type LeadRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
  source: string | null
  status: string | null
  created_at: string | null
}

// Opportunity types
const STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost']

type Opportunity = {
  id: string
  name: string
  stage: string | null
  value_amount: number | null
  account_name: string | null
  close_date: string | null
}

// Quote types
type QuoteRow = {
  id: string
  account_name: string | null
  status: string | null
  status_updated_at: string | null
  currency: string | null
  totals: any
  created_at: string | null
  manufacturing_cost: number | null
}

type FollowUpRow = {
  id: string
  opportunity_id: string
  opportunity_name: string | null
  type: string
  subject: string | null
  due_at: string | null
  overdue: boolean
}

const formatCurrency = (value: number | string | null | undefined, currency?: string | null) => {
  if (value === null || value === undefined) return '—'
  const numeric =
    typeof value === 'string'
      ? Number(value)
      : value
  if (!Number.isFinite(numeric)) return '—'
  return `${currency ?? 'USD'} ${numeric.toFixed(2)}`
}

const formatStatusDate = (value: string | null | undefined) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function CrmOverviewPage() {
  const supabase = useMemo(() => createClient(), [])
  const bypassMode = useMemo(
    () => (process.env.NEXT_PUBLIC_SUPABASE_BYPASS_AUTH ?? 'true') === 'true',
    [],
  )
  const demoData = useMemo(
    () => ({
      leads: [
        {
          id: 'lead-demo-1',
          name: 'Wellness Collective',
          email: 'hello@wellnesscollective.com',
          phone: '555-210-3321',
          source: 'Expo Booth',
          status: 'New',
          created_at: new Date().toISOString(),
        },
        {
          id: 'lead-demo-2',
          name: 'Thrive Beauty Labs',
          email: 'info@thrivebeauty.com',
          phone: '555-889-1200',
          source: 'Referral',
          status: 'Qualified',
          created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
      ] as LeadRow[],
      opportunities: (() => {
        const grouped: Record<string, Opportunity[]> = {}
        STAGES.forEach((stage) => {
          grouped[stage] = []
        })
        grouped.Proposal = [
          {
            id: 'opp-demo-1',
            name: 'Calm Collective – Refill Program',
            stage: 'Proposal',
            value_amount: 185000,
            account_name: 'Calm Collective',
            close_date: new Date(Date.now() + 14 * 86400000).toISOString(),
          },
        ]
        grouped.Qualified = [
          {
            id: 'opp-demo-2',
            name: 'Northstar Retail – Q2 Expansion',
            stage: 'Qualified',
            value_amount: 92000,
            account_name: 'Northstar Retail',
            close_date: new Date(Date.now() + 30 * 86400000).toISOString(),
          },
        ]
        return grouped
      })(),
      quotes: [
        {
          id: 'quote-demo-1',
          status: 'Sent',
          status_updated_at: new Date().toISOString(),
          currency: 'USD',
          totals: { manufacturing_cost: 42000 },
          created_at: new Date().toISOString(),
          account_name: 'Wellness Collective',
          manufacturing_cost: 42000,
        },
      ] as QuoteRow[],
      followUps: [
        {
          id: 'follow-demo-1',
          opportunity_id: 'opp-demo-1',
          opportunity_name: 'Calm Collective – Refill Program',
          type: 'Call',
          subject: 'Walk through proposal rev 2',
          due_at: new Date(Date.now() + 2 * 86400000).toISOString(),
          overdue: false,
        },
      ] as FollowUpRow[],
    }),
    [],
  )
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tab = searchParams.get('tab');
    return tab === 'opportunities' || tab === 'quotes' || tab === 'follow-ups' ? tab : 'leads';
  });

  const [loading, setLoading] = useState(true)
  const [stageSummary, setStageSummary] = useState<PipelineStageSummary[]>([])
  const [stats, setStats] = useState<KpiSnapshot>({
    winRate: null,
    avgSalesCycle: null,
    topAccounts: [],
  })

  // Tab-specific data
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [opportunities, setOpportunities] = useState<Record<string, Opportunity[]>>({})
  const [quotes, setQuotes] = useState<QuoteRow[]>([])
  const [draggedOpportunity, setDraggedOpportunity] = useState<{ id: string; fromStage: string } | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null)
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([])

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setLoading(true)
      try {
        if (bypassMode) {
          if (!isMounted) return
          if (activeTab === 'leads') {
            setLeads(demoData.leads)
            setOpportunities({})
            setQuotes([])
            setFollowUps([])
          } else if (activeTab === 'opportunities') {
            setOpportunities(demoData.opportunities)
            setLeads([])
            setQuotes([])
            setFollowUps([])
          } else if (activeTab === 'quotes') {
            setQuotes(demoData.quotes)
            setLeads([])
            setOpportunities({})
            setFollowUps([])
          } else if (activeTab === 'follow-ups') {
            setFollowUps(demoData.followUps)
          }
          setLoading(false)
          return
        }

        if (activeTab === 'leads') {
          const { data, error } = await supabase
            .from('crm_leads')
            .select('id,name,email,phone,source,status,created_at')
            .order('created_at', { ascending: false })

          if (error && error.code !== '42P01') {
            console.error('Failed to load leads', error)
          } else if (isMounted) {
            setLeads(data ?? [])
          }
        } else if (activeTab === 'opportunities') {
          const { data, error } = await supabase
            .from('crm_opportunities')
            .select('id,name,stage,value_amount,close_date,crm_accounts(name)')
            .order('created_at', { ascending: true })

          if (error && error.code !== '42P01') {
            console.error('Failed to load opportunities', error)
          } else if (isMounted && data) {
            const grouped: Record<string, Opportunity[]> = {}
            STAGES.forEach((stage) => {
              grouped[stage] = []
            })
            ;(data ?? []).forEach((row: any) => {
              const stage = STAGES.includes(row.stage) ? row.stage : 'New'
              if (!grouped[stage]) grouped[stage] = []
              grouped[stage].push({
                id: row.id,
                name: row.name,
                stage,
                value_amount: row.value_amount,
                account_name: row.crm_accounts?.name ?? null,
                close_date: row.close_date,
              })
            })
            setOpportunities(grouped)
          }
        } else if (activeTab === 'quotes' || activeTab === 'follow-ups') {
          const { data, error } = await supabase
            .from('crm_quotes')
            .select('id, status, status_updated_at, currency, totals, created_at, crm_accounts(name)')
            .order('created_at', { ascending: false })

          const errorHasDetails =
            !!error &&
            typeof error === 'object' &&
            !!(
              (error as { message?: string }).message ||
              (error as { code?: string }).code
            )

          if (errorHasDetails) {
            console.error('Failed to load quotes', error)
            if (isMounted) {
              setQuotes([])
              setFollowUps([])
            }
            return
          }

          if (activeTab === 'quotes' && isMounted) {
            const mapped =
              (data ?? []).map((row: any) => {
                const totalsRaw = row.totals
                const totals = totalsRaw ?? {}
                const manufacturingCostValue =
                  totals && typeof totals === 'object' && 'manufacturing_cost' in totals
                    ? Number((totals as any).manufacturing_cost ?? 0)
                    : null
                return {
                  id: row.id,
                  status: row.status,
                  status_updated_at: row.status_updated_at ?? null,
                  currency: row.currency,
                  totals: totalsRaw,
                  created_at: row.created_at,
                  account_name: row.crm_accounts?.name ?? null,
                  manufacturing_cost:
                    manufacturingCostValue !== null && Number.isFinite(manufacturingCostValue)
                      ? manufacturingCostValue
                      : null,
                }
              }) ?? []
            setQuotes(mapped)
          }

          const upcomingThreshold = new Date().toISOString()
          const { data: followData, error: followError } = await supabase
            .from('crm_activities')
            .select(
              `
                id,
                type,
                subject,
                body,
                due_at,
                opp_id,
                crm_opportunities (id, name)
              `
            )
            .not('due_at', 'is', null)
            .eq('done', false)
            .gte('due_at', upcomingThreshold)
            .order('due_at', { ascending: true })
            .limit(10)

          const followErrorHasDetails =
            !!followError &&
            typeof followError === 'object' &&
            !!(
              (followError as { message?: string }).message ||
              (followError as { code?: string }).code
            )

          if (followErrorHasDetails) {
            console.error('Failed to load follow-ups', followError)
            if (isMounted) setFollowUps([])
          } else if (isMounted) {
            const activities = followData ?? []
            const mappedFollowUps = activities.map((activity: any) => {
              const due = activity.due_at ? new Date(activity.due_at) : null
              return {
                id: activity.id,
                opportunity_id: activity.opp_id,
                opportunity_name: activity.crm_opportunities?.name ?? null,
                type: activity.type,
                subject: activity.subject ?? activity.body ?? '',
                due_at: activity.due_at,
                overdue: due ? due.getTime() < Date.now() : false,
              } as FollowUpRow
            })
            setFollowUps(mappedFollowUps)
          }
        } else {
          setFollowUps([])
        }
      } catch (error) {
        console.error('CRM load failed', error)
        if (isMounted) setFollowUps([])
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [activeTab, bypassMode, demoData, supabase])

  const handleOpportunityDragStart = (
    event: React.DragEvent<HTMLButtonElement>,
    opportunity: Opportunity,
    fromStage: string
  ) => {
    event.dataTransfer.setData('text/plain', opportunity.id)
    event.dataTransfer.effectAllowed = 'move'
    setDraggedOpportunity({ id: opportunity.id, fromStage })
  }

  const handleOpportunityDragEnd = () => {
    setDraggedOpportunity(null)
    setDragOverStage(null)
  }

  const handleOpportunityDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    stage: string
  ) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (dragOverStage !== stage) {
      setDragOverStage(stage)
    }
  }

  const handleOpportunityDragLeave = (stage: string) => {
    if (dragOverStage === stage) {
      setDragOverStage(null)
    }
  }

  const handleOpportunityDrop = async (
    event: React.DragEvent<HTMLDivElement>,
    targetStage: string
  ) => {
    event.preventDefault()
    setDragOverStage(null)

    const opportunityId =
      draggedOpportunity?.id || event.dataTransfer.getData('text/plain')
    if (!opportunityId) return

    const sourceStage =
      draggedOpportunity?.fromStage ||
      STAGES.find((stage) =>
        (opportunities[stage] ?? []).some((opp) => opp.id === opportunityId)
      )

    if (!sourceStage || sourceStage === targetStage) {
      setDraggedOpportunity(null)
      return
    }

    const movingOpp = opportunities[sourceStage]?.find(
      (opp) => opp.id === opportunityId
    )

    if (!movingOpp) {
      setDraggedOpportunity(null)
      return
    }

    const previousBoard = JSON.parse(
      JSON.stringify(opportunities)
    ) as Record<string, Opportunity[]>

    const updatedOpp: Opportunity = { ...movingOpp, stage: targetStage }

    setOpportunities((prev) => {
      const next: Record<string, Opportunity[]> = { ...prev }
      next[sourceStage] = (prev[sourceStage] ?? []).filter(
        (opp) => opp.id !== opportunityId
      )
      next[targetStage] = [updatedOpp, ...(prev[targetStage] ?? [])]
      return next
    })

    const bypassMode = (process.env.NEXT_PUBLIC_SUPABASE_BYPASS_AUTH ?? 'true') === 'true'

    if (!bypassMode) {
      const { error } = await supabase
        .from('crm_opportunities')
        .update({ stage: targetStage })
        .eq('id', opportunityId)

      if (error) {
        console.error('Failed to update opportunity stage', error)
        setOpportunities(previousBoard)
        alert('Failed to move opportunity. Please try again.')
      }
    }

    setDraggedOpportunity(null)
  }

  const handleQuotePdf = async (quoteId: string, action: 'view' | 'download') => {
    try {
      setPdfLoadingId(quoteId)
      const { data, error } = await supabase
        .from('crm_quotes')
        .select(
          `
            id,
            currency,
            status,
            notes,
            totals,
            valid_until,
            created_at,
            crm_accounts(name),
            crm_quote_lines(
              description,
              qty,
              uom,
              unit_price,
              discount_pct,
              tax_code
            )
          `
        )
        .eq('id', quoteId)
        .maybeSingle()

      if (error || !data) {
        console.error('Failed to load quote for PDF', error)
        alert('Failed to load quote for PDF')
        return
      }

      const { PDFDocument, StandardFonts } = await import('pdf-lib')
      const pdfDoc = await PDFDocument.create()
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const pageSize: [number, number] = [612, 792]
      let page = pdfDoc.addPage(pageSize)
      const margin = 50
      let { height } = page.getSize()
      let cursorY = height - margin

      const drawText = (
        text: string,
        options: { size?: number; bold?: boolean } = {}
      ) => {
        const size = options.size ?? 12
        const currentFont = options.bold ? boldFont : font
        page.drawText(text, {
          x: margin,
          y: cursorY,
          size,
          font: currentFont,
        })
        cursorY -= size + 6
      }

      const wrapText = (text: string, maxChars: number) => {
        const words = text.split(/\s+/)
        const lines: string[] = []
        let currentLine = ''
        words.forEach((word) => {
          const candidate = currentLine ? `${currentLine} ${word}` : word
          if (candidate.length > maxChars) {
            if (currentLine) lines.push(currentLine)
            currentLine = word
          } else {
            currentLine = candidate
          }
        })
        if (currentLine) lines.push(currentLine)
        return lines
      }

      const drawRowText = (
        lines: string[],
        options: { x: number; y: number; size?: number }
      ) => {
        const size = options.size ?? 11
        lines.forEach((line, idx) => {
          page.drawText(line, {
            x: options.x,
            y: options.y - idx * (size + 2),
            size,
            font,
          })
        })
      }

      drawText('Quote Summary', { size: 18, bold: true })
      drawText(`Quote ID: ${data.id}`)
      if (data.crm_accounts?.name) drawText(`Account: ${data.crm_accounts.name}`)
      drawText(`Status: ${data.status ?? 'draft'}`)
      if (data.valid_until) {
        drawText(
          `Valid Until: ${new Date(data.valid_until).toLocaleDateString()}`
        )
      }
      drawText(
        `Created: ${
          data.created_at
            ? new Date(data.created_at).toLocaleString()
            : 'Unknown'
        }`
      )

      const totals = data.totals ?? {}
      const subtotal = Number(totals.subtotal ?? 0)
      const total = Number(totals.total ?? subtotal)

      drawText('')
      drawText('Totals', { bold: true })
      drawText(`Subtotal: ${formatCurrency(subtotal, data.currency)}`)
      drawText(`Total: ${formatCurrency(total, data.currency)}`)

      if (data.notes) {
        drawText('')
        drawText('Notes', { bold: true })
        wrapText(data.notes, 72).forEach((line) => drawText(line))
      }

      drawText('')
      drawText('Line Items', { bold: true })

      const columnX = {
        description: margin,
        qty: margin + 250,
        unitPrice: margin + 320,
        total: margin + 420,
      }

      page.drawText('Description', {
        x: columnX.description,
        y: cursorY,
        font: boldFont,
        size: 12,
      })
      page.drawText('Qty', {
        x: columnX.qty,
        y: cursorY,
        font: boldFont,
        size: 12,
      })
      page.drawText('Unit Price', {
        x: columnX.unitPrice,
        y: cursorY,
        font: boldFont,
        size: 12,
      })
      page.drawText('Line Total', {
        x: columnX.total,
        y: cursorY,
        font: boldFont,
        size: 12,
      })

      cursorY -= 20

      const lines = data.crm_quote_lines ?? []
      lines.forEach((line: any) => {
        if (cursorY < margin + 60) {
          page = pdfDoc.addPage(pageSize)
          ;({ height } = page.getSize())
          cursorY = height - margin
        }

        const qty = Number(line.qty ?? 0)
        const unitPrice = Number(line.unit_price ?? 0)
        const lineTotal = qty * unitPrice

        const descriptionLines = wrapText(
          line.description ?? 'Line item',
          40
        )
        drawRowText(descriptionLines, {
          x: columnX.description,
          y: cursorY,
        })

        page.drawText(qty.toString(), {
          x: columnX.qty,
          y: cursorY,
          font,
          size: 11,
        })
        page.drawText(unitPrice.toFixed(2), {
          x: columnX.unitPrice,
          y: cursorY,
          font,
          size: 11,
        })
        page.drawText(lineTotal.toFixed(2), {
          x: columnX.total,
          y: cursorY,
          font,
          size: 11,
        })

        cursorY -= descriptionLines.length * 14 + 6

        const metaParts: string[] = []
        if (line.tax_code) metaParts.push(`Tax Code: ${line.tax_code}`)
        if (line.discount_pct != null) {
          metaParts.push(`Discount: ${Number(line.discount_pct).toFixed(2)}%`)
        }
        if (metaParts.length) {
          drawText(metaParts.join(' • '))
        }
      })

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      if (action === 'view') {
        window.open(url, '_blank', 'noopener,noreferrer')
        setTimeout(() => URL.revokeObjectURL(url), 60_000)
      } else {
        const link = document.createElement('a')
        link.href = url
        link.download = `quote_${data.id}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setTimeout(() => URL.revokeObjectURL(url), 60_000)
      }
    } catch (err) {
      console.error('Failed to generate quote PDF', err)
      alert('Failed to generate quote PDF')
    } finally {
      setPdfLoadingId(null)
    }
  }

  // Count metrics for badges
  const newLeadsCount = leads.filter(l => l.status === 'new' || !l.status).length
  const activeOpportunitiesCount = Object.values(opportunities).flat().filter(o =>
    o.stage && !['Won', 'Lost'].includes(o.stage)
  ).length
  const pendingQuotesCount = quotes.filter(q => q.status === 'draft' || q.status === 'sent').length
  const upcomingFollowUpsCount = followUps.filter(f => !f.overdue).length

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="crm" />

      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">CRM</h1>
              <p className="text-gray-600 mt-1">Manage leads, opportunities, and quotes</p>
            </div>

            <button
              onClick={() => {
                if (activeTab === 'leads') router.push('/crm/leads/new')
                else if (activeTab === 'opportunities') router.push('/crm/opportunities/new')
                else if (activeTab === 'quotes') router.push('/crm/quotes/new')
              }}
              className="flex items-center gap-2 bg-[#174940] text-white px-6 py-3 rounded-lg hover:bg-[#0f332c] transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              New {activeTab === 'leads' ? 'Lead' : activeTab === 'opportunities' ? 'Opportunity' : 'Quote'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <button
              onClick={() => {
                setActiveTab('leads');
                router.push('/crm?tab=leads');
              }}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'leads'
                  ? 'border-[#174940] text-[#174940]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Leads
                {newLeadsCount > 0 && (
                  <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                    {newLeadsCount}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => {
                setActiveTab('opportunities');
                router.push('/crm?tab=opportunities');
              }}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'opportunities'
                  ? 'border-[#174940] text-[#174940]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Opportunities
                {activeOpportunitiesCount > 0 && (
                  <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                    {activeOpportunitiesCount}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => {
                setActiveTab('quotes');
                router.push('/crm?tab=quotes');
              }}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'quotes'
                  ? 'border-[#174940] text-[#174940]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Quotes
                {pendingQuotesCount > 0 && (
                  <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                    {pendingQuotesCount}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('follow-ups');
                router.push('/crm?tab=follow-ups');
              }}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'follow-ups'
                  ? 'border-[#174940] text-[#174940]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Follow-ups
                {upcomingFollowUpsCount > 0 && (
                  <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                    {upcomingFollowUpsCount}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-6">
        {activeTab === 'leads' && (
          <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Lead List</h2>
                <p className="text-sm text-gray-500">
                  Capture inbound interest and move qualified leads into opportunities.
                </p>
              </div>
            </div>
            {loading ? (
              <div className="flex h-40 items-center justify-center text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin text-[#174940]" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm text-gray-700">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Lead</th>
                      <th className="px-4 py-3 text-left">Contact</th>
                      <th className="px-4 py-3 text-left">Source</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {leads.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                          No leads yet. Click "New Lead" to get started.
                        </td>
                      </tr>
                    )}
                    {leads.map((lead) => (
                      <tr
                        key={lead.id}
                        className="cursor-pointer bg-white hover:bg-gray-50"
                        onClick={() => router.push(`/crm/leads/${lead.id}`)}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">{lead.name}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-1 text-xs text-gray-600">
                            {lead.email && <p>{lead.email}</p>}
                            {lead.phone && <p>{lead.phone}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3">{lead.source ?? '—'}</td>
                        <td className="px-4 py-3 capitalize">{lead.status ?? 'New'}</td>
                        <td className="px-4 py-3 text-right">
                          {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === 'opportunities' && (
          <>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Track deals through each pipeline stage. Click a card to view details.
              </p>
            </div>
            {loading ? (
              <div className="flex h-40 items-center justify-center text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin text-[#174940]" />
              </div>
            ) : (
              <section className="grid gap-6 overflow-x-auto md:grid-cols-2 xl:grid-cols-6">
                {STAGES.map((stage) => (
                  <div
                    key={stage}
                    className={`flex min-w-[220px] flex-col rounded-lg border bg-white shadow-sm transition ${
                      dragOverStage === stage
                        ? 'border-[#174940] ring-2 ring-[#174940]/60 bg-[#f1f8f6]'
                        : 'border-gray-200'
                    }`}
                    onDragOver={(event) => handleOpportunityDragOver(event, stage)}
                    onDrop={(event) => handleOpportunityDrop(event, stage)}
                    onDragLeave={() => handleOpportunityDragLeave(stage)}
                    onDragEnter={() => setDragOverStage(stage)}
                  >
                    <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
                      {stage}
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-3">
                      {(opportunities[stage] ?? []).length === 0 ? (
                        <p className="text-xs text-gray-400">No deals</p>
                      ) : (
                        opportunities[stage].map((opp) => (
                          <button
                            key={opp.id}
                            draggable
                            onDragStart={(event) => handleOpportunityDragStart(event, opp, stage)}
                            onDragEnd={handleOpportunityDragEnd}
                            onClick={() => {
                              if (draggedOpportunity) return
                              router.push(`/crm/opportunities/${opp.id}`)
                            }}
                            className={`w-full rounded-md border p-3 text-left text-sm shadow-sm transition hover:border-[#174940] ${
                              draggedOpportunity?.id === opp.id
                                ? 'opacity-60 border-dashed'
                                : 'border-gray-200'
                            }`}
                          >
                            <p className="font-semibold text-gray-900">{opp.name}</p>
                            <p className="text-xs text-gray-500">{opp.account_name ?? 'Unassigned Account'}</p>
                            <p className="mt-1 text-xs text-gray-600">
                              ${Number(opp.value_amount ?? 0).toFixed(2)} •{' '}
                              {opp.close_date ? new Date(opp.close_date).toLocaleDateString() : 'No close date'}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </section>
            )}
          </>
        )}

        {activeTab === 'quotes' && (
          <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Quote List</h2>
                <p className="text-sm text-gray-500">
                  Build proposals and convert accepted quotes into sales orders.
                </p>
              </div>
            </div>
            {loading ? (
              <div className="flex h-40 items-center justify-center text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin text-[#174940]" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm text-gray-700">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Quote</th>
                      <th className="px-4 py-3 text-left">Account</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Mfg. Cost</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {quotes.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                          No quotes yet.
                        </td>
                      </tr>
                    )}
                    {quotes.map((quote) => (
                      <tr
                        key={quote.id}
                        className="cursor-pointer bg-white hover:bg-gray-50"
                        onClick={() => router.push(`/crm/quotes/${quote.id}`)}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">Quote #{quote.id.slice(0, 8)}</td>
                        <td className="px-4 py-3">{quote.account_name ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium capitalize text-gray-900">{quote.status ?? 'draft'}</span>
                            <span className="text-xs text-gray-500">
                              {quote.status_updated_at ? `Updated ${formatStatusDate(quote.status_updated_at)}` : 'Status not updated'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(quote.manufacturing_cost, quote.currency)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(quote.totals?.total, quote.currency)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-col items-end gap-2 text-sm">
                            <span className="font-medium text-gray-900">
                              {quote.created_at
                                ? new Date(quote.created_at).toLocaleDateString()
                                : '—'}
                            </span>
                            <button
                              type="button"
                              disabled={pdfLoadingId === quote.id}
                              onClick={(event) => {
                                event.stopPropagation()
                                handleQuotePdf(quote.id, 'view')
                              }}
                              className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {pdfLoadingId === quote.id ? 'Generating…' : 'View PDF'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === 'follow-ups' && (
          <section className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Upcoming Follow-ups</h2>
                <p className="text-sm text-gray-500">
                  Keep track of outreach commitments logged in the opportunities workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/crm?tab=opportunities')}
                className="text-xs font-medium text-[#174940] hover:underline"
              >
                View pipeline
              </button>
            </div>
            {loading ? (
              <div className="flex h-48 items-center justify-center text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin text-[#174940]" />
              </div>
            ) : followUps.length === 0 ? (
              <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500">
                No follow-ups scheduled. Log call or email interactions in opportunities to start seeing reminders here.
              </div>
            ) : (
              <ul className="space-y-3 text-sm text-gray-700">
                {followUps.map((follow) => (
                  <li
                    key={follow.id}
                    className={`rounded-lg border px-4 py-3 shadow-sm transition hover:border-[#174940]/60 hover:bg-gray-50 ${
                      follow.overdue ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs uppercase tracking-wide text-gray-500">
                          {follow.type}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {follow.subject || 'Follow-up task'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push(`/crm/opportunities/${follow.opportunity_id}`)}
                        className="text-xs font-medium text-[#174940] hover:underline"
                      >
                        Open opportunity
                      </button>
                    </div>
                    <div className="mt-2 flex flex-col gap-1 text-xs text-gray-500">
                      <span>
                        {follow.due_at
                          ? new Date(follow.due_at).toLocaleString()
                          : 'No follow-up date scheduled'}
                      </span>
                      <span className="text-gray-600">
                        {follow.opportunity_name || 'Unnamed opportunity'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
