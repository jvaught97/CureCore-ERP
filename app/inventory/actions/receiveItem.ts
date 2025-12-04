'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export interface ReceiveItemInput {
  itemId: string;
  lotNumber: string;
  quantity: number;
  expiryDate?: string;
  manufactureDate?: string;
  supplierId?: string;
  purchasePrice?: number;
  notes?: string;
}

export interface ReceiveItemResult {
  success: boolean;
  lotId?: string;
  error?: string;
  errorDetails?: string;
}

/**
 * Receive an item into inventory via barcode scanning
 * Creates or updates lot records and updates inventory quantities
 */
export async function receiveItem(input: ReceiveItemInput): Promise<ReceiveItemResult> {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'Unauthorized',
        errorDetails: 'User not authenticated'
      };
    }

    // Check if lot already exists
    const { data: existingLot } = await supabase
      .from('item_lots')
      .select('*')
      .eq('item_id', input.itemId)
      .eq('lot_number', input.lotNumber)
      .single();

    let lotId: string;

    if (existingLot) {
      // Update existing lot - add to quantity
      const newQuantity = parseFloat(existingLot.quantity) + input.quantity;

      const { error: updateError } = await supabase
        .from('item_lots')
        .update({
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLot.id);

      if (updateError) {
        console.error('Error updating lot:', updateError);
        return {
          success: false,
          error: 'Failed to update lot',
          errorDetails: updateError.message
        };
      }

      lotId = existingLot.id;
    } else {
      // Create new lot
      const { data: newLot, error: insertError } = await supabase
        .from('item_lots')
        .insert({
          item_id: input.itemId,
          lot_number: input.lotNumber,
          quantity: input.quantity,
          expiry_date: input.expiryDate || null,
          manufacture_date: input.manufactureDate || null,
          status: 'active'
        })
        .select()
        .single();

      if (insertError || !newLot) {
        console.error('Error creating lot:', insertError);
        return {
          success: false,
          error: 'Failed to create lot',
          errorDetails: insertError?.message
        };
      }

      lotId = newLot.id;
    }

    // Log the receiving transaction
    await supabase
      .from('barcode_scan_log')
      .insert({
        user_id: user.id,
        barcode_value: input.lotNumber,
        scan_result: {
          action: 'RECEIVE',
          itemId: input.itemId,
          lotNumber: input.lotNumber,
          quantity: input.quantity,
          supplierId: input.supplierId,
          purchasePrice: input.purchasePrice
        },
        action_taken: 'RECEIVE_ITEM'
      });

    // Revalidate inventory page
    revalidatePath('/inventory');

    return {
      success: true,
      lotId
    };
  } catch (error) {
    console.error('Receive item error:', error);
    return {
      success: false,
      error: 'Unexpected error',
      errorDetails: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get receiving history for current session
 */
export async function getReceivingHistory(limit: number = 20) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, data: [] };
    }

    const { data, error } = await supabase
      .from('barcode_scan_log')
      .select(`
        id,
        barcode_value,
        scan_result,
        action_taken,
        created_at
      `)
      .eq('user_id', user.id)
      .eq('action_taken', 'RECEIVE_ITEM')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching receiving history:', error);
      return { success: false, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Get receiving history error:', error);
    return { success: false, data: [] };
  }
}
