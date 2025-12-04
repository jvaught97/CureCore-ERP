'use server';

import { createClient } from '@/app/utils/supabase/server';
import { getCurrentUserOrgId } from '@/lib/auth';
import { parseBarcode } from '@/lib/barcode/parser';

interface ScanContainerResult {
  success: boolean;
  container?: {
    id: string;
    container_code: string;
    label: string | null;
    status: string;
    current_net_weight: number | null;
    current_gross_weight: number | null;
    calculated_tare_weight: number | null;
    refined_tare_weight: number | null;
    weight_unit: string;
    item_master: {
      name: string;
      sku: string;
    };
    item_lots: {
      lot_number: string;
    };
  };
  error?: string;
}

/**
 * Scans a barcode and resolves it to a container
 * Supports:
 * - QR codes with container data
 * - Container codes (CNT-2025-001)
 * - Supplier barcodes linked to containers
 */
export async function scanContainer(barcodeValue: string): Promise<ScanContainerResult> {
  const supabase = await createClient();
  const orgId = await getCurrentUserOrgId(supabase);

  // Parse the barcode
  const parsed = parseBarcode(barcodeValue);

  let container = null;

  // Strategy 1: QR code with container ID
  if (parsed.format === 'QR' && (parsed as any).containerId) {
    const { data, error } = await supabase
      .from('inventory_containers')
      .select(`
        *,
        item_master!inner(name, sku),
        item_lots!inner(lot_number)
      `)
      .eq('id', (parsed as any).containerId)
      .eq('org_id', orgId)
      .single();

    if (!error && data) {
      container = data;
    }
  }

  // Strategy 2: Container code (CNT-2025-001)
  if (!container) {
    const { data, error } = await supabase
      .from('inventory_containers')
      .select(`
        *,
        item_master!inner(name, sku),
        item_lots!inner(lot_number)
      `)
      .eq('container_code', barcodeValue)
      .eq('org_id', orgId)
      .single();

    if (!error && data) {
      container = data;
    }
  }

  // Strategy 3: Barcode lookup (supplier barcode or internal barcode)
  if (!container) {
    const { data: barcodeData, error: barcodeError } = await supabase
      .from('barcodes')
      .select('container_id')
      .eq('barcode_value', barcodeValue)
      .eq('org_id', orgId)
      .not('container_id', 'is', null)
      .single();

    if (!barcodeError && barcodeData?.container_id) {
      const { data, error } = await supabase
        .from('inventory_containers')
        .select(`
          *,
          item_master!inner(name, sku),
          item_lots!inner(lot_number)
        `)
        .eq('id', barcodeData.container_id)
        .eq('org_id', orgId)
        .single();

      if (!error && data) {
        container = data;
      }
    }
  }

  if (!container) {
    return {
      success: false,
      error: 'Container not found for this barcode'
    };
  }

  // Log the scan
  await supabase.from('barcode_scans').insert({
    org_id: orgId,
    barcode_value: barcodeValue,
    barcode_type: parsed.format,
    entity_type: 'container',
    entity_id: container.id,
    scan_result: 'success',
    scanned_by: (await supabase.auth.getUser()).data.user?.id
  });

  return {
    success: true,
    container: container as any
  };
}
