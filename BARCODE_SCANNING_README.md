# Barcode Scanning & Label Printing System

Complete barcode scanning and label printing system for CureCore ERP with GS1-128 support, mobile-first camera interface, and automatic lot tracking.

## Features

### ✅ Barcode Scanning
- **Camera-based scanning** using @zxing/browser
- **Mobile-first design** with back camera auto-selection
- **Torch/flashlight support** for low-light environments
- **Manual input fallback** for keyboard entry
- **Multi-format support**: GS1-128, QR, EAN, CODE128, CODE39
- **Real-time parsing** and database lookup
- **Security features**: Input validation, rate limiting, audit logging

### ✅ GS1-128 Support
The system automatically parses GS1 Application Identifiers:
- **AI 01**: GTIN (Global Trade Item Number)
- **AI 10**: Batch/Lot number
- **AI 17**: Expiry date (YYMMDD)
- **AI 11**: Production date (YYMMDD)
- **AI 21**: Serial number
- **AI 30**: Quantity

### ✅ Label Printing
- **Lot labels**: 2" x 1" (144pt x 72pt) with QR codes
- **Finished product labels**: 2.25" x 1.25" (162pt x 90pt)
- **PDF generation** for direct printing
- **QR code integration** for quick scanning

### ✅ Database Architecture
- **item_master**: SKU and product information
- **item_lots**: Lot/batch tracking with expiry dates
- **barcodes**: Barcode registry with metadata
- **barcode_scan_log**: Complete audit trail
- **Row-level security (RLS)**: Organization-level isolation

## Installation

### 1. Install Dependencies

```bash
npm install @zxing/browser gs1-barcode-parser pdfkit qrcode
npm install -D @types/pdfkit @types/qrcode
```

### 2. Run Database Migration

```bash
# Apply the migration
supabase db push

# Or if using migrations folder
psql -d your_database -f supabase/migrations/20250111_barcode_scanning_system.sql
```

### 3. Verify Installation

Check that the following tables exist:
- `item_master`
- `item_lots`
- `barcodes`
- `barcode_scan_log`

## Usage

### Standalone Scan Page

Access the full-screen scanning interface at `/scan`:

```typescript
// Navigate to the scan page
router.push('/scan');
```

Features:
- Full-screen camera view
- Scan overlay with corner guides
- Manual input option
- Torch toggle (if supported)
- Result display with item/lot details

### Integrate into Existing UI

Use the `ScanModal` component for modal-based scanning:

```typescript
import ScanModal from '@/components/barcode/ScanModal';
import { ScanResult } from '@/types/barcode';

function MyComponent() {
  const [showScan, setShowScan] = useState(false);

  const handleScanConfirm = (result: ScanResult) => {
    // Auto-fill form fields
    if (result.item && result.lot) {
      setItemId(result.item.id);
      setLotNumber(result.lot.lot_number);
      setQuantity(result.lot.quantity);
    }
    setShowScan(false);
  };

  return (
    <>
      <Button onClick={() => setShowScan(true)}>
        📷 Scan Barcode
      </Button>

      <ScanModal
        open={showScan}
        onOpenChange={setShowScan}
        onConfirm={handleScanConfirm}
        title="Scan Lot Barcode"
        description="Position barcode within the frame"
        mode="both" // 'item' | 'lot' | 'both'
      />
    </>
  );
}
```

### Programmatic Barcode Resolution

Use the `resolveScan` server action directly:

```typescript
import { resolveScan } from '@/(scan)/actions/resolveScan';

// Resolve a barcode
const result = await resolveScan('01095011010209991710240630');

if (result.item) {
  console.log('Item:', result.item.name);
  console.log('SKU:', result.item.sku);
}

if (result.lot) {
  console.log('Lot:', result.lot.lot_number);
  console.log('Quantity:', result.lot.quantity);
  console.log('Expiry:', result.lot.expiry_date);
}

// Check available actions
console.log('Actions:', result.actions);
// Example: ['ADD_TO_BATCH', 'ADJUST_INVENTORY', 'VIEW_LOT', 'PRINT_LABEL']
```

### Label Generation

#### Generate Lot Label

```typescript
// Open label in new window (for printing)
window.open(`/api/labels/lot?id=${lotId}`, '_blank');

// Or download programmatically
const response = await fetch(`/api/labels/lot?id=${lotId}`);
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `lot-${lotNumber}.pdf`;
a.click();
```

#### Generate Finished Product Label

```typescript
window.open(`/api/labels/finished?batchId=${batchId}`, '_blank');
```

### Custom Barcode Parsing

Use the parsing utilities directly:

```typescript
import { parseBarcode, detectBarcodeFormat } from '@/lib/barcode/parser';

// Parse any barcode
const parsed = parseBarcode('01095011010209991710240630');

console.log('Format:', parsed.format); // 'GS1-128'
console.log('GTIN:', parsed.gtin);
console.log('Lot:', parsed.lot);
console.log('Expiry:', parsed.expiryDate);
```

### Generate QR Codes

```typescript
import { generateQRPayload } from '@/lib/barcode/parser';

const qrPayload = generateQRPayload({
  type: 'lot',
  orgId: 'org-uuid',
  itemSku: 'PROD-001',
  lotNumber: 'LOT-2024-001',
  quantity: 100,
  expiryDate: new Date('2025-12-31')
});

// Use with qrcode library
import QRCode from 'qrcode';
const qrDataUrl = await QRCode.toDataURL(qrPayload);
```

## API Reference

### Server Actions

#### `resolveScan(rawPayload: string): Promise<ScanResult>`

Resolves a barcode by parsing, database lookup, and action determination.

**Parameters:**
- `rawPayload`: Raw barcode string

**Returns:** `ScanResult` object containing:
- `barcode`: Original barcode value
- `format`: Detected format (GS1-128, QR, EAN, etc.)
- `parsed`: Parsed data (GTIN, lot, dates, etc.)
- `item`: Item master record (if found)
- `lot`: Lot record (if found)
- `actions`: Available actions array
- `error`: Error code (if any)
- `errorMessage`: Human-readable error

#### `updateScanAction(scanLogId: string, action: ScanAction): Promise<void>`

Updates the audit log with the action taken after a scan.

### API Routes

#### `GET /api/labels/lot?id={lotId}`

Generates a 2" x 1" PDF label for a lot with QR code.

**Response:** PDF file download

#### `GET /api/labels/finished?batchId={batchId}`

Generates a 2.25" x 1.25" PDF label for finished products.

**Response:** PDF file download

## Database Schema

### item_master
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| org_id | UUID | Organization ID (RLS) |
| sku | VARCHAR(100) | Stock keeping unit |
| name | VARCHAR(255) | Item name |
| description | TEXT | Item description |
| unit_of_measure | VARCHAR(50) | Unit (e.g., "kg", "units") |

### item_lots
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| org_id | UUID | Organization ID (RLS) |
| item_id | UUID | Reference to item_master |
| lot_number | VARCHAR(100) | Lot/batch number |
| quantity | DECIMAL(15,4) | Available quantity |
| expiry_date | DATE | Expiration date |
| manufacture_date | DATE | Manufacturing date |
| status | VARCHAR(50) | active, quarantine, consumed, expired |

### barcodes
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| org_id | UUID | Organization ID (RLS) |
| barcode_value | VARCHAR(255) | Barcode string |
| barcode_type | VARCHAR(50) | Format (GS1-128, QR, etc.) |
| item_id | UUID | Reference to item_master |
| lot_id | UUID | Reference to item_lots |
| metadata | JSONB | Parsed data storage |

### barcode_scan_log
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| org_id | UUID | Organization ID (RLS) |
| user_id | UUID | User who scanned |
| barcode_value | VARCHAR(255) | Scanned barcode |
| scan_result | JSONB | Full scan result |
| action_taken | VARCHAR(100) | Action performed |
| ip_address | INET | Request IP |
| user_agent | TEXT | Browser user agent |

## Security

### Input Validation
All barcode inputs are validated for:
- Maximum length (255 characters)
- Malicious content (XSS prevention)
- Type safety

### Row-Level Security (RLS)
All tables enforce organization isolation:
```sql
CREATE POLICY "org_isolation" ON [table]
  FOR ALL USING (org_id IN (SELECT current_user_orgs()));
```

### Audit Logging
Every scan is logged with:
- User ID
- IP address
- User agent
- Timestamp
- Scan result
- Action taken

### Rate Limiting
Recommended: Add rate limiting to scan endpoints (20 requests/minute per user).

## Troubleshooting

### Camera Access Denied
**Problem:** Browser blocks camera access

**Solution:**
1. Check browser permissions (chrome://settings/content/camera)
2. Ensure HTTPS connection (camera requires secure context)
3. Click "Retry" button after granting permissions

### Barcode Not Found
**Problem:** Scan succeeds but no database match

**Solution:**
1. Check that item exists in `item_master` with matching SKU
2. Verify lot exists in `item_lots` with matching lot_number
3. Create barcode record manually if needed:
```sql
INSERT INTO barcodes (org_id, barcode_value, barcode_type, item_id, lot_id)
VALUES ('org-id', 'barcode-value', 'GS1-128', 'item-id', 'lot-id');
```

### GS1 Parsing Fails
**Problem:** GS1-128 barcode not parsed correctly

**Solution:**
1. Check barcode format (should start with AI like "01")
2. Verify Group Separator (ASCII 29) between variable-length AIs
3. Use manual parsing fallback
4. Test with known good GS1 barcode: `01095011010209991710240630`

### Label Generation Fails
**Problem:** PDF label not generating

**Solution:**
1. Verify lot/batch exists in database
2. Check Supabase client initialization
3. Ensure user has permission (RLS policy)
4. Check server logs for detailed error

### Torch Not Working
**Problem:** Flashlight toggle has no effect

**Solution:**
1. Check if device supports torch (mobile only)
2. Verify camera permissions granted
3. Try different browser (Chrome/Safari work best)

## Performance Optimization

### Reduce Token Usage
The scan resolution uses database queries. To optimize:
1. Add indexes on frequently queried columns (already included)
2. Use connection pooling
3. Cache frequent lookups

### Faster Scanning
1. Use good lighting (reduces scan time)
2. Ensure barcode is in focus
3. Hold steady for 1-2 seconds
4. Use manual input for known barcodes

## Future Enhancements

Potential improvements:
- [ ] Batch scanning (multiple barcodes in sequence)
- [ ] Offline mode with sync queue
- [ ] Barcode generation for items
- [ ] Advanced search in scan history
- [ ] Custom label templates
- [ ] NFC tag support
- [ ] Bluetooth barcode scanner integration
- [ ] Analytics dashboard for scan metrics

## Support

For issues or questions:
1. Check this documentation
2. Review code examples in `/components/barcode/`
3. Check audit logs in `barcode_scan_log` table
4. Review browser console for errors

## License

Part of CureCore ERP system.
