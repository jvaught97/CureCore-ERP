'use server'

import { tools, ToolName } from '../lib/tools'
import { createServerClient } from '@/app/utils/supabase/server'

export async function dispatchTool(name: ToolName, input: unknown) {
  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) throw new Error('Not authenticated')

  if (!tools[name]) throw new Error('Unknown tool: ' + name)
  return tools[name](input, data.user.id)
}
