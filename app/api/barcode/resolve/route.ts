import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { parseBarcode, validateBarcodeInput } from '@/lib/barcode/parser';
import { ScanResult, ScanAction } from '@/types/barcode';

/**
 * POST /api/barcode/resolve
 * Resolves a barcode scan by parsing, looking up in the database,
 * and determining available actions
 */
export async function POST(request: NextRequest) {
  try {
    const { barcode } = await request.json();

    if (!barcode) {
      return NextResponse.json(
        { error: 'Barcode is required' },
        { status: 400 }
      );
    }

    // 1. Validate input
    const validation = validateBarcodeInput(barcode);
    if (!validation.valid) {
      return NextResponse.json({
        barcode,
        format: 'UNKNOWN',
        parsed: { raw: barcode, format: 'UNKNOWN' },
        item: null,
        lot: null,
        actions: [],
        error: 'INVALID_FORMAT',
        errorMessage: validation.error
      } as ScanResult);
    }

    // 2. Parse barcode
    const parsedData = parseBarcode(barcode);

    // 3. Get Supabase client
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({
        barcode,
        format: parsedData.format,
        parsed: parsedData,
        item: null,
        lot: null,
        actions: [],
        error: 'PERMISSION_DENIED',
        errorMessage: 'User not authenticated'
      } as ScanResult);
    }

    // 4. Database lookup - Try exact barcode match first
    let barcodeRecord = await lookupBarcodeExact(supabase, barcode);
    let item = null;
    let lot = null;

    if (barcodeRecord) {
      // Found exact barcode match
      item = barcodeRecord.item || null;
      lot = barcodeRecord.lot || null;
    } else {
      // Fallback: Try to match by parsed data (GTIN/SKU + lot)
      if (parsedData.gtin) {
        const fallbackResult = await lookupByParsedData(
          supabase,
          parsedData.gtin,
          parsedData.lot
        );
        item = fallbackResult.item;
        lot = fallbackResult.lot;

        // Create barcode record for future scans
        if (item) {
          barcodeRecord = await createBarcodeRecord(
            supabase,
            barcode,
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
      userId: user.id,
      barcodeValue: barcode,
      barcodeId: barcodeRecord?.id,
      scanResult: {
        format: parsedData.format,
        parsed: parsedData,
        item: item?.id,
        lot: lot?.id
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent')
    });

    // 7. Return result
    const result: ScanResult = {
      barcode,
      format: parsedData.format,
      parsed: parsedData,
      item,
      lot,
      barcodeRecord: barcodeRecord || undefined,
      actions,
      error: !item && !lot ? 'NOT_FOUND' : undefined,
      errorMessage: !item && !lot ? 'No matching item or lot found in database' : undefined
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Scan resolution error:', error);
    return NextResponse.json(
      {
        error: 'NETWORK_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

/**
 * Looks up barcode by exact value
 */
async function lookupBarcodeExact(supabase: any, barcodeValue: string) {
  const { data, error } = await supabase
    .from('barcodes')
    .select(`
      *,
      item:item_master(*),
      lot:item_lots(*, item:item_master(*))
    `)
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
  gtin: string,
  lotNumber?: string
) {
  // First, find item by SKU (using GTIN as SKU)
  const { data: item } = await supabase
    .from('item_master')
    .select('*')
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
  barcodeValue: string,
  barcodeType: string,
  itemId: string,
  lotId?: string,
  metadata?: any
) {
  const { data, error } = await supabase
    .from('barcodes')
    .insert({
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
    userId: string;
    barcodeValue: string;
    barcodeId?: string;
    scanResult: any;
    actionTaken?: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
) {
  const { error } = await supabase
    .from('barcode_scan_log')
    .insert({
      user_id: data.userId,
      barcode_value: data.barcodeValue,
      barcode_id: data.barcodeId,
      scan_result: data.scanResult,
      action_taken: data.actionTaken,
      ip_address: data.ipAddress,
      user_agent: data.userAgent
    });

  if (error) {
    console.error('Error logging scan event:', error);
  }
}
