'use server';

import { createClient } from '@/app/utils/supabase/server';
import { getCurrentUserOrgId, getCurrentUserId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

interface CaptureWeightInput {
  containerId: string;
  grossWeight: number;
  unit: string;
  source: string;
  measurementType: 'inventory_count' | 'production_use' | 'adjustment' | 'refill';
  batchId?: string;
  notes?: string;
}

export async function captureWeight(input: CaptureWeightInput) {
  const supabase = await createClient();
  const orgId = await getCurrentUserOrgId(supabase);
  const userId = await getCurrentUserId(supabase);

  const { data: container, error: fetchError } = await supabase
    .from('inventory_containers')
    .select('*')
    .eq('id', input.containerId)
    .eq('org_id', orgId)
    .single();

  if (fetchError || !container) {
    throw new Error('Container not found');
  }

  // NEW: Use refined tare weight if available, else use calculated tare
  const tare = container.refined_tare_weight || container.calculated_tare_weight || 0;
  const netWeight = input.grossWeight - tare;

  if (netWeight < 0) {
    throw new Error(
      `Net weight is negative (${netWeight.toFixed(2)}${input.unit}). Wrong container or tare needs adjustment?`
    );
  }

  const newStatus = netWeight <= 0 ? 'empty' : container.status;

  const { error: updateError } = await supabase
    .from('inventory_containers')
    .update({
      current_gross_weight: input.grossWeight,
      current_net_weight: netWeight,
      last_weighed_at: new Date().toISOString(),
      last_weighed_by: userId,
      updated_at: new Date().toISOString(),
      status: newStatus
    })
    .eq('id', input.containerId)
    .eq('org_id', orgId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { data: measurement, error: measurementError } = await supabase
    .from('weight_measurements')
    .insert({
      org_id: orgId,
      container_id: input.containerId,
      gross_weight: input.grossWeight,
      tare_weight: tare,
      net_weight: netWeight,
      unit: input.unit,
      measurement_type: input.measurementType,
      source: input.source,
      batch_id: input.batchId,
      notes: input.notes,
      measured_by: userId
    })
    .select()
    .single();

  if (measurementError) {
    throw new Error(measurementError.message);
  }

  revalidatePath('/inventory');

  return {
    container: { ...container, current_gross_weight: input.grossWeight, current_net_weight: netWeight, status: newStatus },
    measurement
  };
}
