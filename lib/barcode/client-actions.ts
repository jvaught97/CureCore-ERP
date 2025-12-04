'use client';

import { ScanResult } from '@/types/barcode';

/**
 * Client-side wrapper for barcode scanning
 * This calls the server action via an API route
 */
export async function resolveScan(rawPayload: string): Promise<ScanResult> {
  try {
    const response = await fetch('/api/barcode/resolve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ barcode: rawPayload }),
    });

    if (!response.ok) {
      throw new Error('Failed to resolve barcode');
    }

    return await response.json();
  } catch (error) {
    console.error('Barcode resolution error:', error);
    return {
      barcode: rawPayload,
      format: 'UNKNOWN',
      parsed: { raw: rawPayload, format: 'UNKNOWN' },
      item: null,
      lot: null,
      actions: [],
      error: 'NETWORK_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
