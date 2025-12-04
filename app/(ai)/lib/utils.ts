'use server'

import { createServerClient } from '@/app/utils/supabase/server'

type AuditEntry = {
  user_id: string
  action: string
  entity: string
  entity_id?: string
  input: Record<string, unknown>
  result: unknown
}

export async function audit(entry: AuditEntry) {
  const supabase = await createServerClient()
  await supabase.from('audit_log').insert([entry])
}
