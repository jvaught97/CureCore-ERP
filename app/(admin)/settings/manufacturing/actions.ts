'use server'

import { createClient } from '@/app/utils/supabase/server'
import {
  formulaPhaseSchema,
  reorderPhasesSchema,
  mfgPrefsSchema,
  type FormulaPhaseInput,
  type ReorderPhasesInput,
  type MfgPrefsInput,
} from '@/lib/validation/settings'
import { getAuthContext, logActivity } from '@/lib/server/activity-log'

export async function getPhases() {
  try {
    const { tenant_id } = await getAuthContext()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('formula_phases')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('sort_order', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('getPhases error:', error)
    return { success: false, error: error.message || 'Failed to fetch phases' }
  }
}

export async function createPhase(input: FormulaPhaseInput) {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const validated = formulaPhaseSchema.parse(input)

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('formula_phases')
      .insert({
        tenant_id,
        ...validated,
        created_by: user_id,
      })
      .select()
      .single()

    if (error) throw error

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'formula_phase',
      entity_id: data.id,
      action: 'create',
      diff: { after: data },
    })

    return { success: true, data }
  } catch (error: any) {
    console.error('createPhase error:', error)
    return { success: false, error: error.message || 'Failed to create phase' }
  }
}

export async function updatePhase(input: FormulaPhaseInput) {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const validated = formulaPhaseSchema.parse(input)

    if (!validated.id) {
      throw new Error('Phase ID is required for update')
    }

    const supabase = await createClient()

    const { data: before } = await supabase
      .from('formula_phases')
      .select('*')
      .eq('id', validated.id)
      .eq('tenant_id', tenant_id)
      .single()

    const { data, error } = await supabase
      .from('formula_phases')
      .update(validated)
      .eq('id', validated.id)
      .eq('tenant_id', tenant_id)
      .select()
      .single()

    if (error) throw error

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'formula_phase',
      entity_id: data.id,
      action: 'update',
      diff: { before, after: data },
    })

    return { success: true, data }
  } catch (error: any) {
    console.error('updatePhase error:', error)
    return { success: false, error: error.message || 'Failed to update phase' }
  }
}

export async function deletePhase(id: string) {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const supabase = await createClient()

    const { data: before } = await supabase
      .from('formula_phases')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .single()

    const { error } = await supabase
      .from('formula_phases')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenant_id)

    if (error) throw error

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'formula_phase',
      entity_id: id,
      action: 'delete',
      diff: { before },
    })

    return { success: true }
  } catch (error: any) {
    console.error('deletePhase error:', error)
    return { success: false, error: error.message || 'Failed to delete phase' }
  }
}

export async function reorderPhases(input: ReorderPhasesInput) {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const validated = reorderPhasesSchema.parse(input)

    const supabase = await createClient()

    // Update sort_order for each phase
    for (const phase of validated.phases) {
      await supabase
        .from('formula_phases')
        .update({ sort_order: phase.sort_order })
        .eq('id', phase.id)
        .eq('tenant_id', tenant_id)
    }

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'formula_phase',
      action: 'update',
      diff: { after: { reordered: validated.phases } },
    })

    return { success: true }
  } catch (error: any) {
    console.error('reorderPhases error:', error)
    return { success: false, error: error.message || 'Failed to reorder phases' }
  }
}

export async function getMfgPrefs() {
  try {
    const { tenant_id } = await getAuthContext()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('mfg_prefs')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return { success: true, data: data || null }
  } catch (error: any) {
    console.error('getMfgPrefs error:', error)
    return { success: false, error: error.message || 'Failed to fetch manufacturing preferences' }
  }
}

export async function saveMfgPrefs(input: MfgPrefsInput) {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const validated = mfgPrefsSchema.parse(input)

    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('mfg_prefs')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single()

    const { data, error } = await supabase
      .from('mfg_prefs')
      .upsert(
        {
          tenant_id,
          ...validated,
        },
        { onConflict: 'tenant_id' }
      )
      .select()
      .single()

    if (error) throw error

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'mfg_prefs',
      entity_id: data.id,
      action: existing ? 'update' : 'create',
      diff: { before: existing || undefined, after: data },
    })

    return { success: true, data }
  } catch (error: any) {
    console.error('saveMfgPrefs error:', error)
    return { success: false, error: error.message || 'Failed to save manufacturing preferences' }
  }
}
