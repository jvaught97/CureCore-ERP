'use server'

import { createServerClient } from '@/app/utils/supabase/server'

export async function rbacCheck(functionName: string, userId: string): Promise<boolean> {
  const supabase = await createServerClient()
  const { data, error } = await supabase.rpc(functionName, { p_user_id: userId })
  if (error) {
    return false
  }

  return Boolean(data)
}
