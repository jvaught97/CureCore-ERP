'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/app/utils/supabase/server'

async function getClientWithUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) throw error
  if (!user) throw new Error('Not authenticated')
  return { supabase, user }
}

export type LeadPayload = {
  accountId?: string | null
  name: string
  email?: string | null
  phone?: string | null
  source?: string | null
  status?: string | null
  ownerId?: string | null
  notes?: string | null
}

type LeadRecord = {
  id: string
  name: string
  email: string | null
  phone: string | null
  source: string | null
  notes: string | null
  account_id: string | null
}

export async function createLead(payload: LeadPayload) {
  const { supabase, user } = await getClientWithUser()
  const { data, error } = await supabase
    .from('crm_leads')
    .insert({
      account_id: payload.accountId ?? null,
      name: payload.name,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      source: payload.source ?? null,
      status: payload.status ?? 'new',
      owner_id: payload.ownerId ?? null,
      notes: payload.notes ?? null,
      created_by: user.id,
    })
    .select('id')
    .maybeSingle()

  if (error || !data) {
    console.error('createLead failed', error)
    throw error ?? new Error('Failed to create lead')
  }

  revalidatePath('/crm/leads')
  return data.id as string
}

export async function updateLead(id: string, payload: LeadPayload) {
  const { supabase, user } = await getClientWithUser()
  const { error } = await supabase
    .from('crm_leads')
    .update({
      account_id: payload.accountId ?? null,
      name: payload.name,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      source: payload.source ?? null,
      status: payload.status ?? null,
      owner_id: payload.ownerId ?? null,
      notes: payload.notes ?? null,
    })
    .eq('id', id)
    .eq('created_by', user.id)

  if (error) {
    console.error('updateLead failed', error)
    throw error
  }

  revalidatePath('/crm/leads')
  revalidatePath(`/crm/leads/${id}`)
}

export type AccountPayload = {
  name: string
  website?: string | null
  phone?: string | null
  billingAddress?: Record<string, any> | null
  shippingAddress?: Record<string, any> | null
  notes?: string | null
}

export async function createAccount(payload: AccountPayload) {
  const { supabase, user } = await getClientWithUser()
  const { data, error } = await supabase
    .from('crm_accounts')
    .insert({
      name: payload.name,
      website: payload.website ?? null,
      phone: payload.phone ?? null,
      billing_address: payload.billingAddress ?? null,
      shipping_address: payload.shippingAddress ?? null,
      notes: payload.notes ?? null,
      created_by: user.id,
    })
    .select('id')
    .maybeSingle()

  if (error || !data) {
    console.error('createAccount failed', error)
    throw error ?? new Error('Failed to create account')
  }
  revalidatePath('/crm/accounts')
  return data.id as string
}

export async function updateAccount(id: string, payload: AccountPayload) {
  const { supabase, user } = await getClientWithUser()
  const { error } = await supabase
    .from('crm_accounts')
    .update({
      name: payload.name,
      website: payload.website ?? null,
      phone: payload.phone ?? null,
      billing_address: payload.billingAddress ?? null,
      shipping_address: payload.shippingAddress ?? null,
      notes: payload.notes ?? null,
    })
    .eq('id', id)
    .eq('created_by', user.id)

  if (error) {
    console.error('updateAccount failed', error)
    throw error
  }

  revalidatePath('/crm/accounts')
  revalidatePath(`/crm/accounts/${id}`)
}

export type ContactPayload = {
  accountId?: string | null
  firstName: string
  lastName?: string | null
  email?: string | null
  phone?: string | null
  title?: string | null
}

export async function createContact(payload: ContactPayload) {
  const { supabase, user } = await getClientWithUser()
  const { data, error } = await supabase
    .from('crm_contacts')
    .insert({
      account_id: payload.accountId ?? null,
      first_name: payload.firstName,
      last_name: payload.lastName ?? null,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      title: payload.title ?? null,
      created_by: user.id,
    })
    .select('id')
    .maybeSingle()

  if (error || !data) {
    console.error('createContact failed', error)
    throw error ?? new Error('Failed to create contact')
  }
  revalidatePath('/crm/contacts')
  return data.id as string
}

export async function updateContact(id: string, payload: ContactPayload) {
  const { supabase, user } = await getClientWithUser()
  const { error } = await supabase
    .from('crm_contacts')
    .update({
      account_id: payload.accountId ?? null,
      first_name: payload.firstName,
      last_name: payload.lastName ?? null,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      title: payload.title ?? null,
    })
    .eq('id', id)
    .eq('created_by', user.id)

  if (error) {
    console.error('updateContact failed', error)
    throw error
  }
  revalidatePath('/crm/contacts')
}

export type OpportunityPayload = {
  accountId?: string | null
  name: string
  valueAmount?: number | null
  valueCurrency?: string | null
  stage?: string | null
  closeDate?: string | null
  ownerId?: string | null
  probabilityPct?: number | null
}

export async function createOpportunity(payload: OpportunityPayload) {
  const { supabase, user } = await getClientWithUser()
  const { data, error } = await supabase
    .from('crm_opportunities')
    .insert({
      account_id: payload.accountId ?? null,
      name: payload.name,
      value_amount: payload.valueAmount ?? null,
      value_currency: payload.valueCurrency ?? 'USD',
      stage: payload.stage ?? 'New',
      close_date: payload.closeDate ?? null,
      owner_id: payload.ownerId ?? null,
      probability_pct: payload.probabilityPct ?? null,
      created_by: user.id,
    })
    .select('id')
    .maybeSingle()

  if (error || !data) {
    console.error('createOpportunity failed', error)
    throw error ?? new Error('Failed to create opportunity')
  }
  revalidatePath('/crm/opportunities')
  return data.id as string
}

export async function updateOpportunity(id: string, payload: OpportunityPayload) {
  const { supabase, user } = await getClientWithUser()
  const { error } = await supabase
    .from('crm_opportunities')
    .update({
      account_id: payload.accountId ?? null,
      name: payload.name,
      value_amount: payload.valueAmount ?? null,
      value_currency: payload.valueCurrency ?? 'USD',
      stage: payload.stage ?? null,
      close_date: payload.closeDate ?? null,
      owner_id: payload.ownerId ?? null,
      probability_pct: payload.probabilityPct ?? null,
    })
    .eq('id', id)
    .eq('created_by', user.id)

  if (error) {
    console.error('updateOpportunity failed', error)
    throw error
  }
  revalidatePath('/crm/opportunities')
}

export type ActivityPayload = {
  accountId?: string | null
  contactId?: string | null
  oppId?: string | null
  type: 'call' | 'email' | 'meeting' | 'task'
  subject: string
  body?: string | null
  dueAt?: string | null
  done?: boolean
}

export async function createActivity(payload: ActivityPayload) {
  const { supabase, user } = await getClientWithUser()
  const { error } = await supabase
    .from('crm_activities')
    .insert({
      account_id: payload.accountId ?? null,
      contact_id: payload.contactId ?? null,
      opp_id: payload.oppId ?? null,
      type: payload.type,
      subject: payload.subject,
      body: payload.body ?? null,
      due_at: payload.dueAt ?? null,
      done: payload.done ?? false,
      created_by: user.id,
    })

  if (error) {
    console.error('createActivity failed', error)
    throw error
  }
  revalidatePath('/crm/activities')
}

export type QuotePayload = {
  accountId: string
  currency: string
  status?: 'draft' | 'sent' | 'accepted' | 'rejected'
  validUntil?: string | null
  notes?: string | null
  lines: Array<{
    skuId?: string | null
    description: string
    qty: number
    uom?: string | null
    unitPrice: number
    discountPct?: number | null
    taxCode?: string | null
    displayBoxQuantity?: number | null
  }>
}

export async function createQuote(payload: QuotePayload) {
  const { supabase, user } = await getClientWithUser()
  const totals = await computeQuoteTotals(supabase, payload)
  const nowIso = new Date().toISOString()
  const { data: quote, error } = await supabase
    .from('crm_quotes')
    .insert({
      account_id: payload.accountId,
      currency: payload.currency,
      status: payload.status ?? 'draft',
      valid_until: payload.validUntil ?? null,
      notes: payload.notes ?? null,
      totals,
      created_by: user.id,
      status_updated_at: nowIso,
    })
    .select('id')
    .maybeSingle()

  if (error || !quote) {
    console.error('createQuote failed', error)
    throw error ?? new Error('Failed to create quote')
  }

  if (payload.lines.length) {
    const formatted = payload.lines.map((line) => {
      const displayBoxes = line.displayBoxQuantity ?? 0
      const hasDisplayBox = displayBoxes > 0
      return {
        quote_id: quote.id,
        sku_id: line.skuId ?? null,
        description: line.description,
        qty: line.qty,
        uom: line.uom ?? 'unit',
        unit_price: line.unitPrice,
        discount_pct: line.discountPct ?? null,
        tax_code: line.taxCode ?? null,
        requires_display_box: hasDisplayBox,
        display_box_quantity: hasDisplayBox ? displayBoxes : 0,
        created_by: user.id,
      }
    })
    const { error: lineError } = await supabase.from('crm_quote_lines').insert(formatted)
    if (lineError) {
      console.error('createQuote lines failed', lineError)
      throw lineError
    }
  }

  revalidatePath('/crm/quotes')
  return quote.id as string
}

export async function updateQuote(id: string, payload: QuotePayload) {
  const { supabase, user } = await getClientWithUser()
  const totals = await computeQuoteTotals(supabase, payload)

  const { data: currentQuote, error: currentError } = await supabase
    .from('crm_quotes')
    .select('status')
    .eq('id', id)
    .eq('created_by', user.id)
    .maybeSingle()

  if (currentError) {
    console.error('updateQuote failed to load current status', currentError)
    throw currentError
  }

  const nextStatus = payload.status ?? currentQuote?.status ?? 'draft'
  const statusChanged = currentQuote ? nextStatus !== currentQuote.status : true

  const updatePayload: Record<string, any> = {
    account_id: payload.accountId,
    currency: payload.currency,
    status: nextStatus,
    valid_until: payload.validUntil ?? null,
    notes: payload.notes ?? null,
    totals,
  }

  if (statusChanged) {
    updatePayload.status_updated_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('crm_quotes')
    .update(updatePayload)
    .eq('id', id)
    .eq('created_by', user.id)

  if (error) {
    console.error('updateQuote failed', error)
    throw error
  }

  const { error: deleteLinesError } = await supabase
    .from('crm_quote_lines')
    .delete()
    .eq('quote_id', id)
    .eq('created_by', user.id)

  if (deleteLinesError) {
    console.error('updateQuote delete lines failed', deleteLinesError)
    throw deleteLinesError
  }

  if (payload.lines.length) {
    const formatted = payload.lines.map((line) => {
      const displayBoxes = line.displayBoxQuantity ?? 0
      const hasDisplayBox = displayBoxes > 0
      return {
        quote_id: id,
        sku_id: line.skuId ?? null,
        description: line.description,
        qty: line.qty,
        uom: line.uom ?? 'unit',
        unit_price: line.unitPrice,
        discount_pct: line.discountPct ?? null,
        tax_code: line.taxCode ?? null,
        requires_display_box: hasDisplayBox,
        display_box_quantity: hasDisplayBox ? displayBoxes : 0,
        created_by: user.id,
      }
    })
    const { error: insertLinesError } = await supabase
      .from('crm_quote_lines')
      .insert(formatted)
    if (insertLinesError) {
      console.error('updateQuote insert lines failed', insertLinesError)
      throw insertLinesError
    }
  }

  revalidatePath('/crm/quotes')
  revalidatePath(`/crm/quotes/${id}`)
}

export async function convertLeadToAccount(leadId: string) {
  const { supabase, user } = await getClientWithUser()
  const { data: lead, error } = await supabase
    .from('crm_leads')
    .select('id,name,email,phone,notes,account_id,source')
    .eq('id', leadId)
    .eq('created_by', user.id)
    .maybeSingle()

  if (error || !lead) throw error ?? new Error('Lead not found')

  const leadRecord = lead as LeadRecord

  const accountId = leadRecord.account_id
    ? lead.account_id
    : await createAccount({ name: leadRecord.name, notes: leadRecord.notes ?? undefined })

  const contactId = await createContact({
    accountId,
    firstName: leadRecord.name,
    email: leadRecord.email ?? undefined,
    phone: leadRecord.phone ?? undefined,
  })

  const opportunityId = await createOpportunity({
    accountId,
    name: `${leadRecord.name} Opportunity`,
    valueCurrency: 'USD',
    stage: 'New',
  })

  await updateLead(leadId, {
    name: leadRecord.name,
    email: leadRecord.email ?? null,
    phone: leadRecord.phone ?? null,
    source: leadRecord.source ?? null,
    status: 'converted',
    accountId,
    notes: leadRecord.notes ?? null,
  })

  return { accountId, contactId, opportunityId }
}

async function computeQuoteTotals(
  supabase: SupabaseClient,
  payload: QuotePayload
) {
  const subtotal = payload.lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0)

  let manufacturingCost = 0

  const skuIds = Array.from(
    new Set(
      payload.lines
        .map((line) => line.skuId)
        .filter((id): id is string => Boolean(id))
    )
  )

  if (skuIds.length > 0) {
    const { data: formulationData, error } = await supabase
      .from('formulations')
      .select('id, total_manufacturing_cost')
      .in('id', skuIds)

    if (error) {
      console.error('computeQuoteTotals failed to load formulations', error)
    } else {
      const costMap = new Map<string, number>()
      for (const row of formulationData ?? []) {
        const cost = Number(row.total_manufacturing_cost ?? 0)
        costMap.set(row.id, Number.isFinite(cost) ? cost : 0)
      }

      manufacturingCost = payload.lines.reduce((sum, line) => {
        const perUnitCost = line.skuId ? costMap.get(line.skuId) ?? 0 : 0
        return sum + line.qty * perUnitCost
      }, 0)
    }
  }

  return {
    subtotal,
    total: subtotal,
    manufacturing_cost: manufacturingCost,
  }
}
