/**
 * Label printing utilities and helpers
 */

/**
 * Opens a label in a new window for printing
 */
export function printLotLabel(lotId: string) {
  const url = `/api/labels/lot?id=${lotId}`;
  window.open(url, '_blank', 'width=800,height=600');
}

/**
 * Opens a finished product label in a new window for printing
 */
export function printFinishedLabel(batchId: string) {
  const url = `/api/labels/finished?batchId=${batchId}`;
  window.open(url, '_blank', 'width=800,height=600');
}

/**
 * Downloads a lot label as PDF
 */
export async function downloadLotLabel(lotId: string, filename?: string) {
  try {
    const response = await fetch(`/api/labels/lot?id=${lotId}`);

    if (!response.ok) {
      throw new Error('Failed to generate label');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `lot-label-${lotId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Label download error:', error);
    throw error;
  }
}

/**
 * Downloads a finished product label as PDF
 */
export async function downloadFinishedLabel(batchId: string, filename?: string) {
  try {
    const response = await fetch(`/api/labels/finished?batchId=${batchId}`);

    if (!response.ok) {
      throw new Error('Failed to generate label');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `finished-label-${batchId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Label download error:', error);
    throw error;
  }
}

/**
 * Batch print multiple lot labels
 */
export async function batchPrintLotLabels(lotIds: string[]) {
  for (const lotId of lotIds) {
    printLotLabel(lotId);
    // Small delay to avoid popup blocker
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Generate label data URL for preview (without downloading)
 */
export async function getLabelPreview(
  type: 'lot' | 'finished',
  id: string
): Promise<string> {
  const url = type === 'lot'
    ? `/api/labels/lot?id=${id}`
    : `/api/labels/finished?batchId=${id}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to generate label preview');
  }

  const blob = await response.blob();
  return window.URL.createObjectURL(blob);
}

/**
 * Print multiple labels at once (opens in tabs)
 */
export function printMultipleLabels(labels: Array<{ type: 'lot' | 'finished', id: string }>) {
  labels.forEach((label, index) => {
    setTimeout(() => {
      if (label.type === 'lot') {
        printLotLabel(label.id);
      } else {
        printFinishedLabel(label.id);
      }
    }, index * 150); // Stagger to avoid popup blocker
  });
}

/**
 * Check if browser supports direct printing
 */
export function canPrint(): boolean {
  return typeof window !== 'undefined' && 'print' in window;
}

/**
 * Label size configurations (in points: 1 inch = 72 points)
 */
export const LABEL_SIZES = {
  LOT: {
    width: 144, // 2 inches
    height: 72, // 1 inch
    name: '2" x 1"'
  },
  FINISHED: {
    width: 162, // 2.25 inches
    height: 90, // 1.25 inches
    name: '2.25" x 1.25"'
  },
  CUSTOM: {
    width: (widthInches: number) => widthInches * 72,
    height: (heightInches: number) => heightInches * 72
  }
} as const;

/**
 * Validate label printer configuration
 */
export interface PrinterConfig {
  dpi: number;
  paperWidth: number; // in inches
  paperHeight: number; // in inches
}

export function validatePrinterConfig(config: PrinterConfig): boolean {
  return (
    config.dpi > 0 &&
    config.paperWidth > 0 &&
    config.paperHeight > 0
  );
}

/**
 * Calculate optimal DPI for label printing
 * Returns recommended DPI based on label size
 */
export function getRecommendedDPI(labelType: 'lot' | 'finished'): number {
  // Smaller labels need higher DPI for clarity
  return labelType === 'lot' ? 300 : 203;
}
