'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { AppNav } from '@/components/nav/AppNav'
import { createClient } from '@/app/utils/supabase/client'
import { Download, FileText, Save, RefreshCw, TrendingUpDown } from 'lucide-react'

type ManualInputs = {
  marketing: string
  rnd: string
  equipment: string
}

type ManualInputsNumeric = {
  marketing: number
  rnd: number
  equipment: number
}

type PnlSummary = {
  revenue: number
  cogm: number
  finishedGoodsDelta: number
}

type PnlRow = {
  key: string
  label: string
  value: number
  emphasis?: boolean
}

const DEFAULT_MANUAL_INPUTS: ManualInputs = {
  marketing: '',
  rnd: '',
  equipment: '',
}

const DEFAULT_SUMMARY: PnlSummary = {
  revenue: 0,
  cogm: 0,
  finishedGoodsDelta: 0,
}

function isInformationalError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const err = error as { code?: string | null; message?: string | null }
  if (err.code === '42P01' || err.code === 'PGRST116') {
    // Supabase returns these when tables/views are missing or optional
    return true
  }
  if (!err.code) {
    const hasMessage = typeof err.message === 'string' && err.message.trim().length > 0
    if (!hasMessage) return true
  }
  if (Object.keys(err).length === 0) return true
  return false
}

export default function PnlPage() {
  const supabase = useMemo(() => createClient(), [])
  const bypassMode = useRef((process.env.NEXT_PUBLIC_SUPABASE_BYPASS_AUTH ?? 'true') === 'true').current
  const today = useMemo(() => new Date(), [])
  const currentMonth = useMemo(() => {
    const month = today.getMonth() + 1
    return `${today.getFullYear()}-${String(month).padStart(2, '0')}`
  }, [today])

  const [month, setMonth] = useState(currentMonth)
  const [filters, setFilters] = useState<{ division: string; customer: string }>({
    division: 'all',
    customer: 'all',
  })
  const [manualInputs, setManualInputs] = useState<ManualInputs>(DEFAULT_MANUAL_INPUTS)
  const [manualInputsNumeric, setManualInputsNumeric] = useState<ManualInputsNumeric>({
    marketing: 0,
    rnd: 0,
    equipment: 0,
  })
  const [summary, setSummary] = useState<PnlSummary>(DEFAULT_SUMMARY)
  const [loading, setLoading] = useState(true)
  const [saving, startSaving] = useTransition()
  const [exporting, startExport] = useTransition()
  const [packGenerating, startPack] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  const derived = useMemo(() => {
    const revenue = summary.revenue
    const cogm = summary.cogm
    const finishedGoodsDelta = summary.finishedGoodsDelta
    const cogs = cogm + finishedGoodsDelta
    const grossProfit = revenue - cogs
    const opEx =
      manualInputsNumeric.marketing + manualInputsNumeric.rnd + manualInputsNumeric.equipment
    const operatingIncome = grossProfit - opEx

    const rows: PnlRow[] = [
      { key: 'revenue', label: 'Revenue', value: revenue, emphasis: true },
      { key: 'cogm', label: 'Cost of Goods Manufactured (COGM)', value: -cogm },
      { key: 'fgDelta', label: 'Finished Goods Delta', value: -finishedGoodsDelta },
      { key: 'cogs', label: 'Cost of Goods Sold (COGS)', value: -cogs, emphasis: true },
      { key: 'grossProfit', label: 'Gross Profit', value: grossProfit, emphasis: true },
      { key: 'marketing', label: 'OpEx — Marketing', value: -manualInputsNumeric.marketing },
      { key: 'rnd', label: 'OpEx — R&D', value: -manualInputsNumeric.rnd },
      { key: 'equipment', label: 'OpEx — Equipment', value: -manualInputsNumeric.equipment },
      { key: 'operatingIncome', label: 'Operating Income', value: operatingIncome, emphasis: true },
    ]

    return { rows, grossProfit, operatingIncome }
  }, [summary, manualInputsNumeric])

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      setLoading(true)
      setMessage(null)
      try {
        if (bypassMode) {
          if (!isMounted) return
          const demoManual = {
            marketing: 12000,
            rnd: 8000,
            equipment: 3500,
          }
          setManualInputs({
            marketing: demoManual.marketing.toString(),
            rnd: demoManual.rnd.toString(),
            equipment: demoManual.equipment.toString(),
          })
          setManualInputsNumeric(demoManual)
          setSummary({
            revenue: 185000,
            cogm: 92000,
            finishedGoodsDelta: 5500,
          })
          setLoading(false)
          return
        }

        const manualPromise = supabase
          .from('pnl_manual_inputs')
          .select('marketing,rnd,equipment')
          .eq('month', `${month}-01`)
          .maybeSingle()

        const summaryPromise = supabase
          .from('pnl_monthly_summary')
          .select('revenue,cogm,finished_goods_delta')
          .eq('month', `${month}-01`)
          .maybeSingle()

        const [{ data: manualData, error: manualError }, { data: summaryData, error: summaryError }] =
          await Promise.all([manualPromise, summaryPromise])

        const manualTableMissing = manualError?.code === '42P01'
        const summaryTableMissing = summaryError?.code === '42P01'

        if (manualError && !isInformationalError(manualError) && manualError.code !== 'PGRST116' && manualError.code !== '42P01') {
          throw manualError
        }
        if (summaryError && !isInformationalError(summaryError) && summaryError.code !== 'PGRST116' && summaryError.code !== '42P01') {
          throw summaryError
        }

        if (!isMounted) return

        const inputsNumeric: ManualInputsNumeric = {
          marketing: manualTableMissing ? 0 : manualData?.marketing ?? 0,
          rnd: manualTableMissing ? 0 : manualData?.rnd ?? 0,
          equipment: manualTableMissing ? 0 : manualData?.equipment ?? 0,
        }
        setManualInputs({
          marketing: manualTableMissing ? '' : manualData?.marketing?.toString() ?? '',
          rnd: manualTableMissing ? '' : manualData?.rnd?.toString() ?? '',
          equipment: manualTableMissing ? '' : manualData?.equipment?.toString() ?? '',
        })
        setManualInputsNumeric(inputsNumeric)
        setSummary({
          revenue: summaryTableMissing ? 0 : summaryData?.revenue ?? 0,
          cogm: summaryTableMissing ? 0 : summaryData?.cogm ?? 0,
          finishedGoodsDelta: summaryTableMissing ? 0 : summaryData?.finished_goods_delta ?? 0,
        })
      } catch (err) {
        if (isInformationalError(err)) {
          console.info('P&L data not available yet.')
        } else {
          console.error('Failed to load P&L data:', err)
        }
        if (isMounted) setMessage('Unable to load P&L data. Showing the latest available inputs.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, supabase, filters])

  const handleManualInputChange = (field: keyof ManualInputs, value: string) => {
    setManualInputs((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleApplyManualInputs = () => {
    const parsed: ManualInputsNumeric = {
      marketing: parseFloat(manualInputs.marketing || '0') || 0,
      rnd: parseFloat(manualInputs.rnd || '0') || 0,
      equipment: parseFloat(manualInputs.equipment || '0') || 0,
    }
    setManualInputsNumeric(parsed)
  }

  const handleSave = () => {
    startSaving(async () => {
      try {
        const parsed: ManualInputsNumeric = {
          marketing: parseFloat(manualInputs.marketing || '0') || 0,
          rnd: parseFloat(manualInputs.rnd || '0') || 0,
          equipment: parseFloat(manualInputs.equipment || '0') || 0,
        }

        const { error } = await supabase.from('pnl_manual_inputs').upsert({
          month: `${month}-01`,
          marketing: parsed.marketing,
          rnd: parsed.rnd,
          equipment: parsed.equipment,
        })

        if (error) throw error

        setManualInputsNumeric(parsed)
        setMessage('Manual inputs saved.')
      } catch (err) {
        console.error('Failed to save manual inputs:', err)
        setMessage('Saving failed. Please try again.')
      }
    })
  }

  const handleExport = (format: 'csv' | 'json') => {
    startExport(async () => {
      try {
        const payload = {
          month,
          rows: derived.rows,
          manualInputs: manualInputsNumeric,
        }
        const dataString =
          format === 'json' ? JSON.stringify(payload, null, 2) : exportAsCsv(payload)

        const mime = format === 'json' ? 'application/json' : 'text/csv'
        const blob = new Blob([dataString], { type: mime })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = format === 'json' ? `pnl_${month}.json` : `pnl_${month}.csv`
        link.click()
        URL.revokeObjectURL(url)
      } catch (err) {
        console.error('Export failed:', err)
        setMessage('Export failed. Please retry.')
      }
    })
  }

  const handleManagementPack = () => {
    startPack(async () => {
      try {
        const { PDFDocument, StandardFonts } = await import('pdf-lib')
        const pdfDoc = await PDFDocument.create()
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
        let page = pdfDoc.addPage([612, 792])
        let cursorY = 760

        const ensureSpace = (required: number) => {
          if (cursorY - required < 60) {
            page = pdfDoc.addPage([612, 792])
            cursorY = 760
          }
        }

        const drawLine = (text: string, size = 11) => {
          ensureSpace(size + 4)
          page.drawText(text, { x: 48, y: cursorY, size, font })
          cursorY -= size + 4
        }

        drawLine(`Management Pack — ${month}`, 14)
        cursorY -= 6
        drawLine('Income Statement Snapshot', 12)
        derived.rows.forEach((row) => {
          drawLine(`${row.label}: ${formatCurrency(row.value)}`, 10)
        })

        cursorY -= 8
        drawLine('Manual Inputs', 12)
        drawLine(`Marketing: ${formatCurrency(manualInputsNumeric.marketing)}`, 10)
        drawLine(`R&D: ${formatCurrency(manualInputsNumeric.rnd)}`, 10)
        drawLine(`Equipment: ${formatCurrency(manualInputsNumeric.equipment)}`, 10)

        cursorY -= 8
        drawLine('Batch, COA & Cost Lineage Checklist', 12)
        drawLine('• Pending batches cleared for month end', 10)
        drawLine('• COAs uploaded for every completed batch', 10)
        drawLine('• Material & packaging costs trace back to approved sources', 10)

        cursorY -= 8
        drawLine('Next Actions', 12)
        drawLine('• Run completeness check from dashboard banner', 10)
        drawLine('• Attach supporting CSV exports to this PDF before circulation', 10)

        const pdfBytes = await pdfDoc.save()
        const blob = new Blob([pdfBytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `management-pack_${month}.pdf`
        link.click()
        URL.revokeObjectURL(url)
      } catch (err) {
        console.error('Management Pack export failed:', err)
        setMessage('Management Pack export failed. Please try again.')
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="pnl" />
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6 lg:flex-row">
        <section className="flex-1 space-y-6">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Monthly P&amp;L</h1>
              <p className="text-sm text-gray-600">
                Review profitability trends, update month-end inputs, and download finance packs.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                Month
                <input
                  type="month"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm"
                />
              </label>
              <select
                value={filters.division}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, division: event.target.value }))
                }
                className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm"
              >
                <option value="all">All Divisions</option>
                <option value="consumer">Consumer</option>
                <option value="wholesale">Wholesale</option>
              </select>
              <select
                value={filters.customer}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, customer: event.target.value }))
                }
                className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm"
              >
                <option value="all">All Customers</option>
                <option value="top10">Top 10</option>
                <option value="new">New Launches</option>
              </select>
            </div>
          </header>

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Income Statement</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleExport('csv')}
                  disabled={exporting}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                >
                  <Download className="h-4 w-4" />
                  {exporting ? 'Exporting…' : 'Export Monthly P&L'}
                </button>
                <button
                  onClick={handleManagementPack}
                  disabled={packGenerating}
                  className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  <FileText className="h-4 w-4" />
                  {packGenerating ? 'Generating…' : 'Management Pack PDF'}
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              {message && (
                <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {message}
                </div>
              )}
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="h-10 animate-pulse rounded bg-gray-100" />
                  ))}
                </div>
              ) : (
                <table className="w-full text-sm text-gray-800">
                  <tbody>
                    {derived.rows.map((row) => (
                      <tr key={row.key} className="border-b border-gray-100 last:border-0">
                        <td
                          className={`py-3 ${
                            row.emphasis ? 'font-semibold text-gray-900' : 'text-gray-600'
                          }`}
                        >
                          {row.label}
                        </td>
                        <td
                          className={`py-3 text-right ${
                            row.emphasis ? 'font-semibold text-gray-900' : 'text-gray-700'
                          }`}
                        >
                          {formatCurrency(row.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Month-End Manual Inputs</h2>
              <p className="text-sm text-gray-500">
                Capture marketing spend, R&amp;D capitalization, and equipment leases. These values
                feed both the dashboard banner and P&amp;L.
              </p>
            </div>
            <div className="space-y-4 px-6 py-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <ManualInputField
                  label="Marketing"
                  value={manualInputs.marketing}
                  onChange={(value) => handleManualInputChange('marketing', value)}
                />
                <ManualInputField
                  label="R&D"
                  value={manualInputs.rnd}
                  onChange={(value) => handleManualInputChange('rnd', value)}
                />
                <ManualInputField
                  label="Equipment"
                  value={manualInputs.equipment}
                  onChange={(value) => handleManualInputChange('equipment', value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleApplyManualInputs}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Apply to Preview
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving…' : 'Save Inputs'}
                </button>
              </div>
            </div>
          </section>
        </section>

        <aside className="w-full max-w-sm space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-5 py-4">
              <h3 className="text-base font-semibold text-gray-900">Std vs Actual</h3>
              <p className="text-sm text-gray-500">
                Compare expected costs to actuals for materials, labor, and overhead.
              </p>
            </div>
            <div className="space-y-4 px-5 py-4 text-sm">
              <StdActualRow label="Materials" std={formatCurrency(summary.cogm)} actual={formatCurrency(summary.cogm * 1.05)} />
              <StdActualRow label="Labor" std={formatCurrency(summary.cogm * 0.2)} actual={formatCurrency(summary.cogm * 0.22)} />
              <StdActualRow label="Overhead" std={formatCurrency(summary.cogm * 0.15)} actual={formatCurrency(summary.cogm * 0.18)} />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-5 py-4">
              <h3 className="text-base font-semibold text-gray-900">Break-Even Calculator</h3>
              <p className="text-sm text-gray-500">
                Adjust assumptions to understand unit targets for profitability.
              </p>
            </div>
            <BreakEvenCalculator grossProfit={derived.grossProfit} operatingIncome={derived.operatingIncome} />
          </div>

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-5 py-4">
              <h3 className="text-base font-semibold text-gray-900">What-if Scenarios</h3>
              <p className="text-sm text-gray-500">
                Explore the impact of price or spend changes before releasing finance decks.
              </p>
            </div>
            <WhatIfPanel manualInputs={manualInputsNumeric} summary={summary} />
          </div>
        </aside>
      </main>
    </div>
  )
}

function ManualInputField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-gray-600">
      {label}
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="0.00"
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#174940] focus:outline-none"
      />
    </label>
  )
}

function StdActualRow({ label, std, actual }: { label: string; std: string; actual: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <p className="text-xs uppercase text-gray-400">{label}</p>
        <p className="font-semibold text-gray-900">{std}</p>
      </div>
      <div>
        <p className="text-xs uppercase text-gray-400">Actual</p>
        <p className="font-semibold text-[#B45309]">{actual}</p>
      </div>
    </div>
  )
}

function BreakEvenCalculator({
  grossProfit,
  operatingIncome,
}: {
  grossProfit: number
  operatingIncome: number
}) {
  const [price, setPrice] = useState(20)
  const [variableCost, setVariableCost] = useState(8)
  const [fixedCost, setFixedCost] = useState(Math.max(grossProfit - operatingIncome, 1))

  const contribution = useMemo(() => Math.max(price - variableCost, 0.01), [price, variableCost])
  const units = Math.ceil(fixedCost / contribution)

  return (
    <div className="space-y-4 px-5 py-4 text-sm">
      <div className="flex flex-col gap-1">
        <label className="font-medium text-gray-700">Avg. Unit Price</label>
        <input
          type="number"
          value={price}
          onChange={(event) => setPrice(Number(event.target.value))}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="font-medium text-gray-700">Variable Cost / Unit</label>
        <input
          type="number"
          value={variableCost}
          onChange={(event) => setVariableCost(Number(event.target.value))}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="font-medium text-gray-700">Fixed Costs</label>
        <input
          type="number"
          value={fixedCost}
          onChange={(event) => setFixedCost(Number(event.target.value))}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
        <p className="text-xs uppercase text-gray-400">Break-even units</p>
        <p className="text-xl font-semibold text-gray-900">{units.toLocaleString()}</p>
      </div>
    </div>
  )
}

function WhatIfPanel({
  manualInputs,
  summary,
}: {
  manualInputs: ManualInputsNumeric
  summary: PnlSummary
}) {
  const [priceLift, setPriceLift] = useState(5)
  const [marketingChange, setMarketingChange] = useState(10)

  const projectedRevenue = useMemo(() => {
    const delta = (priceLift / 100) * summary.revenue
    return summary.revenue + delta
  }, [priceLift, summary.revenue])

  const projectedMarketing = useMemo(() => {
    const delta = (marketingChange / 100) * manualInputs.marketing
    return manualInputs.marketing + delta
  }, [marketingChange, manualInputs.marketing])

  const projectedOperatingIncome = useMemo(() => {
    const cogs = summary.cogm + summary.finishedGoodsDelta
    const gross = projectedRevenue - cogs
    const opEx = projectedMarketing + manualInputs.rnd + manualInputs.equipment
    return gross - opEx
  }, [projectedRevenue, projectedMarketing, manualInputs, summary])

  return (
    <div className="space-y-4 px-5 py-4 text-sm">
      <div>
        <label className="flex items-center justify-between text-gray-700">
          Price Lift (%)
          <input
            type="number"
            value={priceLift}
            onChange={(event) => setPriceLift(Number(event.target.value))}
            className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
        </label>
      </div>
      <div>
        <label className="flex items-center justify-between text-gray-700">
          Marketing Change (%)
          <input
            type="number"
            value={marketingChange}
            onChange={(event) => setMarketingChange(Number(event.target.value))}
            className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
        </label>
      </div>
      <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
        <div className="flex items-center justify-between">
          <span>Projected Revenue</span>
          <span className="font-semibold text-gray-900">{formatCurrency(projectedRevenue)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span>Projected Marketing</span>
          <span className="font-semibold text-gray-900">{formatCurrency(projectedMarketing)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 font-medium text-gray-800">
            Projected Operating Income
            <TrendingUpDown className="h-4 w-4 text-[#174940]" />
          </span>
          <span className="font-semibold text-[#174940]">{formatCurrency(projectedOperatingIncome)}</span>
        </div>
      </div>
    </div>
  )
}

function formatCurrency(amount: number) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
  return formatter.format(amount)
}

function exportAsCsv(payload: { month: string; rows: PnlRow[]; manualInputs: ManualInputsNumeric }) {
  const headers = ['Row', 'Value']
  const dataRows = payload.rows.map((row) => [row.label, row.value.toString()])
  const manualRows = [
    ['Marketing', payload.manualInputs.marketing.toString()],
    ['R&D', payload.manualInputs.rnd.toString()],
    ['Equipment', payload.manualInputs.equipment.toString()],
  ]
  const csvLines = [headers.join(',')]
    .concat(dataRows.map((cells) => cells.join(',')))
    .concat([''])
    .concat(manualRows.map((cells) => cells.join(',')))
  return csvLines.join('\n')
}
