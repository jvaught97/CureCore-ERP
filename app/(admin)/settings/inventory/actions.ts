'use server'

import { createClient } from '@/app/utils/supabase/server'
import { getAuthContext, logActivity } from '@/lib/server/activity-log'
import {
  ingredientCategorySchema,
  inventoryPrefsSchema,
  type IngredientCategoryInput,
  type InventoryPrefsInput,
} from '@/lib/validation/settings'

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }

// ─── INGREDIENT CATEGORIES ───────────────────────────────────────────────────

export async function getCategories(): Promise<ActionResult<any[]>> {
  try {
    const { tenant_id } = await getAuthContext()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('ingredient_categories')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('sort_order', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch categories' }
  }
}

export async function createCategory(input: IngredientCategoryInput): Promise<ActionResult<any>> {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const validated = ingredientCategorySchema.parse(input)
    const supabase = await createClient()

    // Get current max sort_order
    const { data: existing } = await supabase
      .from('ingredient_categories')
      .select('sort_order')
      .eq('tenant_id', tenant_id)
      .order('sort_order', { ascending: false })
      .limit(1)

    const nextSortOrder = (existing?.[0]?.sort_order ?? 0) + 1

    const { data, error } = await supabase
      .from('ingredient_categories')
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
      entity: 'ingredient_category',
      entity_id: data.id,
      action: 'create',
      diff: { after: data },
    })

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create category' }
  }
}

export async function updateCategory(
  id: string,
  input: Partial<IngredientCategoryInput>
): Promise<ActionResult<any>> {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const validated = ingredientCategorySchema.partial().parse(input)
    const supabase = await createClient()

    // Fetch before
    const { data: before } = await supabase
      .from('ingredient_categories')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .single()

    if (!before) {
      return { success: false, error: 'Category not found' }
    }

    const { data, error } = await supabase
      .from('ingredient_categories')
      .update(validated)
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .select()
      .single()

    if (error) throw error

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'ingredient_category',
      entity_id: id,
      action: 'update',
      diff: { before, after: data },
    })

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update category' }
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const supabase = await createClient()

    // Fetch before
    const { data: before } = await supabase
      .from('ingredient_categories')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .single()

    if (!before) {
      return { success: false, error: 'Category not found' }
    }

    const { error } = await supabase
      .from('ingredient_categories')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenant_id)

    if (error) throw error

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'ingredient_category',
      entity_id: id,
      action: 'delete',
      diff: { before },
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete category' }
  }
}

export async function reorderCategories(
  updates: Array<{ id: string; sort_order: number }>
): Promise<ActionResult> {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const supabase = await createClient()

    for (const { id, sort_order } of updates) {
      const { error } = await supabase
        .from('ingredient_categories')
        .update({ sort_order })
        .eq('id', id)
        .eq('tenant_id', tenant_id)

      if (error) throw error
    }

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'ingredient_category',
      entity_id: 'bulk',
      action: 'update',
      diff: { after: updates },
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reorder categories' }
  }
}

// ─── INVENTORY PREFERENCES ──────────────────────────────────────────────────

export async function getInventoryPrefs(): Promise<ActionResult<any>> {
  try {
    const { tenant_id } = await getAuthContext()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('inventory_prefs')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return {
      success: true,
      data: data || {
        enable_fefo: true,
        default_expiry_days: 365,
        track_lot_numbers: true,
        require_container_weight: false,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch inventory preferences' }
  }
}

export async function saveInventoryPrefs(input: InventoryPrefsInput): Promise<ActionResult> {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const validated = inventoryPrefsSchema.parse(input)
    const supabase = await createClient()

    // Fetch before
    const { data: before } = await supabase
      .from('inventory_prefs')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single()

    const { data, error } = await supabase
      .from('inventory_prefs')
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
      entity: 'inventory_prefs',
      entity_id: tenant_id,
      action: before ? 'update' : 'create',
      diff: { before, after: data },
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save inventory preferences' }
  }
}
