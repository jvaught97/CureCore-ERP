'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createLead, updateLead } from '@/app/crm/_actions'
import { Loader2 } from 'lucide-react'

const leadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  source: z.string().optional(),
  status: z.string().optional(),
  ownerId: z.string().optional(),
  notes: z.string().optional(),
})

type LeadFormValues = z.infer<typeof leadSchema>

export function LeadForm({
  mode,
  leadId,
  defaultValues,
}: {
  mode: 'create' | 'edit'
  leadId?: string
  defaultValues?: Partial<LeadFormValues>
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      source: '',
      status: 'new',
      ownerId: '',
      notes: '',
      ...defaultValues,
    },
  })

  const onSubmit = (values: LeadFormValues) => {
    startTransition(async () => {
      if (mode === 'edit' && leadId) {
        await updateLead(leadId, {
          name: values.name,
          email: values.email || null,
          phone: values.phone || null,
          source: values.source || null,
          status: values.status || null,
          ownerId: values.ownerId || null,
          notes: values.notes || null,
        })
        router.push(`/crm/leads/${leadId}`)
      } else {
        const id = await createLead({
          name: values.name,
          email: values.email || null,
          phone: values.phone || null,
          source: values.source || null,
          status: values.status || null,
          ownerId: values.ownerId || null,
          notes: values.notes || null,
        })
        router.push(`/crm/leads/${id}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Lead Name" error={errors.name?.message}>
          <input
            {...register('name')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            placeholder="Lead name"
          />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input
            {...register('email')}
            type="email"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            placeholder="lead@example.com"
          />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <input
            {...register('phone')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            placeholder="(555) 123-4567"
          />
        </Field>
        <Field label="Source" error={errors.source?.message}>
          <input
            {...register('source')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            placeholder="Website, Referral, ..."
          />
        </Field>
        <Field label="Status" error={errors.status?.message}>
          <select
            {...register('status')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          >
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="converted">Converted</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
        <Field label="Owner" error={errors.ownerId?.message}>
          <input
            {...register('ownerId')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            placeholder="Owner user id"
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
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === 'edit' ? 'Update Lead' : 'Create Lead'}
        </button>
      </div>
    </form>
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
