'use client';

export default function ScanOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {/* Corner guides for scan area */}
      <div className="relative w-64 h-48 border-2 border-transparent">
        {/* Top-left corner */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500 rounded-tl-lg" />

        {/* Top-right corner */}
        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500 rounded-tr-lg" />

        {/* Bottom-left corner */}
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500 rounded-bl-lg" />

        {/* Bottom-right corner */}
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500 rounded-br-lg" />

        {/* Center scanning line animation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-0.5 bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-white text-sm font-medium bg-black/50 px-4 py-2 rounded-lg inline-block">
          Position barcode within the frame
        </p>
      </div>
    </div>
  );
}
