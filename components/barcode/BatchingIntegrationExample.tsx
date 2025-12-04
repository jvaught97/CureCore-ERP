'use client';

/**
 * Example component showing how to integrate barcode scanning into batching UI
 * This demonstrates adding lot inputs via scanning
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import ScanModal from '@/components/barcode/ScanModal';
import { ScanResult } from '@/types/barcode';
import { Camera, Printer } from 'lucide-react';

interface LotInput {
  id: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  lotId?: string;
  lotNumber: string;
  quantity: number;
  unitOfMeasure?: string;
}

export default function BatchingIntegrationExample() {
  const [showScanModal, setShowScanModal] = useState(false);
  const [lotInputs, setLotInputs] = useState<LotInput[]>([]);
  const [currentLotNumber, setCurrentLotNumber] = useState('');
  const [currentQuantity, setCurrentQuantity] = useState('');

  // Handle scan confirmation
  const handleScanConfirm = (result: ScanResult) => {
    if (!result.item) return;

    // Auto-populate fields from scan result
    if (result.lot) {
      // Full lot scan - add directly to inputs
      const newLotInput: LotInput = {
        id: crypto.randomUUID(),
        itemId: result.item.id,
        itemName: result.item.name,
        itemSku: result.item.sku,
        lotId: result.lot.id,
        lotNumber: result.lot.lot_number,
        quantity: result.lot.quantity,
        unitOfMeasure: result.item.unit_of_measure
      };

      setLotInputs([...lotInputs, newLotInput]);

      // Optional: Auto-deduct from inventory here
      // handleInventoryDeduction(newLotInput);
    } else {
      // Item-only scan - populate manual entry fields
      setCurrentLotNumber(result.parsed.lot || '');
      setCurrentQuantity(result.parsed.quantity?.toString() || '');
    }

    setShowScanModal(false);
  };

  // Handle manual lot addition
  const handleAddLot = () => {
    if (!currentLotNumber || !currentQuantity) return;

    const newLotInput: LotInput = {
      id: crypto.randomUUID(),
      itemId: '', // Would come from item selection
      itemName: 'Manual Entry',
      itemSku: '',
      lotNumber: currentLotNumber,
      quantity: parseFloat(currentQuantity)
    };

    setLotInputs([...lotInputs, newLotInput]);
    setCurrentLotNumber('');
    setCurrentQuantity('');
  };

  // Handle print label
  const handlePrintLabel = (lotId?: string) => {
    if (!lotId) return;

    // Open label generation API in new window
    window.open(`/api/labels/lot?id=${lotId}`, '_blank');
  };

  // Remove lot input
  const handleRemoveLot = (id: string) => {
    setLotInputs(lotInputs.filter(lot => lot.id !== id));
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Add Lot Inputs</h2>

        {/* Manual Entry Section */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="lotNumber">Lot Number</Label>
              <Input
                id="lotNumber"
                value={currentLotNumber}
                onChange={(e) => setCurrentLotNumber(e.target.value)}
                placeholder="Enter lot number"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={currentQuantity}
                onChange={(e) => setCurrentQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleAddLot}
              disabled={!currentLotNumber || !currentQuantity}
              variant="outline"
              className="flex-1"
            >
              Add Manually
            </Button>
            <Button
              onClick={() => setShowScanModal(true)}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Scan Barcode
            </Button>
          </div>
        </div>
      </Card>

      {/* Lot Inputs List */}
      {lotInputs.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Added Lots ({lotInputs.length})</h3>
          <div className="space-y-3">
            {lotInputs.map((lot) => (
              <div
                key={lot.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium">{lot.itemName}</div>
                  <div className="text-sm text-gray-600">
                    Lot: {lot.lotNumber} | Qty: {lot.quantity} {lot.unitOfMeasure || 'units'}
                  </div>
                  {lot.itemSku && (
                    <div className="text-xs text-gray-500">SKU: {lot.itemSku}</div>
                  )}
                </div>

                <div className="flex gap-2">
                  {lot.lotId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrintLabel(lot.lotId)}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveLot(lot.id)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Scan Modal */}
      <ScanModal
        open={showScanModal}
        onOpenChange={setShowScanModal}
        onConfirm={handleScanConfirm}
        title="Scan Lot Barcode"
        description="Scan a barcode to auto-fill lot information"
        mode="both"
      />

      {/* Usage Instructions */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold mb-2">How to Use Barcode Scanning</h3>
        <ul className="text-sm space-y-1 text-gray-700">
          <li>1. Click "Scan Barcode" to open the camera scanner</li>
          <li>2. Position the barcode within the frame</li>
          <li>3. The system will auto-detect and lookup the barcode</li>
          <li>4. Click "Use This Barcode" to add it to your batch</li>
          <li>5. Alternatively, use "Manual" to type the barcode</li>
          <li>6. Print labels using the printer icon on each lot</li>
        </ul>
      </Card>
    </div>
  );
}
