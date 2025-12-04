'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createContact, updateContact } from '@/app/crm/_actions'
import { Loader2 } from 'lucide-react'

const contactSchema = z.object({
  accountId: z.string().optional(),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  title: z.string().optional(),
})

type ContactFormValues = z.infer<typeof contactSchema>

export function ContactForm({
  mode,
  contactId,
  defaultValues,
}: {
  mode: 'create' | 'edit'
  contactId?: string
  defaultValues?: Partial<ContactFormValues>
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      accountId: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      title: '',
      ...defaultValues,
    },
  })

  const onSubmit = (values: ContactFormValues) => {
    startTransition(async () => {
      if (mode === 'edit' && contactId) {
        await updateContact(contactId, {
          accountId: values.accountId || null,
          firstName: values.firstName,
          lastName: values.lastName || null,
          email: values.email || null,
          phone: values.phone || null,
          title: values.title || null,
        })
        router.push(`/crm/contacts`)
      } else {
        await createContact({
          accountId: values.accountId || null,
          firstName: values.firstName,
          lastName: values.lastName || null,
          email: values.email || null,
          phone: values.phone || null,
          title: values.title || null,
        })
        router.push('/crm/contacts')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="First Name" error={errors.firstName?.message}>
          <input
            {...register('firstName')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </Field>
        <Field label="Last Name" error={errors.lastName?.message}>
          <input
            {...register('lastName')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </Field>
        <Field label="Account ID" error={errors.accountId?.message}>
          <input
            {...register('accountId')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input
            {...register('email')}
            type="email"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <input
            {...register('phone')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </Field>
        <Field label="Title" error={errors.title?.message}>
          <input
            {...register('title')}
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
          {mode === 'edit' ? 'Update Contact' : 'Create Contact'}
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
