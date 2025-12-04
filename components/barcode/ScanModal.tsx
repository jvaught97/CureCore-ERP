'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import ScanOverlay from '@/components/barcode/ScanOverlay';
import { resolveScan } from '@/lib/barcode/client-actions';
import { ScanResult } from '@/types/barcode';
import { Loader2, Keyboard, Flashlight, FlashlightOff, X, CheckCircle } from 'lucide-react';

interface ScanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (result: ScanResult) => void;
  title?: string;
  description?: string;
  mode?: 'item' | 'lot' | 'both';
}

export default function ScanModal({
  open,
  onOpenChange,
  onConfirm,
  title = 'Scan Barcode',
  description = 'Position the barcode within the frame',
  mode = 'both'
}: ScanModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [scanning, setScanning] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  // Initialize camera when modal opens
  useEffect(() => {
    if (!open) {
      cleanup();
      return;
    }

    const initCamera = async () => {
      try {
        // Check torch support
        const constraints = navigator.mediaDevices.getSupportedConstraints();
        setTorchSupported('torch' in constraints);

        // Initialize code reader
        codeReaderRef.current = new BrowserMultiFormatReader();

        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        startScanning();
      } catch (err) {
        console.error('Camera initialization error:', err);
        setError('Unable to access camera. Please check permissions.');
      }
    };

    initCamera();

    return () => cleanup();
  }, [open]);

  // Cleanup camera and scanner
  const cleanup = () => {
    setScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    codeReaderRef.current = null;
    setLastScan(null);
    setError(null);
    setManualInput('');
    setShowManual(false);
  };

  // Start scanning
  const startScanning = () => {
    if (!codeReaderRef.current || !videoRef.current) return;

    setScanning(true);
    setError(null);

    codeReaderRef.current.decodeFromVideoDevice(
      undefined,
      videoRef.current,
      async (result, err) => {
        if (result) {
          const barcodeValue = result.getText();
          await handleScan(barcodeValue);
        }

        // Ignore "not found" errors - they're expected when no barcode is in view
        if (err && err.name !== 'NotFoundException') {
          console.error('Scan error:', err);
        }
      }
    );
  };

  // Handle barcode scan
  const handleScan = async (barcodeValue: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await resolveScan(barcodeValue);

      // Filter based on mode
      if (mode === 'item' && !result.item) {
        setError('Please scan an item barcode');
        setLoading(false);
        return;
      }

      if (mode === 'lot' && !result.lot) {
        setError('Please scan a lot barcode');
        setLoading(false);
        return;
      }

      setLastScan(result);

      if (result.error) {
        setError(result.errorMessage || 'Unable to resolve barcode');
      }
    } catch (err) {
      console.error('Scan resolution error:', err);
      setError('Failed to process barcode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle manual input
  const handleManualSubmit = async () => {
    if (!manualInput.trim()) return;

    await handleScan(manualInput.trim());
    setManualInput('');
  };

  // Toggle torch
  const toggleTorch = async () => {
    if (!streamRef.current || !torchSupported) return;

    try {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;

      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !torchOn } as any]
        });
        setTorchOn(!torchOn);
      }
    } catch (err) {
      console.error('Torch toggle error:', err);
    }
  };

  // Handle confirm
  const handleConfirm = () => {
    if (lastScan && !lastScan.error) {
      onConfirm(lastScan);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Camera view */}
        <div className="relative flex-1 bg-black min-h-[400px]">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
          {scanning && <ScanOverlay />}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="h-12 w-12 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 border-t bg-white">
          {/* Action buttons */}
          <div className="flex gap-2 mb-4">
            {torchSupported && (
              <Button
                onClick={toggleTorch}
                variant={torchOn ? 'default' : 'outline'}
                size="sm"
              >
                {torchOn ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
              </Button>
            )}
            <Button
              onClick={() => setShowManual(!showManual)}
              variant={showManual ? 'default' : 'outline'}
              size="sm"
            >
              <Keyboard className="h-4 w-4 mr-2" />
              Manual
            </Button>
          </div>

          {/* Manual input */}
          {showManual && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex gap-2">
                <Input
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                  placeholder="Enter barcode manually"
                  className="flex-1"
                  autoFocus
                />
                <Button onClick={handleManualSubmit} disabled={!manualInput.trim()}>
                  Scan
                </Button>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Scan result */}
          {lastScan && !lastScan.error && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Badge variant="outline" className="text-xs font-mono">
                    {lastScan.barcode}
                  </Badge>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {lastScan.format}
                  </Badge>
                </div>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>

              {lastScan.item && (
                <div>
                  <p className="font-semibold">{lastScan.item.name}</p>
                  <p className="text-sm text-gray-600">SKU: {lastScan.item.sku}</p>

                  {lastScan.lot && (
                    <div className="mt-2 pt-2 border-t">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Lot:</span>
                          <span className="ml-2 font-medium">{lastScan.lot.lot_number}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Qty:</span>
                          <span className="ml-2 font-medium">
                            {lastScan.lot.quantity} {lastScan.item.unit_of_measure || 'units'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!lastScan || !!lastScan.error}
              className="flex-1"
            >
              Use This Barcode
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
