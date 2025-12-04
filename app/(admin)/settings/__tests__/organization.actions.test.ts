/**
 * Organization Settings Actions Tests
 *
 * Run with: npm test app/(admin)/settings/__tests__/organization.actions.test.ts
 *
 * Prerequisites:
 * - Install testing dependencies: npm install -D jest @testing-library/react @testing-library/jest-dom
 * - Configure jest.config.js with Next.js preset
 * - Mock Supabase client
 */

import { saveOrgSettings, getOrgSettings } from '../organization/actions'
import { createClient } from '@/app/utils/supabase/server'
import { getAuthContext, logActivity } from '@/lib/server/activity-log'

// Mock dependencies
jest.mock('@/app/utils/supabase/server')
jest.mock('@/lib/server/activity-log')

const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  upsert: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  single: jest.fn(),
}

describe('Organization Settings Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  describe('saveOrgSettings', () => {
    it('should save org settings for admin user', async () => {
      const mockTenantId = 'tenant-123'
      const mockUserId = 'user-456'

      ;(getAuthContext as jest.Mock).mockResolvedValue({
        tenant_id: mockTenantId,
        user_id: mockUserId,
      })

      const existingData = { id: 'org-1', company_name: 'Old Name', tenant_id: mockTenantId }
      const newData = { id: 'org-1', company_name: 'New Name', tenant_id: mockTenantId }

      mockSupabase.single
        .mockResolvedValueOnce({ data: existingData, error: null }) // First select (before)
        .mockResolvedValueOnce({ data: newData, error: null }) // Upsert result

      const input = {
        company_name: 'New Name',
        default_currency: 'USD',
        primary_color: '#174940',
      }

      const result = await saveOrgSettings(input)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(newData)
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: mockTenantId,
          company_name: 'New Name',
        }),
        { onConflict: 'tenant_id' }
      )
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: mockTenantId,
          actor_user_id: mockUserId,
          entity: 'org_settings',
          action: 'update',
          diff: { before: existingData, after: newData },
        })
      )
    })

    it('should reject non-admin user', async () => {
      ;(getAuthContext as jest.Mock).mockRejectedValue(new Error('Admin access required'))

      const result = await saveOrgSettings({ company_name: 'Test' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Admin access required')
      expect(mockSupabase.upsert).not.toHaveBeenCalled()
    })

    it('should validate input with Zod', async () => {
      ;(getAuthContext as jest.Mock).mockResolvedValue({
        tenant_id: 'tenant-123',
        user_id: 'user-456',
      })

      // Invalid input: empty company_name
      const result = await saveOrgSettings({ company_name: '' } as any)

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
      expect(mockSupabase.upsert).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      ;(getAuthContext as jest.Mock).mockResolvedValue({
        tenant_id: 'tenant-123',
        user_id: 'user-456',
      })

      mockSupabase.single
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Database error' } })

      const result = await saveOrgSettings({ company_name: 'Test Corp' })

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should create new org settings if none exist', async () => {
      const mockTenantId = 'tenant-new'
      const mockUserId = 'user-new'

      ;(getAuthContext as jest.Mock).mockResolvedValue({
        tenant_id: mockTenantId,
        user_id: mockUserId,
      })

      const newData = { id: 'org-new', company_name: 'New Corp', tenant_id: mockTenantId }

      mockSupabase.single
        .mockResolvedValueOnce({ data: null, error: null }) // No existing data
        .mockResolvedValueOnce({ data: newData, error: null }) // Upsert creates new

      const result = await saveOrgSettings({ company_name: 'New Corp' })

      expect(result.success).toBe(true)
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'create', // Should be 'create' not 'update'
        })
      )
    })
  })

  describe('getOrgSettings', () => {
    it('should fetch org settings for tenant', async () => {
      const mockTenantId = 'tenant-123'

      ;(getAuthContext as jest.Mock).mockResolvedValue({
        tenant_id: mockTenantId,
        user_id: 'user-456',
      })

      const mockData = { id: 'org-1', company_name: 'Test Corp', tenant_id: mockTenantId }
      mockSupabase.single.mockResolvedValue({ data: mockData, error: null })

      const result = await getOrgSettings()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockData)
      expect(mockSupabase.eq).toHaveBeenCalledWith('tenant_id', mockTenantId)
    })

    it('should return null if no settings exist', async () => {
      ;(getAuthContext as jest.Mock).mockResolvedValue({
        tenant_id: 'tenant-123',
        user_id: 'user-456',
      })

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // No rows error
      })

      const result = await getOrgSettings()

      expect(result.success).toBe(true)
      expect(result.data).toBeNull()
    })

    it('should handle unauthorized access', async () => {
      ;(getAuthContext as jest.Mock).mockRejectedValue(new Error('Unauthorized'))

      const result = await getOrgSettings()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unauthorized')
    })
  })
})

/**
 * Integration Test Example (requires real Supabase connection)
 *
 * Uncomment and configure when ready to test against a test database
 */
/*
describe('Organization Settings Integration Tests', () => {
  beforeAll(async () => {
    // Set up test database with migrations
    // Create test tenant and admin user
  })

  afterAll(async () => {
    // Clean up test data
  })

  it('should save and retrieve org settings end-to-end', async () => {
    const input = {
      company_name: 'Integration Test Corp',
      default_currency: 'USD',
      primary_color: '#174940',
    }

    const saveResult = await saveOrgSettings(input)
    expect(saveResult.success).toBe(true)

    const getResult = await getOrgSettings()
    expect(getResult.success).toBe(true)
    expect(getResult.data?.company_name).toBe('Integration Test Corp')

    // Verify activity log entry was created
    const supabase = await createClient()
    const { data: logs } = await supabase
      .from('activity_log')
      .select('*')
      .eq('entity', 'org_settings')
      .order('created_at', { ascending: false })
      .limit(1)

    expect(logs?.[0]?.action).toBe('create')
    expect(logs?.[0]?.diff?.after?.company_name).toBe('Integration Test Corp')
  })
})
*/
