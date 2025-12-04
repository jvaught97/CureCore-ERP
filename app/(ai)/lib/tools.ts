import { z } from 'zod'
import { createServerClient } from '@/app/utils/supabase/server'
import { audit } from './utils'
import { rbacCheck } from './rbac'

export type ToolResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export const schemas = {
  createSupplier: z.object({
    name: z.string().min(2),
    website: z.string().url().optional(),
    terms: z.string().optional(),
    contacts: z
      .array(
        z.object({
          name: z.string(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          role: z.string().optional(),
        })
      )
      .optional(),
  }),
  upsertSupplierItem: z.object({
    supplier_id: z.string().uuid(),
    ingredient_id: z.string().uuid(),
    supplier_sku: z.string().optional(),
    pack_size_g: z.number().positive(),
    pack_cost_usd: z.number().nonnegative(),
  }),
  mapSupplierToIngredient: z.object({
    supplier_id: z.string().uuid(),
    ingredient_id: z.string().uuid(),
    preferred: z.boolean().default(false),
  }),
  repriceFormula: z.object({
    formula_id: z.string().uuid(),
    price_source: z.enum(['latest', 'weighted', 'contract']).default('latest'),
  }),
  createPurchaseOrder: z.object({
    supplier_id: z.string().uuid(),
    expected_date: z.string().optional(),
    lines: z
      .array(
        z.object({
          ingredient_id: z.string().uuid(),
          qty: z.number().positive(),
          uom: z.enum(['g', 'kg', 'ml', 'L', 'unit']),
        })
      )
      .min(1),
  }),
  attachDocument: z.object({
    entity: z.enum(['supplier', 'po', 'batch']),
    entity_id: z.string().uuid(),
    file_url: z.string(),
    doc_type: z.string(),
  }),
}

export async function createSupplier(input: unknown, userId: string): Promise<ToolResult> {
  const supabase = await createServerClient()
  const data = schemas.createSupplier.parse(input)
  const allowed = await rbacCheck('can_create_supplier', userId)
  if (!allowed) return { ok: false, error: 'Permission denied' }

  const primaryContact = data.contacts?.[0]
  const insertPayload = {
    name: data.name,
    website: data.website ?? null,
    terms: data.terms ?? null,
    contact_person: primaryContact?.name ?? null,
    email: primaryContact?.email ?? null,
    phone: primaryContact?.phone ?? null,
    notes: primaryContact?.role ? `Role: ${primaryContact.role}` : null,
    created_by: userId,
  }

  const { data: row, error } = await supabase
    .from('suppliers')
    .insert([insertPayload])
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  await audit({
    user_id: userId,
    action: 'create_supplier',
    entity: 'supplier',
    entity_id: row.id,
    input: data,
    result: row,
  })

  return { ok: true, data: row }
}

export async function upsertSupplierItem(input: unknown, userId: string): Promise<ToolResult> {
  const supabase = await createServerClient()
  const data = schemas.upsertSupplierItem.parse(input)
  const allowed = await rbacCheck('can_create_supplier', userId)
  if (!allowed) return { ok: false, error: 'Permission denied' }

  const { data: row, error } = await supabase
    .from('supplier_items')
    .upsert([{ ...data }], { onConflict: 'supplier_id,ingredient_id' })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  await audit({
    user_id: userId,
    action: 'upsert_supplier_item',
    entity: 'supplier_item',
    entity_id: row.id,
    input: data,
    result: row,
  })

  return { ok: true, data: row }
}

export async function mapSupplierToIngredient(input: unknown, userId: string): Promise<ToolResult> {
  const supabase = await createServerClient()
  const data = schemas.mapSupplierToIngredient.parse(input)
  const allowed = await rbacCheck('can_create_supplier', userId)
  if (!allowed) return { ok: false, error: 'Permission denied' }

  const { data: row, error } = await supabase
    .from('ingredient_suppliers')
    .upsert(
      [
        {
          supplier_id: data.supplier_id,
          ingredient_id: data.ingredient_id,
          is_primary: data.preferred,
        },
      ],
      { onConflict: 'supplier_id,ingredient_id' }
    )
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  await audit({
    user_id: userId,
    action: 'map_supplier_to_ingredient',
    entity: 'ingredient_supplier',
    entity_id: row.id,
    input: data,
    result: row,
  })

  return { ok: true, data: row }
}

export async function repriceFormula(input: unknown, userId: string): Promise<ToolResult> {
  const supabase = await createServerClient()
  const data = schemas.repriceFormula.parse(input)
  const allowed = await rbacCheck('can_create_supplier', userId)
  if (!allowed) return { ok: false, error: 'Permission denied' }

  const { data: res, error } = await supabase.rpc('reprice_formula', {
    p_formula_id: data.formula_id,
    p_source: data.price_source,
  })

  if (error) return { ok: false, error: error.message }

  await audit({
    user_id: userId,
    action: 'reprice_formula',
    entity: 'formula',
    entity_id: data.formula_id,
    input: data,
    result: res,
  })

  return { ok: true, data: res }
}

export async function createPurchaseOrder(input: unknown, userId: string): Promise<ToolResult> {
  const supabase = await createServerClient()
  const data = schemas.createPurchaseOrder.parse(input)
  const allowed = await rbacCheck('can_create_supplier', userId)
  if (!allowed) return { ok: false, error: 'Permission denied' }

  const { data: po, error } = await supabase
    .from('purchase_orders')
    .insert([{ supplier_id: data.supplier_id, expected_date: data.expected_date ?? null, status: 'draft' }])
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  const lineRows = data.lines.map((line) => ({
    ingredient_id: line.ingredient_id,
    qty: line.qty,
    uom: line.uom,
    po_id: po.id,
  }))

  const { error: lineErr } = await supabase.from('po_lines').insert(lineRows)
  if (lineErr) return { ok: false, error: lineErr.message }

  await audit({
    user_id: userId,
    action: 'create_po',
    entity: 'purchase_order',
    entity_id: po.id,
    input: data,
    result: { po, line_count: lineRows.length },
  })

  return { ok: true, data: po }
}

export async function attachDocument(input: unknown, userId: string): Promise<ToolResult> {
  const supabase = await createServerClient()
  const data = schemas.attachDocument.parse(input)
  const allowed = await rbacCheck('can_create_supplier', userId)
  if (!allowed) return { ok: false, error: 'Permission denied' }

  const { data: row, error } = await supabase
    .from('documents')
    .insert([{ ...data, uploaded_by: userId }])
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  await audit({
    user_id: userId,
    action: 'attach_document',
    entity: data.entity,
    entity_id: data.entity_id,
    input: data,
    result: row,
  })

  return { ok: true, data: row }
}

export type ToolName =
  | 'createSupplier'
  | 'upsertSupplierItem'
  | 'mapSupplierToIngredient'
  | 'repriceFormula'
  | 'createPurchaseOrder'
  | 'attachDocument'

export const tools: Record<ToolName, (input: unknown, userId: string) => Promise<ToolResult>> = {
  createSupplier,
  upsertSupplierItem,
  mapSupplierToIngredient,
  repriceFormula,
  createPurchaseOrder,
  attachDocument,
}
