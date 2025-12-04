'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ScanOverlay from '@/components/barcode/ScanOverlay';
import { resolveScan } from '@/lib/barcode/client-actions';
import { ScanResult } from '@/types/barcode';
import { Loader2, Camera, Keyboard, Flashlight, FlashlightOff, X } from 'lucide-react';
import { AppNav } from '@/components/nav/AppNav';

export default function ScanPage() {
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
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  // Initialize camera and scanner
  useEffect(() => {
    const initCamera = async () => {
      try {
        // Check camera permission
        if (navigator.permissions) {
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          setCameraPermission(permission.state as any);
        }

        // Check torch support
        const constraints = navigator.mediaDevices.getSupportedConstraints();
        setTorchSupported('torch' in constraints);

        // Initialize code reader
        codeReaderRef.current = new BrowserMultiFormatReader();

        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Back camera on mobile
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setCameraPermission('granted');
        startScanning();
      } catch (err) {
        console.error('Camera initialization error:', err);
        setCameraPermission('denied');
        setError('Camera access denied. Please enable camera permissions in your browser settings.');
      }
    };

    initCamera();

    // Cleanup
    return () => {
      stopScanning();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Start continuous scanning
  const startScanning = () => {
    if (!codeReaderRef.current || !videoRef.current) return;

    setScanning(true);
    setError(null);

    codeReaderRef.current.decodeFromVideoDevice(
      undefined, // Use default device
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

  // Stop scanning
  const stopScanning = () => {
    setScanning(false);
    codeReaderRef.current = null;
  };

  // Handle barcode scan
  const handleScan = async (barcodeValue: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await resolveScan(barcodeValue);
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
    setShowManual(false);
  };

  // Toggle torch/flashlight
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

  // Format date for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <>
      <AppNav currentPage="inventory" />
      <div className="flex flex-col h-screen bg-gray-100">
        {/* Camera view */}
        <div className="relative flex-1 bg-black">
          {cameraPermission === 'granted' ? (
            <>
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
          </>
        ) : cameraPermission === 'denied' ? (
          <div className="flex items-center justify-center h-full p-8">
            <Card className="p-6 max-w-md">
              <div className="text-center">
                <Camera className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h2 className="text-xl font-semibold mb-2">Camera Access Required</h2>
                <p className="text-gray-600 mb-4">
                  Please enable camera permissions in your browser settings to use barcode scanning.
                </p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Retry
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-12 w-12 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Controls - bottom sheet */}
      <div className="p-4 bg-white border-t shadow-lg">
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
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex gap-2">
              <Input
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                placeholder="Enter barcode manually"
                className="flex-1"
              />
              <Button onClick={handleManualSubmit} disabled={!manualInput.trim()}>
                Scan
              </Button>
              <Button
                onClick={() => {
                  setShowManual(false);
                  setManualInput('');
                }}
                variant="ghost"
                size="icon"
              >
                <X className="h-4 w-4" />
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
        {lastScan && (
          <Card className="p-4">
            <div className="mb-3">
              <Badge variant="outline" className="text-xs font-mono">
                {lastScan.barcode}
              </Badge>
              <Badge variant="secondary" className="ml-2 text-xs">
                {lastScan.format}
              </Badge>
            </div>

            {lastScan.item ? (
              <div className="space-y-2">
                <div>
                  <p className="font-semibold text-lg">{lastScan.item.name}</p>
                  <p className="text-sm text-gray-600">SKU: {lastScan.item.sku}</p>
                </div>

                {lastScan.lot && (
                  <div className="border-t pt-2 mt-2">
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
                      {lastScan.lot.expiry_date && (
                        <div>
                          <span className="text-gray-600">Expiry:</span>
                          <span className="ml-2 font-medium">{formatDate(lastScan.lot.expiry_date)}</span>
                        </div>
                      )}
                      {lastScan.lot.manufacture_date && (
                        <div>
                          <span className="text-gray-600">Mfg:</span>
                          <span className="ml-2 font-medium">{formatDate(lastScan.lot.manufacture_date)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Available actions */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {lastScan.actions.map(action => (
                    <Button key={action} variant="outline" size="sm">
                      {action.replace(/_/g, ' ')}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-4">Barcode not found in database</p>
                <Button variant="outline" size="sm">
                  Create New Item
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
      </div>
    </>
  );
}
