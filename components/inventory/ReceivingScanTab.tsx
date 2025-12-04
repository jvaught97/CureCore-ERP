'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ScanModal from '@/components/barcode/ScanModal';
import { ScanResult } from '@/types/barcode';
import { receiveItem, getReceivingHistory, ReceiveItemInput } from '@/app/inventory/actions/receiveItem';
import { printLotLabel } from '@/lib/barcode/labels';
import { Camera, Package, CheckCircle, AlertCircle, Printer, Loader2, Sparkles, ArrowUpRight, Download } from 'lucide-react';
import { useTheme } from '@/lib/context/ThemeContext';
import {
  getTextColor,
  getTextMuted,
  getTextLight,
  getCardBackground,
  getBorderColor
} from '@/lib/utils/themeUtils';

interface ReceivingSession {
  id: string;
  itemName: string;
  itemSku: string;
  lotNumber: string;
  quantity: number;
  timestamp: string;
}

export default function ReceivingScanTab() {
  const [showScanModal, setShowScanModal] = useState(false);
  const [scannedResult, setScannedResult] = useState<ScanResult | null>(null);
  const [quantity, setQuantity] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [notes, setNotes] = useState('');
  const [receiving, setReceiving] = useState(false);
  const [receiveSuccess, setReceiveSuccess] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);
  const [receivedLotId, setReceivedLotId] = useState<string | null>(null);
  const [sessionHistory, setSessionHistory] = useState<ReceivingSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Theme integration
  const { mode } = useTheme();
  const textColor = getTextColor(mode);
  const textMuted = getTextMuted(mode);
  const textLight = getTextLight(mode);
  const borderColor = getBorderColor(mode);
  const bgCard = getCardBackground(mode);

  // Load receiving history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    const result = await getReceivingHistory(10);
    if (result.success && result.data) {
      const mapped: ReceivingSession[] = result.data.map((log: any) => ({
        id: log.id,
        itemName: log.scan_result?.itemId || 'Unknown',
        itemSku: log.barcode_value,
        lotNumber: log.scan_result?.lotNumber || '',
        quantity: log.scan_result?.quantity || 0,
        timestamp: log.created_at
      }));
      setSessionHistory(mapped);
    }
    setLoadingHistory(false);
  };

  const handleScanConfirm = (result: ScanResult) => {
    setScannedResult(result);
    setShowScanModal(false);
    setReceiveSuccess(false);
    setReceiveError(null);

    // Auto-populate fields from scan result
    if (result.lot) {
      setQuantity(result.lot.quantity?.toString() || '');
    }
    if (result.parsed.quantity) {
      setQuantity(result.parsed.quantity.toString());
    }
  };

  const handleReceive = async () => {
    if (!scannedResult || !scannedResult.item) {
      setReceiveError('No item scanned');
      return;
    }

    if (!quantity || parseFloat(quantity) <= 0) {
      setReceiveError('Please enter a valid quantity');
      return;
    }

    setReceiving(true);
    setReceiveError(null);
    setReceiveSuccess(false);

    const input: ReceiveItemInput = {
      itemId: scannedResult.item.id,
      lotNumber: scannedResult.lot?.lot_number || scannedResult.parsed.lot || scannedResult.barcode,
      quantity: parseFloat(quantity),
      expiryDate: scannedResult.lot?.expiry_date ||
                  (scannedResult.parsed.expiryDate ? scannedResult.parsed.expiryDate.toISOString().split('T')[0] : undefined),
      manufactureDate: scannedResult.lot?.manufacture_date ||
                      (scannedResult.parsed.productionDate ? scannedResult.parsed.productionDate.toISOString().split('T')[0] : undefined),
      supplierId: supplierId || undefined,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
      notes: notes || undefined
    };

    const result = await receiveItem(input);

    setReceiving(false);

    if (result.success) {
      setReceiveSuccess(true);
      setReceivedLotId(result.lotId || null);

      // Add to session history
      setSessionHistory([
        {
          id: result.lotId || crypto.randomUUID(),
          itemName: scannedResult.item.name,
          itemSku: scannedResult.item.sku,
          lotNumber: input.lotNumber,
          quantity: input.quantity,
          timestamp: new Date().toISOString()
        },
        ...sessionHistory
      ]);

      // Reset form after 2 seconds
      setTimeout(() => {
        resetForm();
      }, 2000);
    } else {
      setReceiveError('error' in result ? result.error : 'Failed to receive item');
    }
  };

  const resetForm = () => {
    setScannedResult(null);
    setQuantity('');
    setSupplierId('');
    setPurchasePrice('');
    setNotes('');
    setReceiveSuccess(false);
    setReceiveError(null);
    setReceivedLotId(null);
  };

  const handlePrintLabel = (lotId: string) => {
    printLotLabel(lotId);
  };

  return (
    <div className="space-y-6">
      {/* Hero Metrics Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid gap-6 md:grid-cols-3">
        {[
          {
            label: 'Received Today',
            value: sessionHistory.filter(s =>
              new Date(s.timestamp).toDateString() === new Date().toDateString()
            ).length,
            helper: "Today's receipts"
          },
          {
            label: 'This Week',
            value: sessionHistory.filter(s => {
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return new Date(s.timestamp) >= weekAgo;
            }).length,
            helper: 'Last 7 days'
          },
          {
            label: 'Total Items',
            value: sessionHistory.reduce((sum, s) => sum + s.quantity, 0),
            helper: 'All time'
          }
        ].map((metric) => (
          <div
            key={metric.label}
            className={`relative overflow-hidden rounded-2xl border ${borderColor} ${bgCard} p-6 ${textColor} shadow-xl`}
          >
            <div className={`absolute inset-0 ${
              mode === 'neon'
                ? 'bg-gradient-to-br from-white/10 to-transparent'
                : 'bg-gradient-to-br from-[#174940]/5 to-transparent'
            }`} />
            <div className="relative flex items-center justify-between">
              <div>
                <p className={`text-sm uppercase tracking-[0.3em] ${textLight}`}>{metric.label}</p>
                <p className="text-3xl font-bold mt-2">{metric.value}</p>
                <p className={`text-xs ${textLight} mt-1`}>{metric.helper}</p>
              </div>
              <ArrowUpRight className="w-6 h-6 text-[#48A999]" />
            </div>
          </div>
        ))}
      </div>

      {/* Premium Header */}
      <div className={`border-b ${borderColor} ${bgCard}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#48A999] animate-pulse" />
              <p className="text-sm uppercase tracking-[0.3em] text-[#48A999]">Receiving Command</p>
            </div>
            <h1 className={`text-3xl md:text-4xl font-semibold ${textColor} mt-2`}>Receive Inventory</h1>
            <p className={`${textMuted} text-sm md:text-base`}>
              Scan barcodes to receive items into inventory with automatic lot tracking
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowScanModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white px-6 py-3 rounded-full shadow-lg shadow-[#174940]/30 hover:scale-[1.02] transition"
            >
              <Camera className="w-5 h-5" />
              Scan Barcode
            </button>
          </div>
        </div>
      </div>

      {/* Action Ribbon */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className={`${bgCard} rounded-2xl border ${borderColor} p-6 ${textColor} shadow-lg flex flex-col gap-4 md:flex-row md:items-center md:justify-between`}>
          <div>
            <p className={`text-sm uppercase tracking-[0.3em] ${textLight}`}>Workflow shortcuts</p>
            <p className="text-lg font-semibold">Streamline your receiving operations</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowScanModal(true)}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <Camera className="w-4 h-4" />
              Quick scan
            </button>
            <button
              onClick={() => alert('Bulk receive feature coming soon')}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <Package className="w-4 h-4" />
              Bulk receive
            </button>
            <button
              onClick={() => alert('Export feature coming soon')}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <Download className="w-4 h-4" />
              Export receipts
            </button>
          </div>
        </div>
      </div>

      {/* Scanned Item Details */}
      {scannedResult && scannedResult.item && (
        <div className={`${bgCard} rounded-2xl border ${borderColor} p-6 shadow-xl`}>
          <h3 className={`text-lg font-semibold mb-4 ${textColor}`}>Scanned Item</h3>

          <div className="space-y-4">
            {/* Item Info */}
            <div className={`p-4 ${bgCard} rounded-lg border ${borderColor}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className={`font-semibold text-lg ${textColor}`}>{scannedResult.item.name}</p>
                  <p className={`text-sm ${textMuted}`}>SKU: {scannedResult.item.sku}</p>
                  {scannedResult.item.description && (
                    <p className={`text-sm ${textLight} mt-1`}>{scannedResult.item.description}</p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {scannedResult.format}
                </Badge>
              </div>

              {/* Lot Info */}
              {scannedResult.lot && (
                <div className={`mt-3 pt-3 border-t ${borderColor}`}>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className={textMuted}>Lot:</span>
                      <span className={`ml-2 font-medium ${textColor}`}>{scannedResult.lot.lot_number}</span>
                    </div>
                    <div>
                      <span className={textMuted}>Current Qty:</span>
                      <span className={`ml-2 font-medium ${textColor}`}>
                        {scannedResult.lot.quantity} {scannedResult.item.unit_of_measure || 'units'}
                      </span>
                    </div>
                    {scannedResult.lot.expiry_date && (
                      <div>
                        <span className={textMuted}>Expiry:</span>
                        <span className={`ml-2 font-medium ${textColor}`}>
                          {new Date(scannedResult.lot.expiry_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Receiving Form */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">
                  Quantity to Receive <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label htmlFor="purchasePrice">Purchase Price (Optional)</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this receipt"
              />
            </div>

            {/* Success/Error Messages */}
            {receiveSuccess && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium text-green-900">Item received successfully!</p>
                  <p className="text-sm text-green-700">Inventory has been updated.</p>
                </div>
                {receivedLotId && (
                  <Button
                    onClick={() => handlePrintLabel(receivedLotId)}
                    variant="outline"
                    size="sm"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Label
                  </Button>
                )}
              </div>
            )}

            {receiveError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-800">{receiveError}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleReceive}
                disabled={receiving || receiveSuccess || !quantity}
                className={`flex-1 px-6 py-3 rounded-full font-medium transition flex items-center justify-center ${
                  receiving || receiveSuccess || !quantity
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white shadow-lg shadow-[#174940]/30 hover:scale-[1.02]'
                }`}
              >
                {receiving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {receiving ? 'Processing...' : receiveSuccess ? 'Receipt Confirmed' : 'Confirm Receipt'}
              </button>
              <button
                onClick={resetForm}
                className={`px-6 py-3 rounded-full border ${borderColor} ${textColor} hover:border-[#174940] transition`}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!scannedResult && (
        <div className={`${bgCard} rounded-2xl border ${borderColor} text-center py-12 ${textColor} shadow-lg`}>
          <Camera className={`mx-auto h-16 w-16 ${textLight} mb-4 animate-pulse`} />
          <h3 className="text-lg font-semibold mb-2">Ready to Receive</h3>
          <p className={`${textMuted} mb-6`}>
            Click "Scan Barcode" above to start receiving inventory items
          </p>
          <button
            onClick={() => setShowScanModal(true)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${borderColor} ${textColor} hover:border-[#174940] transition`}
          >
            <Camera className="h-4 w-4" />
            Start Scanning
          </button>
        </div>
      )}

      {/* Receiving History */}
      <div className={`${bgCard} rounded-2xl border ${borderColor} p-6 shadow-xl`}>
        <h3 className={`text-lg font-semibold mb-4 ${textColor}`}>Recent Receipts (This Session)</h3>
        {loadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className={`h-6 w-6 animate-spin ${textLight}`} />
          </div>
        ) : sessionHistory.length === 0 ? (
          <p className={`text-center ${textMuted} py-8`}>No receipts yet in this session</p>
        ) : (
          <div className="space-y-2">
            {sessionHistory.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3 rounded-lg transition ${
                  mode === 'neon' ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex-1">
                  <p className={`font-medium ${textColor}`}>{item.itemName}</p>
                  <p className={`text-sm ${textMuted}`}>
                    Lot: {item.lotNumber} | Qty: {item.quantity}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-xs ${textLight}`}>
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </p>
                  <Badge variant="secondary" className="text-xs mt-1">
                    Received
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scan Modal */}
      <ScanModal
        open={showScanModal}
        onOpenChange={setShowScanModal}
        onConfirm={handleScanConfirm}
        title="Scan Item to Receive"
        description="Scan the barcode on your item or packaging"
        mode="both"
      />
    </div>
  );
}
