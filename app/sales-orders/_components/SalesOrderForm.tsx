'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/app/utils/supabase/client'
import {
  createSalesOrder,
  moveSalesOrderToStatus,
  updateSalesOrder,
  type SalesOrderPayload,
} from '@/app/sales-orders/_actions'
import { ArrowLeft, Download, Loader2, Plus, Trash2 } from 'lucide-react'

const lineSchema = z.object({
  skuId: z.string().optional(),
  description: z.string().min(1, 'Description required'),
  qtyOrdered: z
    .string()
    .min(1, 'Quantity required')
    .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, 'Quantity must be greater than zero'),
  uom: z.string().min(1, 'Unit required'),
  unitPrice: z
    .string()
    .min(1, 'Unit price required')
    .refine((val) => !Number.isNaN(Number(val)) && Number(val) >= 0, 'Unit price must be zero or greater'),
  discountPct: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!Number.isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100),
      'Discount must be between 0 and 100',
    ),
  taxCode: z.string().optional(),
})

const salesOrderSchema = z.object({
  quoteId: z.string().optional().or(z.literal('')),
  accountId: z.string().optional().or(z.literal('')),
  currency: z.string().min(1, 'Currency required'),
  status: z.enum(['draft', 'confirmed', 'picking', 'shipped', 'closed']).default('draft'),
  notes: z.string().optional().or(z.literal('')),
  lines: z.array(lineSchema).min(1, 'Add at least one line item'),
})

type SalesOrderFormValues = z.infer<typeof salesOrderSchema>

type SalesOrderFormProps = {
  mode: 'create' | 'edit'
  orderId?: string
  initialState?: {
    quoteId?: string | null
    accountId?: string | null
    currency?: string | null
    status?: string
    notes?: string | null
    lines?: Array<{
      sku_id: string | null
      description: string | null
      qty_ordered: number | null
      uom: string | null
      unit_price: number | null
      discount_pct: number | null
      tax_code: string | null
    }>
  }
}

type QuotePayload = {
  id: string
  account_id: string | null
  currency: string | null
  crm_quote_lines: Array<{
    sku_id: string | null
    description: string | null
    qty: number | null
    uom: string | null
    unit_price: number | null
    discount_pct: number | null
    tax_code: string | null
  }>
}

const emptyLine = () => ({
  skuId: '',
  description: '',
  qtyOrdered: '',
  uom: 'unit',
  unitPrice: '',
  discountPct: '',
  taxCode: '',
})

function mapLines(initial?: SalesOrderFormProps['initialState']['lines']) {
  if (!initial || initial.length === 0) return [emptyLine()]
  return initial.map((line) => ({
    skuId: line.sku_id ?? '',
    description: line.description ?? '',
    qtyOrdered: line.qty_ordered != null ? String(line.qty_ordered) : '',
    uom: line.uom ?? 'unit',
    unitPrice: line.unit_price != null ? String(line.unit_price) : '',
    discountPct: line.discount_pct != null ? String(line.discount_pct) : '',
    taxCode: line.tax_code ?? '',
  }))
}

export function SalesOrderForm({ mode, orderId, initialState }: SalesOrderFormProps) {
  const supabase = useMemo(() => createClient(), [])
  const params = useSearchParams()
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [saving, startSaving] = useTransition()
  const [statusUpdating, setStatusUpdating] = useState(false)

  const quoteParam = params?.get('fromQuote') ?? ''

  const defaultValues = useMemo<SalesOrderFormValues>(
    () => ({
      quoteId: initialState?.quoteId ?? quoteParam ?? '',
      accountId: initialState?.accountId ?? '',
      currency: initialState?.currency ?? 'USD',
      status: (initialState?.status as SalesOrderFormValues['status']) ?? 'draft',
      notes: initialState?.notes ?? '',
      lines: mapLines(initialState?.lines),
    }),
    [initialState, quoteParam],
  )

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SalesOrderFormValues>({
    resolver: zodResolver(salesOrderSchema),
    defaultValues,
  })

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'lines',
  })

  const status = watch('status')
  const quoteId = watch('quoteId')

  useEffect(() => {
    if (mode === 'create' && quoteParam) {
      loadQuote(quoteParam)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadQuote = async (quote: string) => {
    if (!quote) return
    setLoadingQuote(true)
    setMessage(null)
    try {
      const { data, error } = await supabase
        .from('crm_quotes')
        .select(
          `id,account_id,currency,crm_quote_lines (sku_id,description,qty,uom,unit_price,discount_pct,tax_code)`,
        )
        .eq('id', quote)
        .maybeSingle()

      if (error) {
        console.error('Failed to load quote', error)
        setMessage('Unable to load quote. Check permissions.')
        return
      }
      if (!data) {
        setMessage('Quote not found or inaccessible.')
        return
      }
      hydrateFromQuote(data as QuotePayload)
    } catch (err) {
      console.error('Unexpected quote load error', err)
      setMessage('Unexpected error loading quote.')
    } finally {
      setLoadingQuote(false)
    }
  }

  const hydrateFromQuote = (quote: QuotePayload) => {
    const existing = watch()
    reset({
      ...existing,
      quoteId: quote.id,
      accountId: quote.account_id ?? '',
      currency: quote.currency ?? existing.currency,
      lines:
        quote.crm_quote_lines.length > 0
          ? quote.crm_quote_lines.map((line) => ({
              skuId: line.sku_id ?? '',
              description: line.description ?? '',
              qtyOrdered: line.qty != null ? String(line.qty) : '',
              uom: line.uom ?? 'unit',
              unitPrice: line.unit_price != null ? String(line.unit_price) : '',
              discountPct: line.discount_pct != null ? String(line.discount_pct) : '',
              taxCode: line.tax_code ?? '',
            }))
          : [emptyLine()],
    })
    setMessage('Quote imported. Review and save to persist changes.')
  }

  const onSubmit = (values: SalesOrderFormValues) => {
    setMessage(null)
    const payload: SalesOrderPayload = {
      quoteId: values.quoteId?.trim() ? values.quoteId.trim() : null,
      accountId: values.accountId?.trim() ? values.accountId.trim() : null,
      currency: values.currency.trim(),
      status: values.status,
      notes: values.notes?.trim() ? values.notes.trim() : undefined,
      lines: values.lines.map((line) => ({
        skuId: line.skuId?.trim() ? line.skuId.trim() : undefined,
        description: line.description.trim(),
        qtyOrdered: Number(line.qtyOrdered),
        uom: line.uom.trim(),
        unitPrice: Number(line.unitPrice),
        discountPct: line.discountPct ? Number(line.discountPct) : null,
        taxCode: line.taxCode?.trim() ? line.taxCode.trim() : null,
      })),
    }

    startSaving(async () => {
      try {
        if (mode === 'edit' && orderId) {
          await updateSalesOrder(orderId, payload)
          router.push(`/sales-orders/${orderId}`)
        } else {
          const id = await createSalesOrder(payload)
          router.push(`/sales-orders/${id}`)
        }
      } catch (err) {
        console.error('Failed to save sales order', err)
        setMessage('Failed to save sales order. Please try again.')
      }
    })
  }

  const handleStatusChange = async (nextStatus: SalesOrderPayload['status']) => {
    if (mode !== 'edit' || !orderId) return
    setStatusUpdating(true)
    try {
      await moveSalesOrderToStatus(orderId, nextStatus)
      setValue('status', nextStatus, { shouldDirty: false })
    } catch (err) {
      console.error('Status update failed', err)
      setMessage('Unable to update status.')
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleRemoveLine = (index: number) => {
    if (fields.length === 1) return
    remove(index)
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <button
          onClick={() => router.push('/sales-orders')}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#174940] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sales Orders
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold text-gray-900">
            {mode === 'edit' ? `Sales Order ${orderId?.slice(0, 8)}` : 'New Sales Order'}
          </h1>
          {mode === 'edit' && (
            <div className="flex gap-2">
              {['draft', 'confirmed', 'picking', 'shipped', 'closed'].map((state) => (
                <button
                  key={state}
                  onClick={() => handleStatusChange(state as SalesOrderPayload['status'])}
                  className={`rounded-md border px-2 py-1 text-xs font-semibold capitalize transition ${
                    status === state ? 'border-[#174940] bg-[#174940]/10 text-[#174940]' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  disabled={statusUpdating}
                >
                  {state}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {message && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-gray-600">
              Quote (optional)
              <div className="flex gap-2">
                <input
                  {...register('quoteId')}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  placeholder="Quote ID"
                />
                <button
                  type="button"
                  onClick={() => loadQuote(quoteId ?? '')}
                  disabled={!quoteId || loadingQuote}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {loadingQuote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Import
                </button>
              </div>
              <span className="text-xs text-gray-500">Import quote lines to pre-fill the sales order.</span>
            </label>
            <Field label="Account ID" error={errors.accountId?.message}>
              <input
                {...register('accountId')}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                placeholder="Account ID"
              />
            </Field>
            <Field label="Currency" error={errors.currency?.message}>
              <input
                {...register('currency')}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </Field>
            <Field label="Notes" error={errors.notes?.message}>
              <textarea
                {...register('notes')}
                rows={3}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
            <button
              type="button"
              onClick={() => append(emptyLine())}
              className="inline-flex items-center gap-2 rounded-md border border-[#174940] px-3 py-2 text-sm font-semibold text-[#174940] hover:bg-[#174940]/5"
            >
              <Plus className="h-4 w-4" />
              Add Line
            </button>
          </div>
          {(errors.lines as { message?: string } | undefined)?.message && (
            <p className="text-xs text-red-600">{(errors.lines as { message?: string }).message}</p>
          )}
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex justify-between gap-2">
                  <Field label="Description" error={errors.lines?.[index]?.description?.message}>
                    <input
                      {...register(`lines.${index}.description`)}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={() => handleRemoveLine(index)}
                    className="inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" /> Remove
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-5 text-sm text-gray-600">
                  <Field label="SKU" error={errors.lines?.[index]?.skuId?.message}>
                    <input
                      {...register(`lines.${index}.skuId`)}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    />
                  </Field>
                  <Field label="Quantity" error={errors.lines?.[index]?.qtyOrdered?.message}>
                    <input
                      type="number"
                      {...register(`lines.${index}.qtyOrdered`)}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    />
                  </Field>
                  <Field label="UOM" error={errors.lines?.[index]?.uom?.message}>
                    <input
                      {...register(`lines.${index}.uom`)}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    />
                  </Field>
                  <Field label="Unit Price" error={errors.lines?.[index]?.unitPrice?.message}>
                    <input
                      type="number"
                      {...register(`lines.${index}.unitPrice`)}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    />
                  </Field>
                  <Field label="Discount %" error={errors.lines?.[index]?.discountPct?.message}>
                    <input
                      type="number"
                      {...register(`lines.${index}.discountPct`)}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    />
                  </Field>
                  <Field label="Tax Code" error={errors.lines?.[index]?.taxCode?.message}>
                    <input
                      {...register(`lines.${index}.taxCode`)}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === 'edit' ? 'Update Sales Order' : 'Create Sales Order'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-gray-600">
      {label}
      {children}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  )
}
