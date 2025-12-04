'use server';

import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// =====================================================
// SCHEMAS
// =====================================================

const jurisdictionSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1).max(20),
  name: z.string().min(1),
  country: z.string().default('US'),
  nexusStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  active: z.boolean().default(true),
});

const taxCategorySchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1).max(50),
  name: z.string().min(1),
  description: z.string().optional(),
  active: z.boolean().default(true),
});

const taxRateSchema = z.object({
  id: z.string().uuid().optional(),
  jurisdictionId: z.string().uuid(),
  categoryId: z.string().uuid(),
  rate: z.number().min(0).max(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  active: z.boolean().default(true),
});

const productMappingSchema = z.object({
  productId: z.string().uuid(),
  categoryId: z.string().uuid(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const exemptionSchema = z.object({
  id: z.string().uuid().optional(),
  customerId: z.string().uuid(),
  certificateNumber: z.string().min(1),
  jurisdictionCode: z.string().min(1),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fileUrl: z.string().url().optional(),
  active: z.boolean().default(true),
});

const recordTaxTransactionSchema = z.object({
  sourceType: z.enum(['invoice', 'credit_memo']),
  sourceId: z.string().uuid(),
});

const generateFilingSchema = z.object({
  jurisdictionId: z.string().uuid(),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  frequency: z.enum(['monthly', 'quarterly', 'annual']).default('monthly'),
});

const markFiledSchema = z.object({
  filingId: z.string().uuid(),
  reference: z.string().optional(),
  filedAt: z.string().optional(),
});

const recordPaymentSchema = z.object({
  filingId: z.string().uuid(),
  amount: z.number().positive(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reference: z.string().optional(),
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function getTenantAndRole(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const tenantId = user.user_metadata?.tenant_id || user.id;
  const role = user.user_metadata?.role;

  return { userId: user.id, tenantId, role };
}

function checkFinanceRole(role: string) {
  if (!['admin', 'finance'].includes(role)) {
    throw new Error('Access denied: Admin or Finance role required');
  }
}

async function logActivity(
  supabase: any,
  tenantId: string,
  userId: string,
  entity: string,
  entityId: string | null,
  action: string,
  diff: any = null
) {
  await supabase.from('activity_log').insert({
    tenant_id: tenantId,
    actor_user_id: userId,
    entity,
    entity_id: entityId,
    action,
    diff,
  });
}

// =====================================================
// JURISDICTION ACTIONS
// =====================================================

export async function listJurisdictions() {
  const supabase = await createClient();
  const { tenantId } = await getTenantAndRole(supabase);

  const { data, error } = await supabase
    .from('tax_jurisdictions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function createOrUpdateJurisdiction(input: z.infer<typeof jurisdictionSchema>) {
  const supabase = await createClient();
  const { userId, tenantId, role } = await getTenantAndRole(supabase);
  checkFinanceRole(role);

  const validated = jurisdictionSchema.parse(input);

  if (validated.id) {
    // Update
    const { data: existing } = await supabase
      .from('tax_jurisdictions')
      .select('*')
      .eq('id', validated.id)
      .eq('tenant_id', tenantId)
      .single();

    const { data, error } = await supabase
      .from('tax_jurisdictions')
      .update({
        code: validated.code,
        name: validated.name,
        country: validated.country,
        nexus_start: validated.nexusStart,
        active: validated.active,
      })
      .eq('id', validated.id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    await logActivity(supabase, tenantId, userId, 'tax_jurisdictions', data.id, 'updated', {
      before: existing,
      after: data,
    });

    revalidatePath('/finance/tax');
    return data;
  } else {
    // Create
    const { data, error } = await supabase
      .from('tax_jurisdictions')
      .insert({
        tenant_id: tenantId,
        code: validated.code,
        name: validated.name,
        country: validated.country,
        nexus_start: validated.nexusStart,
        active: validated.active,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity(supabase, tenantId, userId, 'tax_jurisdictions', data.id, 'created');

    revalidatePath('/finance/tax');
    return data;
  }
}

export async function toggleJurisdiction(id: string, active: boolean) {
  const supabase = await createClient();
  const { userId, tenantId, role } = await getTenantAndRole(supabase);
  checkFinanceRole(role);

  const { data, error } = await supabase
    .from('tax_jurisdictions')
    .update({ active })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw error;

  await logActivity(supabase, tenantId, userId, 'tax_jurisdictions', id, 'toggled', { active });

  revalidatePath('/finance/tax');
  return data;
}

// =====================================================
// TAX CATEGORY ACTIONS
// =====================================================

export async function listTaxCategories() {
  const supabase = await createClient();
  const { tenantId } = await getTenantAndRole(supabase);

  const { data, error } = await supabase
    .from('tax_categories')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function createOrUpdateTaxCategory(input: z.infer<typeof taxCategorySchema>) {
  const supabase = await createClient();
  const { userId, tenantId, role } = await getTenantAndRole(supabase);
  checkFinanceRole(role);

  const validated = taxCategorySchema.parse(input);

  if (validated.id) {
    // Update
    const { data: existing } = await supabase
      .from('tax_categories')
      .select('*')
      .eq('id', validated.id)
      .eq('tenant_id', tenantId)
      .single();

    const { data, error } = await supabase
      .from('tax_categories')
      .update({
        code: validated.code,
        name: validated.name,
        description: validated.description,
        active: validated.active,
      })
      .eq('id', validated.id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    await logActivity(supabase, tenantId, userId, 'tax_categories', data.id, 'updated', {
      before: existing,
      after: data,
    });

    revalidatePath('/finance/tax');
    return data;
  } else {
    // Create
    const { data, error } = await supabase
      .from('tax_categories')
      .insert({
        tenant_id: tenantId,
        code: validated.code,
        name: validated.name,
        description: validated.description,
        active: validated.active,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity(supabase, tenantId, userId, 'tax_categories', data.id, 'created');

    revalidatePath('/finance/tax');
    return data;
  }
}

// =====================================================
// TAX RATE ACTIONS
// =====================================================

export async function listTaxRates(jurisdictionId?: string) {
  const supabase = await createClient();
  const { tenantId } = await getTenantAndRole(supabase);

  let query = supabase
    .from('tax_rates')
    .select(`
      *,
      jurisdiction:tax_jurisdictions!inner(id, code, name),
      category:tax_categories!inner(id, code, name)
    `)
    .eq('tenant_id', tenantId);

  if (jurisdictionId) {
    query = query.eq('jurisdiction_id', jurisdictionId);
  }

  const { data, error } = await query.order('start_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function upsertTaxRate(input: z.infer<typeof taxRateSchema>) {
  const supabase = await createClient();
  const { userId, tenantId, role } = await getTenantAndRole(supabase);
  checkFinanceRole(role);

  const validated = taxRateSchema.parse(input);

  // Check for overlapping rates
  let overlapQuery = supabase
    .from('tax_rates')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('jurisdiction_id', validated.jurisdictionId)
    .eq('category_id', validated.categoryId)
    .gte('start_date', validated.startDate);

  if (validated.endDate) {
    overlapQuery = overlapQuery.lte('start_date', validated.endDate);
  }

  if (validated.id) {
    overlapQuery = overlapQuery.neq('id', validated.id);
  }

  const { data: overlaps } = await overlapQuery;

  if (overlaps && overlaps.length > 0) {
    throw new Error('Rate period overlaps with existing rate');
  }

  if (validated.id) {
    // Update
    const { data, error } = await supabase
      .from('tax_rates')
      .update({
        rate: validated.rate,
        start_date: validated.startDate,
        end_date: validated.endDate,
        active: validated.active,
      })
      .eq('id', validated.id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    await logActivity(supabase, tenantId, userId, 'tax_rates', data.id, 'updated');
    revalidatePath('/finance/tax');
    return data;
  } else {
    // Create
    const { data, error } = await supabase
      .from('tax_rates')
      .insert({
        tenant_id: tenantId,
        jurisdiction_id: validated.jurisdictionId,
        category_id: validated.categoryId,
        rate: validated.rate,
        start_date: validated.startDate,
        end_date: validated.endDate,
        active: validated.active,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity(supabase, tenantId, userId, 'tax_rates', data.id, 'created');
    revalidatePath('/finance/tax');
    return data;
  }
}

export async function deleteTaxRate(id: string) {
  const supabase = await createClient();
  const { userId, tenantId, role } = await getTenantAndRole(supabase);
  checkFinanceRole(role);

  const { error } = await supabase
    .from('tax_rates')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) throw error;

  await logActivity(supabase, tenantId, userId, 'tax_rates', id, 'deleted');
  revalidatePath('/finance/tax');
}

// =====================================================
// PRODUCT MAPPING ACTIONS
// =====================================================

export async function mapProductToTaxCategory(input: z.infer<typeof productMappingSchema>) {
  const supabase = await createClient();
  const { userId, tenantId, role } = await getTenantAndRole(supabase);
  checkFinanceRole(role);

  const validated = productMappingSchema.parse(input);

  const { data, error } = await supabase
    .from('tax_product_mappings')
    .upsert({
      tenant_id: tenantId,
      product_id: validated.productId,
      category_id: validated.categoryId,
      effective_date: validated.effectiveDate,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity(supabase, tenantId, userId, 'tax_product_mappings', data.id, 'mapped');
  revalidatePath('/finance/tax');
  return data;
}

export async function listProductMappings() {
  const supabase = await createClient();
  const { tenantId } = await getTenantAndRole(supabase);

  const { data, error } = await supabase
    .from('tax_product_mappings')
    .select(`
      *,
      category:tax_categories!inner(id, code, name)
    `)
    .eq('tenant_id', tenantId)
    .order('effective_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

// =====================================================
// EXEMPTION ACTIONS
// =====================================================

export async function listExemptions() {
  const supabase = await createClient();
  const { tenantId } = await getTenantAndRole(supabase);

  const { data, error } = await supabase
    .from('tax_exemptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('valid_from', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function upsertExemption(input: z.infer<typeof exemptionSchema>) {
  const supabase = await createClient();
  const { userId, tenantId, role } = await getTenantAndRole(supabase);
  checkFinanceRole(role);

  const validated = exemptionSchema.parse(input);

  if (validated.id) {
    // Update
    const { data, error } = await supabase
      .from('tax_exemptions')
      .update({
        customer_id: validated.customerId,
        certificate_number: validated.certificateNumber,
        jurisdiction_code: validated.jurisdictionCode,
        valid_from: validated.validFrom,
        valid_to: validated.validTo,
        file_url: validated.fileUrl,
        active: validated.active,
      })
      .eq('id', validated.id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    await logActivity(supabase, tenantId, userId, 'tax_exemptions', data.id, 'updated');
    revalidatePath('/finance/tax');
    return data;
  } else {
    // Create
    const { data, error } = await supabase
      .from('tax_exemptions')
      .insert({
        tenant_id: tenantId,
        customer_id: validated.customerId,
        certificate_number: validated.certificateNumber,
        jurisdiction_code: validated.jurisdictionCode,
        valid_from: validated.validFrom,
        valid_to: validated.validTo,
        file_url: validated.fileUrl,
        active: validated.active,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity(supabase, tenantId, userId, 'tax_exemptions', data.id, 'created');
    revalidatePath('/finance/tax');
    return data;
  }
}

export async function getExpiringExemptions(days: number = 30) {
  const supabase = await createClient();
  const { tenantId } = await getTenantAndRole(supabase);

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const { data, error } = await supabase
    .from('tax_exemptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .lte('valid_to', futureDate.toISOString().split('T')[0])
    .order('valid_to');

  if (error) throw error;
  return data || [];
}

// =====================================================
// TAX TRANSACTION ACTIONS
// =====================================================

export async function recordTaxTransaction(input: z.infer<typeof recordTaxTransactionSchema>) {
  const supabase = await createClient();
  const { userId, tenantId, role } = await getTenantAndRole(supabase);
  checkFinanceRole(role);

  const validated = recordTaxTransactionSchema.parse(input);

  // Get source document (invoice or credit memo)
  const { data: invoice } = await supabase
    .from('ar_invoices')
    .select('*, customer_id, date_issued')
    .eq('id', validated.sourceId)
    .eq('tenant_id', tenantId)
    .single();

  if (!invoice) {
    throw new Error('Source document not found');
  }

  // Stub: compute tax based on product mappings, rates, exemptions
  // For now, simple calculation
  const taxableAmount = Number(invoice.amount_total || 0);
  const taxRate = 0.0875; // Stub - should lookup from rates table
  const taxAmount = taxableAmount * taxRate;

  const { data, error } = await supabase
    .from('tax_transactions')
    .insert({
      tenant_id: tenantId,
      source_type: validated.sourceType,
      source_id: validated.sourceId,
      date: invoice.date_issued,
      jurisdiction_code: 'US-OK', // Stub - should determine from customer/shipping address
      customer_id: invoice.customer_id,
      taxable_amount: taxableAmount,
      tax_amount: taxAmount,
      exemption_applied: false,
      category_code: 'GENERAL', // Stub - should lookup from product mappings
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity(supabase, tenantId, userId, 'tax_transactions', data.id, 'recorded');
  return data;
}

export async function listTaxTransactions(filters?: {
  startDate?: string;
  endDate?: string;
  jurisdictionCode?: string;
}) {
  const supabase = await createClient();
  const { tenantId } = await getTenantAndRole(supabase);

  let query = supabase
    .from('tax_transactions')
    .select('*')
    .eq('tenant_id', tenantId);

  if (filters?.startDate) {
    query = query.gte('date', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('date', filters.endDate);
  }

  if (filters?.jurisdictionCode) {
    query = query.eq('jurisdiction_code', filters.jurisdictionCode);
  }

  const { data, error } = await query.order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

// =====================================================
// FILING ACTIONS
// =====================================================

export async function generateFiling(input: z.infer<typeof generateFilingSchema>) {
  const supabase = await createClient();
  const { userId, tenantId, role } = await getTenantAndRole(supabase);
  checkFinanceRole(role);

  const validated = generateFilingSchema.parse(input);

  // Get jurisdiction
  const { data: jurisdiction } = await supabase
    .from('tax_jurisdictions')
    .select('code')
    .eq('id', validated.jurisdictionId)
    .eq('tenant_id', tenantId)
    .single();

  if (!jurisdiction) {
    throw new Error('Jurisdiction not found');
  }

  // Sum tax transactions for period
  const { data: transactions } = await supabase
    .from('tax_transactions')
    .select('tax_amount')
    .eq('tenant_id', tenantId)
    .eq('jurisdiction_code', jurisdiction.code)
    .gte('date', validated.periodStart)
    .lte('date', validated.periodEnd);

  const totalTaxDue = (transactions || []).reduce((sum, t) => sum + Number(t.tax_amount), 0);

  // Calculate due date (period end + 20 days)
  const periodEnd = new Date(validated.periodEnd);
  const dueDate = new Date(periodEnd);
  dueDate.setDate(dueDate.getDate() + 20);

  const { data, error } = await supabase
    .from('tax_filings')
    .insert({
      tenant_id: tenantId,
      jurisdiction_id: validated.jurisdictionId,
      period_start: validated.periodStart,
      period_end: validated.periodEnd,
      frequency: validated.frequency,
      due_date: dueDate.toISOString().split('T')[0],
      total_tax_due: totalTaxDue,
      status: 'prepared',
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity(supabase, tenantId, userId, 'tax_filings', data.id, 'generated');
  revalidatePath('/finance/tax');
  return data;
}

export async function listFilings(filters?: { jurisdictionId?: string; status?: string }) {
  const supabase = await createClient();
  const { tenantId } = await getTenantAndRole(supabase);

  let query = supabase
    .from('tax_filings')
    .select(`
      *,
      jurisdiction:tax_jurisdictions!inner(id, code, name)
    `)
    .eq('tenant_id', tenantId);

  if (filters?.jurisdictionId) {
    query = query.eq('jurisdiction_id', filters.jurisdictionId);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query.order('due_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function markFiled(input: z.infer<typeof markFiledSchema>) {
  const supabase = await createClient();
  const { userId, tenantId, role } = await getTenantAndRole(supabase);
  checkFinanceRole(role);

  const validated = markFiledSchema.parse(input);

  const { data, error } = await supabase
    .from('tax_filings')
    .update({
      status: 'filed',
      reference: validated.reference,
      filed_at: validated.filedAt || new Date().toISOString(),
    })
    .eq('id', validated.filingId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw error;

  await logActivity(supabase, tenantId, userId, 'tax_filings', data.id, 'filed');
  revalidatePath('/finance/tax');
  return data;
}

export async function recordPayment(input: z.infer<typeof recordPaymentSchema>) {
  const supabase = await createClient();
  const { userId, tenantId, role } = await getTenantAndRole(supabase);
  checkFinanceRole(role);

  const validated = recordPaymentSchema.parse(input);

  const { data: filing } = await supabase
    .from('tax_filings')
    .select('total_tax_paid')
    .eq('id', validated.filingId)
    .eq('tenant_id', tenantId)
    .single();

  if (!filing) {
    throw new Error('Filing not found');
  }

  const newTotalPaid = Number(filing.total_tax_paid || 0) + validated.amount;

  const { data, error } = await supabase
    .from('tax_filings')
    .update({
      total_tax_paid: newTotalPaid,
      payment_date: validated.paymentDate,
      status: 'paid',
      reference: validated.reference,
    })
    .eq('id', validated.filingId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw error;

  await logActivity(supabase, tenantId, userId, 'tax_filings', data.id, 'payment_recorded', {
    amount: validated.amount,
  });

  revalidatePath('/finance/tax');
  return data;
}

export async function exportTaxReport(filters: {
  periodStart: string;
  periodEnd: string;
  jurisdictionId?: string;
}) {
  const supabase = await createClient();
  const { tenantId } = await getTenantAndRole(supabase);

  const transactions = await listTaxTransactions({
    startDate: filters.periodStart,
    endDate: filters.periodEnd,
    jurisdictionCode: filters.jurisdictionId,
  });

  // Generate CSV
  const headers = 'Date,Jurisdiction,Customer ID,Taxable Amount,Tax Amount,Category,Exemption Applied\n';
  const rows = transactions
    .map(
      t =>
        `${t.date},${t.jurisdiction_code},${t.customer_id},${t.taxable_amount},${t.tax_amount},${t.category_code},${t.exemption_applied}`
    )
    .join('\n');

  const csv = headers + rows;

  return { csv, filename: `tax_report_${filters.periodStart}_${filters.periodEnd}.csv` };
}

// =====================================================
// DASHBOARD STATS
// =====================================================

export async function getTaxDashboardStats() {
  const supabase = await createClient();
  const { tenantId } = await getTenantAndRole(supabase);

  // Active jurisdictions
  const { data: jurisdictions } = await supabase
    .from('tax_jurisdictions')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('active', true);

  // Open filings
  const { data: openFilings } = await supabase
    .from('tax_filings')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('status', ['open', 'prepared']);

  // Tax due this month
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const { data: thisMonthFilings } = await supabase
    .from('tax_filings')
    .select('total_tax_due')
    .eq('tenant_id', tenantId)
    .gte('due_date', monthStart.toISOString().split('T')[0])
    .lte('due_date', monthEnd.toISOString().split('T')[0]);

  const taxDueThisMonth = (thisMonthFilings || []).reduce((sum, f) => sum + Number(f.total_tax_due), 0);

  // Expiring exemptions (30 days)
  const expiringExemptions = await getExpiringExemptions(30);

  // Last 6 months tax collected
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: recentTransactions } = await supabase
    .from('tax_transactions')
    .select('date, taxable_amount, tax_amount')
    .eq('tenant_id', tenantId)
    .gte('date', sixMonthsAgo.toISOString().split('T')[0])
    .order('date');

  return {
    activeJurisdictions: jurisdictions?.length || 0,
    openFilings: openFilings?.length || 0,
    taxDueThisMonth,
    expiringExemptions: expiringExemptions.length,
    recentTransactions: recentTransactions || [],
  };
}
