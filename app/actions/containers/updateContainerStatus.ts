'use server';

import { createClient } from '@/app/utils/supabase/server';
import { getCurrentUserOrgId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function updateContainerStatus(
  containerId: string,
  status: 'backstock' | 'active' | 'quarantine' | 'empty' | 'archived',
  location?: string
) {
  const supabase = await createClient();
  const orgId = await getCurrentUserOrgId(supabase);

  const { error } = await supabase
    .from('inventory_containers')
    .update({
      status,
      location: location ?? undefined,
      updated_at: new Date().toISOString()
    })
    .eq('id', containerId)
    .eq('org_id', orgId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/inventory');
  return { success: true };
}

export async function moveContainerToProduction(containerId: string) {
  return updateContainerStatus(containerId, 'active', 'Production Floor');
}

export async function moveContainerToBackstock(containerId: string) {
  return updateContainerStatus(containerId, 'backstock', 'Warehouse');
}
