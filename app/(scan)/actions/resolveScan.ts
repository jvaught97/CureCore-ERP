'use server';

import { createClient } from '@/utils/supabase/server';
import { parseBarcode, validateBarcodeInput } from '@/lib/barcode/parser';
import { ScanResult, ScanAction } from '@/types/barcode';
import { headers } from 'next/headers';
import { getCurrentUserOrgId } from '@/lib/auth';

/**
 * Resolves a barcode scan by parsing, looking up in the database,
 * and determining available actions
 */
export async function resolveScan(rawPayload: string): Promise<ScanResult> {
  // 1. Validate input
  const validation = validateBarcodeInput(rawPayload);
  if (!validation.valid) {
    return {
      barcode: rawPayload,
      format: 'UNKNOWN',
      parsed: { raw: rawPayload, format: 'UNKNOWN' },
      item: null,
      lot: null,
      actions: [],
      error: 'INVALID_FORMAT',
      errorMessage: validation.error
    };
  }

  // 2. Parse barcode
  const parsedData = parseBarcode(rawPayload);

  // 3. Get Supabase client and org context
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return {
      barcode: rawPayload,
      format: parsedData.format,
      parsed: parsedData,
      item: null,
      lot: null,
      actions: [],
      error: 'PERMISSION_DENIED',
      errorMessage: 'User not authenticated'
    };
  }

  const orgId = await getCurrentUserOrgId(supabase, user);

  try {
    // 4. Database lookup - Try exact barcode match first
    let barcodeRecord = await lookupBarcodeExact(supabase, orgId, rawPayload);
    let item = null;
    let lot = null;

    if (barcodeRecord) {
      // Found exact barcode match
      item = barcodeRecord.item || null;
      lot = barcodeRecord.lot || null;
    } else {
      // Fallback: Try to match by parsed data (GTIN + lot)
      if (parsedData.gtin) {
        const fallbackResult = await lookupByParsedData(
          supabase,
          orgId,
          parsedData.gtin,
          parsedData.lot
        );
        item = fallbackResult.item;
        lot = fallbackResult.lot;

        // Create barcode record for future scans
        if (item) {
          barcodeRecord = await createBarcodeRecord(
            supabase,
            orgId,
            rawPayload,
            parsedData.format,
            item.id,
            lot?.id,
            parsedData
          );
        }
      }
    }

    // 5. Determine available actions
    const actions = determineActions(item, lot);

    // 6. Log scan event
    await logScanEvent(supabase, {
      orgId,
      userId: user.id,
      barcodeValue: rawPayload,
      barcodeId: barcodeRecord?.id,
      scanResult: {
        format: parsedData.format,
        parsed: parsedData,
        item: item?.id,
        lot: lot?.id
      }
    });

    // 7. Return result
    return {
      barcode: rawPayload,
      format: parsedData.format,
      parsed: parsedData,
      item,
      lot,
      barcodeRecord: barcodeRecord || undefined,
      actions,
      error: !item && !lot ? 'NOT_FOUND' : undefined,
      errorMessage: !item && !lot ? 'No matching item or lot found in database' : undefined
    };
  } catch (error) {
    console.error('Scan resolution error:', error);
    return {
      barcode: rawPayload,
      format: parsedData.format,
      parsed: parsedData,
      item: null,
      lot: null,
      actions: [],
      error: 'NETWORK_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Looks up barcode by exact value
 */
async function lookupBarcodeExact(supabase: any, orgId: string, barcodeValue: string) {
  const { data, error } = await supabase
    .from('barcodes')
    .select(`
      *,
      item:item_master(*),
      lot:item_lots(*, item:item_master(*))
    `)
    .eq('org_id', orgId)
    .eq('barcode_value', barcodeValue)
    .single();

  if (error) {
    console.error('Barcode lookup error:', error);
    return null;
  }

  return data;
}

/**
 * Looks up item and lot by parsed GTIN and lot number
 */
async function lookupByParsedData(
  supabase: any,
  orgId: string,
  gtin: string,
  lotNumber?: string
) {
  // First, find item by SKU (using GTIN as SKU)
  const { data: item } = await supabase
    .from('item_master')
    .select('*')
    .eq('org_id', orgId)
    .eq('sku', gtin)
    .single();

  if (!item) {
    return { item: null, lot: null };
  }

  // If lot number is provided, find the lot
  if (lotNumber) {
    const { data: lot } = await supabase
      .from('item_lots')
      .select('*, item:item_master(*)')
      .eq('org_id', orgId)
      .eq('item_id', item.id)
      .eq('lot_number', lotNumber)
      .single();

    return { item, lot };
  }

  return { item, lot: null };
}

/**
 * Creates a new barcode record
 */
async function createBarcodeRecord(
  supabase: any,
  orgId: string,
  barcodeValue: string,
  barcodeType: string,
  itemId: string,
  lotId?: string,
  metadata?: any
) {
  const { data, error } = await supabase
    .from('barcodes')
    .insert({
      org_id: orgId,
      barcode_value: barcodeValue,
      barcode_type: barcodeType,
      item_id: itemId,
      lot_id: lotId,
      metadata
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating barcode record:', error);
    return null;
  }

  return data;
}

/**
 * Determines available actions based on lookup results
 */
function determineActions(item: any, lot: any): ScanAction[] {
  const actions: ScanAction[] = [];

  if (!item && !lot) {
    actions.push('CREATE_ITEM');
  } else if (item && !lot) {
    actions.push('CREATE_LOT', 'VIEW_ITEM', 'PRINT_LABEL');
  } else if (item && lot) {
    actions.push('ADD_TO_BATCH', 'ADJUST_INVENTORY', 'VIEW_LOT', 'PRINT_LABEL');
  }

  return actions;
}

/**
 * Logs scan event to audit trail
 */
async function logScanEvent(
  supabase: any,
  data: {
    orgId: string;
    userId: string;
    barcodeValue: string;
    barcodeId?: string;
    scanResult: any;
    actionTaken?: string;
  }
) {
  // Get request headers for IP and user agent
  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip');
  const userAgent = headersList.get('user-agent');

  const { error } = await supabase
    .from('barcode_scan_log')
    .insert({
      org_id: data.orgId,
      user_id: data.userId,
      barcode_value: data.barcodeValue,
      barcode_id: data.barcodeId,
      scan_result: data.scanResult,
      action_taken: data.actionTaken,
      ip_address: ipAddress,
      user_agent: userAgent
    });

  if (error) {
    console.error('Error logging scan event:', error);
  }
}

/**
 * Updates scan log with action taken after scan
 */
export async function updateScanAction(scanLogId: string, action: ScanAction): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('barcode_scan_log')
    .update({ action_taken: action })
    .eq('id', scanLogId);
}
