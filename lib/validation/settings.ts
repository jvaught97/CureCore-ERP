import { z } from 'zod'

// =====================================================
// Organization Settings Schemas
// =====================================================
export const addressSchema = z.object({
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal: z.string().optional(),
  country: z.string().optional(),
})

export const orgSettingsSchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(255),
  dba: z.string().max(255).optional(),
  legal_entity: z.string().max(255).optional(),
  ein: z.string().max(20).optional(),
  website: z.string().url().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  address: addressSchema.optional(),
  fiscal_year_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  default_currency: z.string().length(3, 'Currency must be 3 characters').optional(),
  default_timezone: z.string().optional(),
  batches_prefix: z.string().max(100).optional(),
  coas_prefix: z.string().max(100).optional(),
  invoices_prefix: z.string().max(100).optional(),
  pos_prefix: z.string().max(100).optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional().or(z.literal('')),
  dark_mode: z.boolean().optional(),
})

export type OrgSettingsInput = z.infer<typeof orgSettingsSchema>

// =====================================================
// Branding Schemas
// =====================================================
export const brandingUploadSchema = z.object({
  kind: z.enum(['navbar', 'invoice', 'packing', 'analytics']),
  fileName: z.string(),
  fileType: z.string().regex(/^image\/(png|svg\+xml|jpeg)$/, 'Only PNG, SVG, or JPEG images allowed'),
  fileSize: z.number().max(5 * 1024 * 1024, 'File size must be less than 5MB'),
})

export type BrandingUploadInput = z.infer<typeof brandingUploadSchema>

// =====================================================
// User & Role Schemas
// =====================================================
export const inviteUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'ops', 'sales', 'finance']),
  message: z.string().max(500).optional(),
})

export type InviteUserInput = z.infer<typeof inviteUserSchema>

export const updateUserRoleSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.enum(['admin', 'ops', 'sales', 'finance']),
})

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>

export const updateUserStatusSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  status: z.enum(['active', 'pending', 'disabled']),
})

export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>

export const modulePermissionSchema = z.object({
  module: z.enum(['inventory', 'formulations', 'manufacturing', 'crm', 'finance', 'reports', 'settings']),
  can_view: z.boolean(),
  can_create: z.boolean(),
  can_edit: z.boolean(),
  can_delete: z.boolean(),
  can_export: z.boolean(),
})

export const updateUserPermissionsSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  permissions: z.array(modulePermissionSchema),
})

export type UpdateUserPermissionsInput = z.infer<typeof updateUserPermissionsSchema>

export const deleteUserSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  confirmText: z.string().min(1, 'Confirmation required'),
})

export type DeleteUserInput = z.infer<typeof deleteUserSchema>

// =====================================================
// Inventory Settings Schemas
// =====================================================
export const ingredientCategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required').max(255),
  code: z.string().max(50).optional(),
  description: z.string().max(1000).optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean(),
  default_expiry_days: z.number().int().min(0).optional(),
})

export type IngredientCategoryInput = z.infer<typeof ingredientCategorySchema>

export const reorderCategoriesSchema = z.object({
  categories: z.array(z.object({
    id: z.string().uuid(),
    sort_order: z.number().int().min(0),
  })),
})

export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>

export const inventoryPrefsSchema = z.object({
  enable_fefo: z.boolean(),
  default_expiry_days: z.number().int().min(0),
  track_lot_numbers: z.boolean(),
  require_container_weight: z.boolean(),
})

export type InventoryPrefsInput = z.infer<typeof inventoryPrefsSchema>

// =====================================================
// Manufacturing Settings Schemas
// =====================================================
export const formulaPhaseSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required').max(255),
  code: z.string().max(50).optional(),
  description: z.string().max(1000).optional(),
  sort_order: z.number().int().min(0),
  is_active: z.boolean(),
  default_mix_temp_c: z.number().min(-100).max(300).optional(),
  default_shear_time_min: z.number().min(0).max(1000).optional(),
  default_target_ph: z.number().min(0).max(14).optional(),
})

export type FormulaPhaseInput = z.infer<typeof formulaPhaseSchema>

export const reorderPhasesSchema = z.object({
  phases: z.array(z.object({
    id: z.string().uuid(),
    sort_order: z.number().int().min(0),
  })),
})

export type ReorderPhasesInput = z.infer<typeof reorderPhasesSchema>

export const mfgPrefsSchema = z.object({
  default_yield_pct: z.number().min(0).max(100),
  include_scrap_pct: z.number().min(0).max(100),
  include_overhead: z.boolean(),
})

export type MfgPrefsInput = z.infer<typeof mfgPrefsSchema>

// =====================================================
// CRM Settings Schemas
// =====================================================
export const leadSourceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
  is_active: z.boolean(),
})

export type LeadSourceInput = z.infer<typeof leadSourceSchema>

export const pipelineStageSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required').max(255),
  probability: z.number().int().min(0).max(100),
  sla_hours: z.number().int().min(0).optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean(),
})

export type PipelineStageInput = z.infer<typeof pipelineStageSchema>

export const savePipelineStagesSchema = z.object({
  stages: z.array(pipelineStageSchema),
})

export type SavePipelineStagesInput = z.infer<typeof savePipelineStagesSchema>

export const crmPrefsSchema = z.object({
  auto_convert_lead_to_opportunity: z.boolean(),
  auto_convert_statuses: z.array(z.string()),
})

export type CrmPrefsInput = z.infer<typeof crmPrefsSchema>

// =====================================================
// Finance Settings Schemas
// =====================================================
export const financePrefsSchema = z.object({
  enabled_currencies: z.array(z.string().length(3)),
  default_currency: z.string().length(3),
  payment_terms: z.array(z.string()),
  costing_method: z.string(),
  overhead_rate_pct: z.number().min(0).max(100),
  include_scrap_in_costing: z.boolean(),
  export_profiles: z.record(z.any()).optional(),
})

export type FinancePrefsInput = z.infer<typeof financePrefsSchema>

// =====================================================
// Notification Settings Schemas
// =====================================================
export const notificationPrefsSchema = z.object({
  email_enabled: z.boolean(),
  email_smtp_host: z.string().optional(),
  email_smtp_port: z.number().int().min(1).max(65535).optional(),
  email_smtp_user: z.string().optional(),
  email_smtp_password: z.string().optional(),
  email_from_address: z.string().email().optional().or(z.literal('')),
  slack_webhook_url: z.string().url().optional().or(z.literal('')),
  webhook_url: z.string().url().optional().or(z.literal('')),
  webhook_secret: z.string().max(255).optional().or(z.literal('')),
  quiet_hours_start: z.string().nullable().optional(),
  quiet_hours_end: z.string().nullable().optional(),
  quiet_hours_timezone: z.string().optional(),
})

export type NotificationPrefsInput = z.infer<typeof notificationPrefsSchema>

// =====================================================
// Integration Settings Schemas
// =====================================================
export const integrationPrefsSchema = z.object({
  posthog_api_key: z.string().optional().or(z.literal('')),
  google_analytics_id: z.string().optional().or(z.literal('')),
  sentry_dsn: z.string().optional().or(z.literal('')),
  enable_fedex: z.boolean(),
  enable_ups: z.boolean(),
  enable_usps: z.boolean(),
  enable_avalara_tax: z.boolean(),
  enable_taxjar: z.boolean(),
})

export type IntegrationPrefsInput = z.infer<typeof integrationPrefsSchema>

// =====================================================
// Data Admin Schemas
// =====================================================
export const dataAdminPrefsSchema = z.object({
  environment: z.string(),
  show_environment_banner: z.boolean(),
})

export type DataAdminPrefsInput = z.infer<typeof dataAdminPrefsSchema>
