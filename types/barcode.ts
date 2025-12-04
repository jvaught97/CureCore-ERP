import { ParsedBarcode } from '@/lib/barcode/parser';

export interface ItemMaster {
  id: string;
  org_id: string;
  sku: string;
  name: string;
  description?: string;
  unit_of_measure?: string;
  created_at: string;
  updated_at: string;
}

export interface ItemLot {
  id: string;
  org_id: string;
  item_id: string;
  lot_number: string;
  quantity: number;
  expiry_date?: string;
  manufacture_date?: string;
  status: 'active' | 'quarantine' | 'consumed' | 'expired';
  created_at: string;
  updated_at: string;
  item?: ItemMaster;
}

export interface Barcode {
  id: string;
  org_id: string;
  barcode_value: string;
  barcode_type: string;
  item_id?: string;
  lot_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  item?: ItemMaster;
  lot?: ItemLot;
}

export interface BarcodeScanLog {
  id: string;
  org_id: string;
  user_id: string;
  barcode_value: string;
  barcode_id?: string;
  scan_result?: Record<string, any>;
  action_taken?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export type ScanAction =
  | 'CREATE_ITEM'
  | 'CREATE_LOT'
  | 'VIEW_ITEM'
  | 'VIEW_LOT'
  | 'ADD_TO_BATCH'
  | 'ADJUST_INVENTORY'
  | 'PRINT_LABEL';

export interface ScanResult {
  barcode: string;
  format: string;
  parsed: ParsedBarcode;
  item: ItemMaster | null;
  lot: ItemLot | null;
  barcodeRecord?: Barcode;
  actions: ScanAction[];
  error?: 'NOT_FOUND' | 'INVALID_FORMAT' | 'NETWORK_ERROR' | 'PERMISSION_DENIED';
  errorMessage?: string;
}

export interface ScanPageProps {
  onConfirm?: (result: ScanResult) => void;
  onCancel?: () => void;
  mode?: 'item' | 'lot' | 'both';
  autoClose?: boolean;
}

export interface LabelGenerationRequest {
  type: 'lot' | 'finished';
  lotId?: string;
  batchId?: string;
  itemId?: string;
  customData?: Record<string, any>;
}

export interface LabelData {
  qrCodeDataUrl: string;
  sku: string;
  itemName: string;
  lotNumber?: string;
  quantity?: number;
  unitOfMeasure?: string;
  expiryDate?: string;
  manufactureDate?: string;
  batchId?: string;
}
