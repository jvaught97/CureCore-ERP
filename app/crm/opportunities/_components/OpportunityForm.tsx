'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createOpportunity, updateOpportunity } from '@/app/crm/_actions'
import { Loader2 } from 'lucide-react'

const opportunitySchema = z.object({
  accountId: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  valueAmount: z.string().optional(),
  valueCurrency: z.string().optional(),
  stage: z.string().optional(),
  closeDate: z.string().optional(),
  probabilityPct: z.string().optional(),
})

type OpportunityFormValues = z.infer<typeof opportunitySchema>

export function OpportunityForm({
  mode,
  opportunityId,
  defaultValues,
}: {
  mode: 'create' | 'edit'
  opportunityId?: string
  defaultValues?: Partial<OpportunityFormValues>
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      accountId: '',
      name: '',
      valueAmount: '',
      valueCurrency: 'USD',
      stage: 'New',
      closeDate: '',
      probabilityPct: '',
      ...defaultValues,
    },
  })

  const onSubmit = (values: OpportunityFormValues) => {
    startTransition(async () => {
      const payload = {
        accountId: values.accountId || null,
        name: values.name,
        valueAmount: values.valueAmount ? Number(values.valueAmount) : null,
        valueCurrency: values.valueCurrency || 'USD',
        stage: values.stage || 'New',
        closeDate: values.closeDate || null,
        probabilityPct: values.probabilityPct ? Number(values.probabilityPct) : null,
      }
      if (mode === 'edit' && opportunityId) {
        await updateOpportunity(opportunityId, payload)
      } else {
        await createOpportunity(payload)
      }
      router.push('/crm/opportunities')
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Opportunity Name" error={errors.name?.message}>
          <input
            {...register('name')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </Field>
        <Field label="Account ID" error={errors.accountId?.message}>
          <input
            {...register('accountId')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </Field>
        <Field label="Value" error={errors.valueAmount?.message}>
          <input
            {...register('valueAmount')}
            type="number"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </Field>
        <Field label="Currency" error={errors.valueCurrency?.message}>
          <input
            {...register('valueCurrency')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </Field>
        <Field label="Stage" error={errors.stage?.message}>
          <select
            {...register('stage')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          >
            {['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'].map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Probability %" error={errors.probabilityPct?.message}>
          <input
            {...register('probabilityPct')}
            type="number"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </Field>
        <Field label="Close Date" error={errors.closeDate?.message}>
          <input
            {...register('closeDate')}
            type="date"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </Field>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === 'edit' ? 'Update Opportunity' : 'Create Opportunity'}
        </button>
      </div>
    </form>
  )
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
