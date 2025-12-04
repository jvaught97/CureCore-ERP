'use server'

import { createClient } from '@/app/utils/supabase/server'
import { getAuthContext, logActivity } from '@/lib/server/activity-log'
import {
  leadSourceSchema,
  pipelineStageSchema,
  crmPrefsSchema,
  type LeadSourceInput,
  type PipelineStageInput,
  type CrmPrefsInput,
} from '@/lib/validation/settings'

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }

// ─── LEAD SOURCES ────────────────────────────────────────────────────────────

export async function getLeadSources(): Promise<ActionResult<any[]>> {
  try {
    const { tenant_id } = await getAuthContext()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('crm_lead_sources')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('name', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch lead sources' }
  }
}

export async function createLeadSource(input: LeadSourceInput): Promise<ActionResult<any>> {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const validated = leadSourceSchema.parse(input)
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('crm_lead_sources')
      .insert({
        tenant_id,
        ...validated,
      })
      .select()
      .single()

    if (error) throw error

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'crm_lead_source',
      entity_id: data.id,
      action: 'create',
      diff: { after: data },
    })

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create lead source' }
  }
}

export async function updateLeadSource(
  id: string,
  input: Partial<LeadSourceInput>
): Promise<ActionResult<any>> {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const validated = leadSourceSchema.partial().parse(input)
    const supabase = await createClient()

    const { data: before } = await supabase
      .from('crm_lead_sources')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .single()

    if (!before) {
      return { success: false, error: 'Lead source not found' }
    }

    const { data, error } = await supabase
      .from('crm_lead_sources')
      .update(validated)
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .select()
      .single()

    if (error) throw error

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'crm_lead_source',
      entity_id: id,
      action: 'update',
      diff: { before, after: data },
    })

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update lead source' }
  }
}

export async function deleteLeadSource(id: string): Promise<ActionResult> {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const supabase = await createClient()

    const { data: before } = await supabase
      .from('crm_lead_sources')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .single()

    if (!before) {
      return { success: false, error: 'Lead source not found' }
    }

    const { error } = await supabase
      .from('crm_lead_sources')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenant_id)

    if (error) throw error

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'crm_lead_source',
      entity_id: id,
      action: 'delete',
      diff: { before },
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete lead source' }
  }
}

// ─── PIPELINE STAGES ─────────────────────────────────────────────────────────

export async function getPipelineStages(): Promise<ActionResult<any[]>> {
  try {
    const { tenant_id } = await getAuthContext()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('crm_pipeline_stages')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('sort_order', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch pipeline stages' }
  }
}

export async function createPipelineStage(input: PipelineStageInput): Promise<ActionResult<any>> {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const validated = pipelineStageSchema.parse(input)
    const supabase = await createClient()

    // Get current max sort_order
    const { data: existing } = await supabase
      .from('crm_pipeline_stages')
      .select('sort_order')
      .eq('tenant_id', tenant_id)
      .order('sort_order', { ascending: false })
      .limit(1)

    const nextSortOrder = (existing?.[0]?.sort_order ?? 0) + 1

    const { data, error } = await supabase
      .from('crm_pipeline_stages')
      .insert({
        tenant_id,
        ...validated,
        sort_order: nextSortOrder,
      })
      .select()
      .single()

    if (error) throw error

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'crm_pipeline_stage',
      entity_id: data.id,
      action: 'create',
      diff: { after: data },
    })

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create pipeline stage' }
  }
}

export async function updatePipelineStage(
  id: string,
  input: Partial<PipelineStageInput>
): Promise<ActionResult<any>> {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const validated = pipelineStageSchema.partial().parse(input)
    const supabase = await createClient()

    const { data: before } = await supabase
      .from('crm_pipeline_stages')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .single()

    if (!before) {
      return { success: false, error: 'Pipeline stage not found' }
    }

    const { data, error } = await supabase
      .from('crm_pipeline_stages')
      .update(validated)
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .select()
      .single()

    if (error) throw error

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'crm_pipeline_stage',
      entity_id: id,
      action: 'update',
      diff: { before, after: data },
    })

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update pipeline stage' }
  }
}

export async function deletePipelineStage(id: string): Promise<ActionResult> {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const supabase = await createClient()

    const { data: before } = await supabase
      .from('crm_pipeline_stages')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .single()

    if (!before) {
      return { success: false, error: 'Pipeline stage not found' }
    }

    const { error } = await supabase
      .from('crm_pipeline_stages')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenant_id)

    if (error) throw error

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'crm_pipeline_stage',
      entity_id: id,
      action: 'delete',
      diff: { before },
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete pipeline stage' }
  }
}

export async function reorderPipelineStages(
  updates: Array<{ id: string; sort_order: number }>
): Promise<ActionResult> {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const supabase = await createClient()

    for (const { id, sort_order } of updates) {
      const { error } = await supabase
        .from('crm_pipeline_stages')
        .update({ sort_order })
        .eq('id', id)
        .eq('tenant_id', tenant_id)

      if (error) throw error
    }

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'crm_pipeline_stage',
      entity_id: 'bulk',
      action: 'update',
      diff: { after: updates },
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reorder pipeline stages' }
  }
}

// ─── CRM PREFERENCES ─────────────────────────────────────────────────────────

export async function getCrmPrefs(): Promise<ActionResult<any>> {
  try {
    const { tenant_id } = await getAuthContext()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('crm_prefs')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return {
      success: true,
      data: data || {
        auto_convert_lead_to_opportunity: false,
        auto_convert_statuses: [],
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch CRM preferences' }
  }
}

export async function saveCrmPrefs(input: CrmPrefsInput): Promise<ActionResult> {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const validated = crmPrefsSchema.parse(input)
    const supabase = await createClient()

    const { data: before } = await supabase
      .from('crm_prefs')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single()

    const { data, error } = await supabase
      .from('crm_prefs')
      .upsert(
        {
          tenant_id,
          ...validated,
        },
        {
          onConflict: 'tenant_id',
        }
      )
      .select()
      .single()

    if (error) throw error

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'crm_prefs',
      entity_id: tenant_id,
      action: before ? 'update' : 'create',
      diff: { before, after: data },
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save CRM preferences' }
  }
}
