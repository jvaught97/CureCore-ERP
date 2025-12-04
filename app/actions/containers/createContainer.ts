'use server';

import { createClient } from '@/app/utils/supabase/server';
import { getCurrentUserOrgId, getCurrentUserId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

interface CreateContainerInput {
  itemId: string;
  lotId: string;
  label?: string;
  // NEW WEIGHT MODEL: instead of tareWeight, we track:
  initialGrossWeight: number; // Required: bottle + ingredient weight
  intendedNetWeight: number; // Required: supplier's stated ingredient amount
  weightUnit: string;
  // Optional: link supplier barcode to this container
  supplierBarcodeValue?: string;
  containerType?: string;
  location?: string;
  status?: 'backstock' | 'active' | 'quarantine';
}

export async function createContainer(input: CreateContainerInput) {
  const supabase = await createClient();
  const orgId = await getCurrentUserOrgId(supabase);
  const userId = await getCurrentUserId(supabase);

  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .select('container_code_prefix, next_container_sequence')
    .eq('id', orgId)
    .single();

  if (orgError) {
    throw new Error(orgError.message);
  }

  const prefix = orgData?.container_code_prefix || 'CNT';
  const seq = orgData?.next_container_sequence ?? 1;
  const year = new Date().getFullYear();
  const containerCode = `${prefix}-${year}-${seq.toString().padStart(3, '0')}`;

  const { error: seqUpdateError } = await supabase
    .from('organizations')
    .update({ next_container_sequence: seq + 1 })
    .eq('id', orgId);

  if (seqUpdateError) {
    throw new Error(seqUpdateError.message);
  }

  // Auto-calculate tare weight: gross - intended_net
  // This is handled by the database trigger, but we calculate here for measurement record
  const calculatedTareWeight = input.initialGrossWeight - input.intendedNetWeight;

  const { data: container, error: containerError } = await supabase
    .from('inventory_containers')
    .insert({
      org_id: orgId,
      item_id: input.itemId,
      lot_id: input.lotId,
      container_code: containerCode,
      label: input.label,
      // NEW WEIGHT MODEL
      initial_gross_weight: input.initialGrossWeight,
      intended_net_weight: input.intendedNetWeight,
      calculated_tare_weight: calculatedTareWeight, // Auto-calculated by trigger, but explicit here
      current_gross_weight: input.initialGrossWeight,
      current_net_weight: input.intendedNetWeight,
      weight_unit: input.weightUnit,
      container_type: input.containerType,
      location: input.location || 'Warehouse',
      status: input.status || 'backstock',
      created_by: userId,
      last_weighed_at: new Date().toISOString(),
      last_weighed_by: userId
    })
    .select()
    .single();

  if (containerError) {
    throw new Error(containerError.message);
  }

  // Create internal barcode for container tracking (QR code on printed label)
  const { error: internalBarcodeError } = await supabase
    .from('barcodes')
    .insert({
      org_id: orgId,
      barcode_value: containerCode,
      barcode_type: 'QR', // Changed to QR for better mobile scanning
      container_id: container.id,
      source: 'internal',
      metadata: {
        type: 'container_tracking',
        created_at: new Date().toISOString()
      }
    });

  if (internalBarcodeError) {
    throw new Error(internalBarcodeError.message);
  }

  // If supplier barcode provided, link it to this container instance
  if (input.supplierBarcodeValue) {
    const { error: supplierBarcodeError } = await supabase
      .from('barcodes')
      .upsert({
        org_id: orgId,
        barcode_value: input.supplierBarcodeValue,
        barcode_type: 'supplier', // Could be GS1-128, EAN, etc.
        item_id: input.itemId,
        lot_id: input.lotId,
        container_id: container.id, // Link supplier barcode to this specific container
        source: 'supplier',
        metadata: {
          gross_weight: input.initialGrossWeight,
          intended_net_weight: input.intendedNetWeight,
          linked_at: new Date().toISOString()
        }
      }, {
        onConflict: 'org_id,barcode_value'
      });

    if (supplierBarcodeError) {
      throw new Error(supplierBarcodeError.message);
    }
  }

  // Create initial weight measurement for audit trail
  const { error: measurementError } = await supabase
    .from('weight_measurements')
    .insert({
      org_id: orgId,
      container_id: container.id,
      gross_weight: input.initialGrossWeight,
      tare_weight: calculatedTareWeight,
      net_weight: input.intendedNetWeight,
      unit: input.weightUnit,
      measurement_type: 'initial_setup',
      source: 'manual',
      measured_by: userId,
      notes: 'Initial container setup - weights from supplier label'
    });

  if (measurementError) {
    throw new Error(measurementError.message);
  }

  revalidatePath('/inventory');
  return container;
}
