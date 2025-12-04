# Barcode Scanning - Quick Reference

Fast reference guide for developers integrating barcode scanning into CureCore ERP.

## 🚀 Quick Start (3 Steps)

### 1. Apply Database Migration
```bash
supabase db push
```

### 2. Import and Use
```typescript
import ScanModal from '@/components/barcode/ScanModal';
import { ScanResult } from '@/types/barcode';

const [showScan, setShowScan] = useState(false);

<ScanModal
  open={showScan}
  onOpenChange={setShowScan}
  onConfirm={(result: ScanResult) => {
    console.log(result.item, result.lot);
  }}
/>
```

### 3. Print Labels
```typescript
import { printLotLabel } from '@/lib/barcode/labels';

printLotLabel(lotId); // Opens print dialog
```

## 📦 Common Use Cases

### Use Case 1: Add Scan to Input Form

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ScanModal from '@/components/barcode/ScanModal';

export default function MyForm() {
  const [showScan, setShowScan] = useState(false);
  const [lotNumber, setLotNumber] = useState('');

  return (
    <>
      <Input value={lotNumber} onChange={e => setLotNumber(e.target.value)} />
      <Button onClick={() => setShowScan(true)}>📷 Scan</Button>

      <ScanModal
        open={showScan}
        onOpenChange={setShowScan}
        onConfirm={(result) => {
          if (result.lot) {
            setLotNumber(result.lot.lot_number);
          }
        }}
      />
    </>
  );
}
```

### Use Case 2: Batch Input with Scanning

```typescript
import ScanModal from '@/components/barcode/ScanModal';

const [lots, setLots] = useState<LotInput[]>([]);

<ScanModal
  open={showScan}
  onOpenChange={setShowScan}
  onConfirm={(result) => {
    if (result.lot && result.item) {
      setLots([...lots, {
        id: crypto.randomUUID(),
        itemId: result.item.id,
        lotNumber: result.lot.lot_number,
        quantity: result.lot.quantity
      }]);
    }
  }}
  mode="lot" // Only accept lot scans
/>
```

### Use Case 3: Print Label After Creating Lot

```typescript
import { printLotLabel } from '@/lib/barcode/labels';

async function handleCreateLot(lotData) {
  const { data: lot } = await supabase
    .from('item_lots')
    .insert(lotData)
    .select()
    .single();

  if (lot) {
    // Immediately print label
    printLotLabel(lot.id);
  }
}
```

### Use Case 4: Programmatic Barcode Resolution

```typescript
import { resolveScan } from '@/(scan)/actions/resolveScan';

async function lookupBarcode(barcode: string) {
  const result = await resolveScan(barcode);

  if (result.error) {
    alert(result.errorMessage);
    return;
  }

  // Use the result
  console.log('Found item:', result.item?.name);
  console.log('Found lot:', result.lot?.lot_number);
  console.log('Available actions:', result.actions);
}
```

### Use Case 5: Generate QR Code for Item

```typescript
import QRCode from 'qrcode';
import { generateQRPayload } from '@/lib/barcode/parser';

async function generateItemQR(item, lot) {
  const payload = generateQRPayload({
    type: 'lot',
    orgId: item.org_id,
    itemSku: item.sku,
    lotNumber: lot.lot_number,
    quantity: lot.quantity
  });

  const qrDataUrl = await QRCode.toDataURL(payload);
  // Display in <img src={qrDataUrl} />
}
```

## 🔧 API Quick Reference

### Components

| Component | Import | Use Case |
|-----------|--------|----------|
| ScanModal | `@/components/barcode/ScanModal` | Modal scanning UI |
| ScanPage | Navigate to `/scan` | Full-screen scanning |
| ScanOverlay | `@/components/barcode/ScanOverlay` | Scan UI overlay |

### Server Actions

| Function | Import | Purpose |
|----------|--------|---------|
| resolveScan() | `@/(scan)/actions/resolveScan` | Parse and lookup barcode |
| updateScanAction() | `@/(scan)/actions/resolveScan` | Update audit log |

### Utilities

| Function | Import | Purpose |
|----------|--------|---------|
| parseBarcode() | `@/lib/barcode/parser` | Parse barcode format |
| detectBarcodeFormat() | `@/lib/barcode/parser` | Detect format |
| generateQRPayload() | `@/lib/barcode/parser` | Create QR data |
| printLotLabel() | `@/lib/barcode/labels` | Print lot label |
| printFinishedLabel() | `@/lib/barcode/labels` | Print finished label |
| downloadLotLabel() | `@/lib/barcode/labels` | Download as PDF |

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/labels/lot?id={lotId}` | GET | Generate lot label PDF |
| `/api/labels/finished?batchId={id}` | GET | Generate finished label PDF |

## 📊 Database Quick Reference

### Query Examples

**Find item by SKU:**
```sql
SELECT * FROM item_master WHERE org_id = $1 AND sku = $2;
```

**Find lot by number:**
```sql
SELECT * FROM item_lots WHERE org_id = $1 AND lot_number = $2;
```

**Lookup barcode:**
```sql
SELECT b.*, i.*, l.*
FROM barcodes b
LEFT JOIN item_master i ON b.item_id = i.id
LEFT JOIN item_lots l ON b.lot_id = l.id
WHERE b.org_id = $1 AND b.barcode_value = $2;
```

**Create barcode record:**
```sql
INSERT INTO barcodes (org_id, barcode_value, barcode_type, item_id, lot_id, metadata)
VALUES ($1, $2, $3, $4, $5, $6);
```

**Get scan history:**
```sql
SELECT * FROM barcode_scan_log
WHERE org_id = $1 AND user_id = $2
ORDER BY created_at DESC
LIMIT 50;
```

## 🎨 Styling Reference

### ScanModal Props

```typescript
interface ScanModalProps {
  open: boolean;              // Control visibility
  onOpenChange: (open: boolean) => void; // Handle close
  onConfirm: (result: ScanResult) => void; // Handle result
  title?: string;             // Modal title
  description?: string;       // Modal description
  mode?: 'item' | 'lot' | 'both'; // Filter results
}
```

### ScanResult Type

```typescript
interface ScanResult {
  barcode: string;            // Original barcode
  format: string;             // 'GS1-128', 'QR', 'EAN', etc.
  parsed: ParsedBarcode;      // Parsed data
  item: ItemMaster | null;    // Found item
  lot: ItemLot | null;        // Found lot
  barcodeRecord?: Barcode;    // Barcode DB record
  actions: ScanAction[];      // Available actions
  error?: string;             // Error code
  errorMessage?: string;      // Error description
}
```

### ParsedBarcode Fields

```typescript
interface ParsedBarcode {
  raw: string;                // Original value
  format: BarcodeFormat;      // Detected format
  gtin?: string;              // AI 01 - GTIN
  lot?: string;               // AI 10 - Lot number
  serial?: string;            // AI 21 - Serial
  expiryDate?: Date;          // AI 17 - Expiry
  productionDate?: Date;      // AI 11 - Production
  quantity?: number;          // AI 30 - Quantity
}
```

## 🔐 Security Checklist

- ✅ All tables have RLS policies
- ✅ Input validation (max 255 chars, XSS check)
- ✅ Audit logging enabled
- ✅ Server-side parsing only
- ✅ Organization isolation enforced
- ⚠️ Add rate limiting (recommended)

## 🐛 Debugging

### Enable Console Logging

```typescript
// In resolveScan.ts
console.log('Barcode parsed:', parsedData);
console.log('Lookup result:', result);

// In ScanModal.tsx
console.log('Scan result:', lastScan);
```

### Check Audit Logs

```sql
SELECT * FROM barcode_scan_log
WHERE org_id = 'your-org-id'
ORDER BY created_at DESC
LIMIT 10;
```

### Test Barcode Parsing

```typescript
import { parseBarcode } from '@/lib/barcode/parser';

const result = parseBarcode('01095011010209991710240630');
console.log(result);
// {
//   raw: '01095011010209991710240630',
//   format: 'GS1-128',
//   gtin: '09501101020999',
//   expiryDate: 2024-06-30T00:00:00.000Z
// }
```

## 📱 Mobile Considerations

### Camera Permissions
- Requires HTTPS (or localhost)
- Request permissions on first use
- Show clear permission denied message

### Torch Support
- Only available on mobile devices
- Check with `getSupportedConstraints().torch`
- iOS Safari and Chrome support

### Performance
- Use back camera for better quality
- Ensure good lighting
- Hold steady for 1-2 seconds

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| Camera not loading | Check HTTPS, browser permissions |
| Barcode not found | Verify item/lot exists in DB |
| GS1 parse error | Check barcode format, try manual input |
| Label not generating | Verify lot exists, check RLS permissions |
| Torch not working | Mobile only, check browser support |

## 📚 More Info

- Full Documentation: [BARCODE_SCANNING_README.md](BARCODE_SCANNING_README.md)
- Implementation Details: [BARCODE_IMPLEMENTATION_SUMMARY.md](BARCODE_IMPLEMENTATION_SUMMARY.md)
- Integration Example: `components/barcode/BatchingIntegrationExample.tsx`

## 💡 Pro Tips

1. **Pre-create barcodes** for faster scans (insert into `barcodes` table)
2. **Use manual input** for known barcodes (faster than camera)
3. **Batch print labels** using `batchPrintLotLabels()`
4. **Cache QR payloads** for repeated label generation
5. **Index frequently scanned fields** for performance
6. **Log actions** using `updateScanAction()` for analytics

## ⚡ Performance Tips

```typescript
// Cache scan results in component state
const [scanCache, setScanCache] = useState<Map<string, ScanResult>>(new Map());

async function cachedResolve(barcode: string) {
  if (scanCache.has(barcode)) {
    return scanCache.get(barcode)!;
  }

  const result = await resolveScan(barcode);
  setScanCache(new Map(scanCache).set(barcode, result));
  return result;
}
```

## 🎯 Next Steps

1. Run migration: `supabase db push`
2. Test at `/scan` page
3. Integrate `ScanModal` into your UI
4. Add label printing to lot creation flow
5. Review audit logs for compliance
