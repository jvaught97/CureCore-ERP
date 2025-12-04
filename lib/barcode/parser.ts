// Note: gs1-barcode-parser library not compatible with current build setup
// Using manual parsing as primary method
export type BarcodeFormat = 'GS1-128' | 'QR' | 'EAN' | 'CODE128' | 'CODE39' | 'DATAMATRIX' | 'UNKNOWN';

export interface ParsedBarcode {
  raw: string;
  format: BarcodeFormat;
  gtin?: string; // AI 01 - Global Trade Item Number
  lot?: string; // AI 10 - Batch/Lot number
  serial?: string; // AI 21 - Serial number
  expiryDate?: Date; // AI 17 - Expiry date
  productionDate?: Date; // AI 11 - Production date
  quantity?: number; // AI 30 - Quantity
  [key: string]: any; // Additional parsed fields
}

/**
 * Detects the barcode format based on content and structure
 */
export function detectBarcodeFormat(rawPayload: string): BarcodeFormat {
  if (!rawPayload || rawPayload.length === 0) {
    return 'UNKNOWN';
  }

  // Check for GS1-128 (starts with FNC1 or contains GS1 AIs)
  if (rawPayload.startsWith(']C1') ||
      rawPayload.startsWith(']d2') ||
      /^\d{2,4}/.test(rawPayload)) { // Starts with 2-4 digit AI
    return 'GS1-128';
  }

  // Check for JSON (likely QR code with structured data)
  if (isJSON(rawPayload)) {
    return 'QR';
  }

  // Check for EAN-13 (13 digits)
  if (/^\d{13}$/.test(rawPayload)) {
    return 'EAN';
  }

  // Check for EAN-8 (8 digits)
  if (/^\d{8}$/.test(rawPayload)) {
    return 'EAN';
  }

  // Check for UPC-A (12 digits)
  if (/^\d{12}$/.test(rawPayload)) {
    return 'EAN';
  }

  // Default to CODE128 for alphanumeric
  if (/^[A-Za-z0-9\-_]+$/.test(rawPayload)) {
    return 'CODE128';
  }

  return 'UNKNOWN';
}

/**
 * Parses a barcode based on its detected format
 */
export function parseBarcode(rawPayload: string): ParsedBarcode {
  const format = detectBarcodeFormat(rawPayload);

  const baseResult: ParsedBarcode = {
    raw: rawPayload,
    format
  };

  try {
    switch (format) {
      case 'GS1-128':
        return { ...baseResult, ...parseGS1(rawPayload) };

      case 'QR':
        return { ...baseResult, ...parseQR(rawPayload) };

      case 'EAN':
        return { ...baseResult, gtin: rawPayload };

      case 'CODE128':
      case 'CODE39':
      default:
        return baseResult;
    }
  } catch (error) {
    console.error('Barcode parsing error:', error);
    return baseResult;
  }
}

/**
 * Parses GS1-128 barcodes using Application Identifiers
 */
function parseGS1(rawPayload: string): Partial<ParsedBarcode> {
  // Use manual parsing as primary method
  return parseGS1Manual(rawPayload);
}

/**
 * Manual GS1 parser as fallback
 */
function parseGS1Manual(payload: string): Partial<ParsedBarcode> {
  const parsed: Partial<ParsedBarcode> = {};
  let remaining = payload;

  // Remove prefix
  if (remaining.startsWith(']C1') || remaining.startsWith(']d2')) {
    remaining = remaining.substring(3);
  }

  // GS1 uses Group Separator (ASCII 29) or specific lengths
  const GS = String.fromCharCode(29);

  // Parse AI patterns
  const aiPatterns = [
    { ai: '01', length: 14, field: 'gtin' },
    { ai: '10', variable: true, field: 'lot' },
    { ai: '21', variable: true, field: 'serial' },
    { ai: '17', length: 6, field: 'expiryDate', isDate: true },
    { ai: '11', length: 6, field: 'productionDate', isDate: true },
    { ai: '30', variable: true, field: 'quantity', isNumber: true }
  ];

  for (const pattern of aiPatterns) {
    const aiIndex = remaining.indexOf(pattern.ai);
    if (aiIndex !== -1) {
      const valueStart = aiIndex + 2;
      let value: string;

      if (pattern.variable) {
        const gsIndex = remaining.indexOf(GS, valueStart);
        value = gsIndex !== -1
          ? remaining.substring(valueStart, gsIndex)
          : remaining.substring(valueStart);
      } else {
        value = remaining.substring(valueStart, valueStart + (pattern.length || 0));
      }

      if (pattern.isDate) {
        (parsed as any)[pattern.field] = parseGS1Date(value);
      } else if (pattern.isNumber) {
        (parsed as any)[pattern.field] = parseFloat(value);
      } else {
        (parsed as any)[pattern.field] = value;
      }
    }
  }

  return parsed;
}

/**
 * Parses GS1 date format (YYMMDD)
 */
function parseGS1Date(dateStr: string): Date | undefined {
  if (!dateStr || dateStr.length !== 6) {
    return undefined;
  }

  const yy = parseInt(dateStr.substring(0, 2), 10);
  const mm = parseInt(dateStr.substring(2, 4), 10);
  const dd = parseInt(dateStr.substring(4, 6), 10);

  // Assume 20XX for years 00-49, 19XX for 50-99
  const year = yy < 50 ? 2000 + yy : 1900 + yy;

  const date = new Date(year, mm - 1, dd);

  // Validate date
  if (isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

/**
 * Parses QR code with JSON payload
 */
function parseQR(rawPayload: string): Partial<ParsedBarcode> {
  try {
    const data = JSON.parse(rawPayload);
    return {
      ...data,
      gtin: data.gtin || data.sku || data.item,
      lot: data.lot || data.lotNumber || data.batch,
      serial: data.serial || data.serialNumber
    };
  } catch (error) {
    console.error('QR parsing error:', error);
    return {};
  }
}

/**
 * Checks if a string is valid JSON
 */
function isJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates a QR code payload for items, lots, batches, and containers
 */
export function generateQRPayload(data: {
  type: 'item' | 'lot' | 'batch' | 'container';
  orgId: string;
  itemSku?: string;
  lotNumber?: string;
  batchId?: string;
  containerId?: string;
  containerCode?: string;
  quantity?: number;
  expiryDate?: Date;
}): string {
  const payload: any = {
    type: data.type,
    org: data.orgId,
    timestamp: new Date().toISOString()
  };

  if (data.itemSku) payload.item = data.itemSku;
  if (data.lotNumber) payload.lot = data.lotNumber;
  if (data.batchId) payload.batch = data.batchId;
  if (data.containerId) payload.containerId = data.containerId;
  if (data.containerCode) payload.containerCode = data.containerCode;
  if (data.quantity) payload.qty = data.quantity;
  if (data.expiryDate) payload.exp = data.expiryDate.toISOString().split('T')[0];

  return JSON.stringify(payload);
}

/**
 * Validates barcode input for security
 */
export function validateBarcodeInput(input: string): { valid: boolean; error?: string } {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Barcode must be a non-empty string' };
  }

  if (input.length > 255) {
    return { valid: false, error: 'Barcode exceeds maximum length of 255 characters' };
  }

  // Check for potentially malicious content
  if (/<script|javascript:|on\w+=/i.test(input)) {
    return { valid: false, error: 'Invalid barcode content' };
  }

  return { valid: true };
}
