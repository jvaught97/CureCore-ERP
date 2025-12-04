'use server'

import { createClient } from '@/app/utils/supabase/server'
import { getAuthContext, logActivity } from '@/lib/server/activity-log'
import {
  financePrefsSchema,
  type FinancePrefsInput,
} from '@/lib/validation/settings'

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }

// ─── FINANCE PREFERENCES ─────────────────────────────────────────────────────

export async function getFinancePrefs(): Promise<ActionResult<any>> {
  try {
    const { tenant_id } = await getAuthContext()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('finance_prefs')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return {
      success: true,
      data: data || {
        enabled_currencies: ['USD'],
        default_currency: 'USD',
        payment_terms: ['Net 15', 'Net 30', 'Net 45'],
        costing_method: 'Weighted Average',
        overhead_rate_pct: 0,
        include_scrap_in_costing: false,
        export_profiles: {},
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch finance preferences' }
  }
}

export async function saveFinancePrefs(input: FinancePrefsInput): Promise<ActionResult> {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const validated = financePrefsSchema.parse(input)
    const supabase = await createClient()

    const { data: before } = await supabase
      .from('finance_prefs')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single()

    const { data, error } = await supabase
      .from('finance_prefs')
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
      entity: 'finance_prefs',
      entity_id: tenant_id,
      action: before ? 'update' : 'create',
      diff: { before, after: data },
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save finance preferences' }
  }
}
