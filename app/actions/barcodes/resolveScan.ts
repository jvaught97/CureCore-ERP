'use server';

import { createClient } from '@/app/utils/supabase/server';
import { getCurrentUserOrgId } from '@/lib/auth';

export interface ScanResult {
  barcode: string;
  format: 'GS1-128' | 'CODE128' | 'QR' | 'UNKNOWN';
  item: any | null;
  lot: any | null;
  container: any | null;
  actions: string[];
  error: string | null;
}

export async function resolveScan(rawPayload: string): Promise<ScanResult> {
  const supabase = await createClient();
  const orgId = await getCurrentUserOrgId(supabase);

  const { data: barcodeData } = await supabase
    .from('barcodes')
    .select(`
      *,
      item_master (id, sku, name),
      item_lots (id, lot_number, expiry_date),
      inventory_containers (
        id, container_code, label, current_net_weight,
        tare_weight, tare_unit, status, location
      )
    `)
    .eq('org_id', orgId)
    .eq('barcode_value', rawPayload)
    .maybeSingle();

  if (!barcodeData) {
    return {
      barcode: rawPayload,
      format: 'UNKNOWN',
      item: null,
      lot: null,
      container: null,
      actions: ['CREATE_CONTAINER'],
      error: 'NOT_FOUND'
    };
  }

  return {
    barcode: rawPayload,
    format: detectFormat(rawPayload),
    item: barcodeData.item_master,
    lot: barcodeData.item_lots,
    container: barcodeData.inventory_containers,
    actions: determineActions(barcodeData.inventory_containers),
    error: null
  };
}

function detectFormat(value: string): 'GS1-128' | 'CODE128' | 'QR' | 'UNKNOWN' {
  if (value.startsWith('{')) return 'QR';
  if (value.match(/^]C1|^\(01\)/)) return 'GS1-128';
  return 'CODE128';
}

function determineActions(container: any): string[] {
  if (!container) return ['CREATE_CONTAINER'];

  const actions = ['WEIGH_CONTAINER', 'VIEW_DETAILS'];

  if (container.status === 'backstock') {
    actions.push('MOVE_TO_PRODUCTION');
  } else if (container.status === 'active') {
    actions.push('USE_IN_BATCH', 'MOVE_TO_BACKSTOCK');
  }

  return actions;
}
