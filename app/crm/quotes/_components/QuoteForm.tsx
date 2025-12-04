'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createQuote, updateQuote } from '@/app/crm/_actions'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/app/utils/supabase/client'
import { inventoryDemoData } from '@/data/inventoryDemo'

const lineSchema = z.object({
  productId: z.string().uuid({ message: 'Select a product' }),
  qty: z.number().min(0.0001, 'Quantity required'),
  uom: z.string().min(1),
  unitPrice: z.number().min(0, 'Unit price must be positive'),
  discountPct: z.number().optional(),
  taxCode: z.string().optional(),
  showDetails: z.boolean().optional(),
  displayBoxQuantity: z
    .number()
    .min(0, 'Display boxes must be zero or positive')
    .default(0),
})

const quoteSchema = z.object({
  accountId: z.string().uuid({ message: 'Select an account' }),
  currency: z.string().min(1),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected']).optional(),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1, 'Add at least one quote line'),
})

type QuoteFormValues = z.infer<typeof quoteSchema>

type QuoteFormProps = {
  mode: 'create' | 'edit'
  quoteId?: string
  defaultValues?: Partial<QuoteFormValues>
  onCancel?: () => void
}

export function QuoteForm({ mode, quoteId, defaultValues, onCancel }: QuoteFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const supabase = useMemo(() => createClient(), [])
  const bypassMode = useMemo(
    () => (process.env.NEXT_PUBLIC_SUPABASE_BYPASS_AUTH ?? 'true') === 'true',
    [],
  )
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string | null }>>([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [accountsError, setAccountsError] = useState<string | null>(null)
  const [formulations, setFormulations] = useState<
    Array<{ id: string; name: string | null; version: string | null; status: string | null; notes: string | null }>
  >([])
  const [formulationsLoading, setFormulationsLoading] = useState(true)
  const [formulationsError, setFormulationsError] = useState<string | null>(null)

  const formulationMap = useMemo(() => new Map(formulations.map((f) => [f.id, f])), [formulations])

  useEffect(() => {
    let isMounted = true
    const loadAccounts = async () => {
      setAccountsLoading(true)
      try {
        if (bypassMode) {
          if (!isMounted) return
          setAccounts([
            { id: 'acct-demo-1', name: 'Wellness Collective' },
            { id: 'acct-demo-2', name: 'Calm Collective' },
          ])
          setAccountsError(null)
          return
        }

        const { data, error } = await supabase
          .from('crm_accounts')
          .select('id, name')
          .order('name', { ascending: true })

        if (!isMounted) return
        if (error) {
          console.error('Failed to load accounts', error)
          setAccountsError('Unable to load CRM accounts')
          setAccounts([])
        } else {
          setAccounts(data ?? [])
          setAccountsError(null)
        }
      } catch (err) {
        if (!isMounted) return
        console.error('Unexpected error loading accounts', err)
        setAccountsError('Unable to load CRM accounts')
        setAccounts([])
      } finally {
        if (isMounted) setAccountsLoading(false)
      }
    }

    loadAccounts()
    return () => {
      isMounted = false
    }
  }, [bypassMode, supabase])

  useEffect(() => {
    let isMounted = true
    const loadFormulations = async () => {
      setFormulationsLoading(true)
      try {
        if (bypassMode) {
          if (!isMounted) return
          setFormulations(
            inventoryDemoData.ingredients.slice(0, 4).map((ing, idx) => ({
              id: `demo-form-${ing.id}`,
              name: ing.name,
              version: `v${(idx + 1).toFixed(1)}`,
              status: 'approved',
              notes: `Demo quote product ${idx + 1}`,
            })),
          )
          setFormulationsError(null)
          return
        }

        const { data, error } = await supabase
          .from('formulations')
          .select('id, name, version, status, notes')
          .order('name', { ascending: true })

        if (!isMounted) return
        if (error) {
          console.error('Failed to load formulations', error)
          setFormulationsError('Unable to load formulations')
          setFormulations([])
        } else {
          setFormulations(data ?? [])
          setFormulationsError(null)
        }
      } catch (err) {
        if (!isMounted) return
        console.error('Unexpected error loading formulations', err)
        setFormulationsError('Unable to load formulations')
        setFormulations([])
      } finally {
        if (isMounted) setFormulationsLoading(false)
      }
    }

    loadFormulations()
    return () => {
      isMounted = false
    }
  }, [bypassMode, supabase])

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      accountId: '',
      currency: 'USD',
      status: 'draft',
      validUntil: '',
      notes: '',
      lines: defaultValues?.lines ?? [emptyLine()],
      ...defaultValues,
    },
  })
  const { fields, append, remove } = useFieldArray({ name: 'lines', control })

  const onSubmit = (values: QuoteFormValues) => {
    startTransition(async () => {
      const payload = {
        accountId: values.accountId,
        currency: values.currency,
        status: values.status,
        validUntil: values.validUntil ? values.validUntil : null,
        notes: values.notes ?? null,
        lines: values.lines.map((line) => {
          const product = formulationMap.get(line.productId)
          const displayBoxes = Number(line.displayBoxQuantity ?? 0)
          const hasDisplayBox = displayBoxes > 0
          return {
            description: product?.name ?? 'Product',
            qty: line.qty,
            uom: line.uom,
            unitPrice: line.unitPrice,
            discountPct: line.discountPct ?? null,
            taxCode: line.taxCode ?? null,
            skuId: line.productId,
            displayBoxQuantity: hasDisplayBox ? displayBoxes : null,
          }
        }),
      }
      if (mode === 'edit' && quoteId) {
        await updateQuote(quoteId, payload)
        router.push(`/crm/quotes/${quoteId}`)
      } else {
        const id = await createQuote(payload)
        router.push(`/crm/quotes/${id}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Account" error={errors.accountId?.message}>
          <select
            {...register('accountId')}
            disabled={accountsLoading || !!accountsError}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100"
          >
            <option value="">{accountsLoading ? 'Loading accounts...' : 'Select an account'}</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name ? `${account.name}` : account.id}
              </option>
            ))}
          </select>
          {accountsError ? <span className="text-xs text-red-600">{accountsError}</span> : null}
        </Field>
        <Field label="Currency" error={errors.currency?.message}>
          <input
            {...register('currency')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </Field>
        <Field label="Status" error={errors.status?.message}>
          <select
            {...register('status')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </Field>
        <Field label="Valid Until" error={errors.validUntil?.message}>
          <input
            {...register('validUntil')}
            type="date"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </Field>
      </div>
      <Field label="Notes" error={errors.notes?.message}>
        <textarea
          {...register('notes')}
          rows={4}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
        />
      </Field>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Quote Lines</h3>
          <button
            type="button"
            onClick={() => append(emptyLine())}
            className="inline-flex items-center gap-2 rounded-md border border-[#174940] px-3 py-2 text-sm font-semibold text-[#174940] hover:bg-[#174940]/5"
          >
            <Plus className="h-4 w-4" /> Add Line
          </button>
        </div>
        {errors.lines?.message && (
          <p className="text-xs text-red-600">{errors.lines.message}</p>
        )}
        <div className="space-y-3">
          {fields.map((field, index) => {
            const productId = watch(`lines.${index}.productId`)
            const showDetails = watch(`lines.${index}.showDetails`)
            const product = productId ? formulationMap.get(productId) : null
            return (
              <div key={field.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <Field label="Product" error={errors.lines?.[index]?.productId?.message}>
                    <>
                      <select
                        {...register(`lines.${index}.productId`)}
                        disabled={formulationsLoading || !!formulationsError}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100"
                      >
                        <option value="">
                          {formulationsLoading ? 'Loading products...' : 'Select a product'}
                        </option>
                        {formulations.map((formulation) => (
                          <option key={formulation.id} value={formulation.id}>
                            {formulation.name ?? 'Untitled formulation'}
                          </option>
                        ))}
                      </select>
                      {formulationsError ? (
                        <span className="text-xs text-red-600">{formulationsError}</span>
                      ) : null}
                    </>
                  </Field>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="ml-0 inline-flex items-center gap-1 self-start rounded-md border border-transparent px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 md:ml-2"
                  >
                    <Trash2 className="h-4 w-4" /> Remove
                  </button>
                </div>
                <div className="grid gap-3 text-sm text-gray-600 md:grid-cols-4">
                  <Field label="Qty" error={errors.lines?.[index]?.qty?.message}>
                    <input
                      type="number"
                      step="0.01"
                      {...register(`lines.${index}.qty`, { valueAsNumber: true })}
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
                      step="0.01"
                      {...register(`lines.${index}.unitPrice`, { valueAsNumber: true })}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    />
                  </Field>
                  <Field label="Discount %" error={errors.lines?.[index]?.discountPct?.message}>
                    <input
                      type="number"
                      step="0.01"
                      {...register(`lines.${index}.discountPct`, { valueAsNumber: true })}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    />
                  </Field>
                </div>

                <div className="grid gap-3 text-sm text-gray-600 md:grid-cols-2">
                  <Field label="Tax Code" error={errors.lines?.[index]?.taxCode?.message}>
                    <input
                      {...register(`lines.${index}.taxCode`)}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    />
                  </Field>
                  <Field
                    label="Display boxes needed (0 if none)"
                    error={errors.lines?.[index]?.displayBoxQuantity?.message}
                  >
                    <input
                      type="number"
                      min={0}
                      step="1"
                      {...register(`lines.${index}.displayBoxQuantity`, {
                        setValueAs: (val) => {
                          if (val === '' || val === null || val === undefined) return 0
                          const parsed = Number(val)
                          return Number.isNaN(parsed) ? 0 : parsed
                        },
                        valueAsNumber: true,
                      })}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    />
                  </Field>
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    {...register(`lines.${index}.showDetails`)}
                    className="rounded border-gray-300 text-[#174940] focus:ring-[#174940]"
                  />
                  Show product details
                </label>

                {showDetails && product ? (
                  <div className="rounded-md border border-[#174940]/30 bg-white p-3 text-sm text-gray-700">
                    <p className="font-semibold text-gray-900">
                      {product.name ?? 'Untitled formulation'}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium text-gray-600">Version:</span>{' '}
                      {product.version ?? '—'}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium text-gray-600">Status:</span>{' '}
                      {product.status ?? '—'}
                    </p>
                    {product.notes ? (
                      <p className="mt-1 text-gray-600">
                        <span className="font-medium text-gray-600">Notes:</span> {product.notes}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      <div className="flex justify-end gap-3">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === 'edit' ? 'Update Quote' : 'Create Quote'}
        </button>
      </div>
    </form>
  )
}

function emptyLine() {
  return {
    productId: '',
    qty: 1,
    uom: 'unit',
    unitPrice: 0,
    discountPct: 0,
    taxCode: '',
    showDetails: false,
    displayBoxQuantity: 0,
  }
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-gray-600">
      {label}
      {children}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  )
}
