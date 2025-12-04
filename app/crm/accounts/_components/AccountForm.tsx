'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createAccount, updateAccount } from '@/app/crm/_actions'
import { Loader2 } from 'lucide-react'

const accountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  phone: z.string().optional(),
  notes: z.string().optional(),
})

type AccountFormValues = z.infer<typeof accountSchema>

export function AccountForm({
  mode,
  accountId,
  defaultValues,
}: {
  mode: 'create' | 'edit'
  accountId?: string
  defaultValues?: Partial<AccountFormValues>
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      website: '',
      phone: '',
      notes: '',
      ...defaultValues,
    },
  })

  const onSubmit = (values: AccountFormValues) => {
    startTransition(async () => {
      if (mode === 'edit' && accountId) {
        await updateAccount(accountId, {
          name: values.name,
          website: values.website || null,
          phone: values.phone || null,
          notes: values.notes || null,
        })
        router.push(`/crm/accounts/${accountId}`)
      } else {
        const id = await createAccount({
          name: values.name,
          website: values.website || null,
          phone: values.phone || null,
          notes: values.notes || null,
        })
        router.push(`/crm/accounts/${id}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Account Name" error={errors.name?.message}>
          <input
            {...register('name')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </Field>
        <Field label="Website" error={errors.website?.message}>
          <input
            {...register('website')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            placeholder="https://example.com"
          />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <input
            {...register('phone')}
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
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === 'edit' ? 'Update Account' : 'Create Account'}
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
