'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createActivity } from '@/app/crm/_actions'
import { Loader2 } from 'lucide-react'

const activitySchema = z.object({
  type: z.enum(['call', 'email', 'meeting', 'task']),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().optional(),
  dueAt: z.string().optional(),
  accountId: z.string().optional(),
  contactId: z.string().optional(),
  oppId: z.string().optional(),
})

type ActivityFormValues = z.infer<typeof activitySchema>

export function ActivityForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      type: 'call',
      subject: '',
      body: '',
      dueAt: '',
      accountId: '',
      contactId: '',
      oppId: '',
    },
  })

  const onSubmit = (values: ActivityFormValues) => {
    startTransition(async () => {
      await createActivity({
        type: values.type,
        subject: values.subject,
        body: values.body || null,
        dueAt: values.dueAt || null,
        accountId: values.accountId || null,
        contactId: values.contactId || null,
        oppId: values.oppId || null,
        done: false,
      })
      router.push('/crm/activities')
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Type" error={errors.type?.message}>
          <select
            {...register('type')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          >
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
            <option value="task">Task</option>
          </select>
        </Field>
        <Field label="Subject" error={errors.subject?.message}>
          <input
            {...register('subject')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </Field>
        <Field label="Due At" error={errors.dueAt?.message}>
          <input
            {...register('dueAt')}
            type="datetime-local"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </Field>
        <Field label="Account ID" error={errors.accountId?.message}>
          <input
            {...register('accountId')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </Field>
        <Field label="Contact ID" error={errors.contactId?.message}>
          <input
            {...register('contactId')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </Field>
        <Field label="Opportunity ID" error={errors.oppId?.message}>
          <input
            {...register('oppId')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </Field>
      </div>
      <Field label="Notes">
        <textarea
          {...register('body')}
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
          Log Activity
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
