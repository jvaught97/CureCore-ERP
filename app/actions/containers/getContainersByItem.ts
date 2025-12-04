'use server';

import { createClient } from '@/app/utils/supabase/server';
import { getCurrentUserOrgId } from '@/lib/auth';

const STATUS_ORDER: Record<string, number> = {
  active: 1,
  backstock: 2,
  quarantine: 3,
  empty: 4
};

export async function getContainersByItem(itemId: string) {
  const supabase = await createClient();
  const orgId = await getCurrentUserOrgId(supabase);

  const { data, error } = await supabase
    .from('inventory_containers')
    .select(`
      *,
      item_lots (
        lot_number,
        expiry_date
      )
    `)
    .eq('item_id', itemId)
    .eq('org_id', orgId)
    .not('status', 'in', '("archived")')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).sort((a, b) => {
    const statusDiff =
      (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);

    if (statusDiff !== 0) return statusDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export async function getContainerSummary(itemId: string) {
  const supabase = await createClient();
  const orgId = await getCurrentUserOrgId(supabase);

  const { data, error } = await supabase
    .from('inventory_containers')
    .select('status, current_net_weight')
    .eq('item_id', itemId)
    .eq('org_id', orgId)
    .not('status', 'in', '("archived")');

  if (error) {
    throw new Error(error.message);
  }

  const summaryMap = new Map<
    string,
    { status: string; count: number; total_weight: number }
  >();

  (data || []).forEach((entry) => {
    const key = entry.status;
    const existing = summaryMap.get(key) || {
      status: key,
      count: 0,
      total_weight: 0
    };

    existing.count += 1;
    existing.total_weight += entry.current_net_weight || 0;

    summaryMap.set(key, existing);
  });

  return Array.from(summaryMap.values());
}
