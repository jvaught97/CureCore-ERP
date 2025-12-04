import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { createClient } from '@/utils/supabase/server';
import { getCurrentUserOrgId } from '@/lib/auth';
import { generateQRPayload } from '@/lib/barcode/parser';

/**
 * Generates 2" x 1" (144pt x 72pt) lot labels with QR code
 * GET /api/labels/lot?id={lotId}
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lotId = searchParams.get('id');

    if (!lotId) {
      return NextResponse.json(
        { error: 'Lot ID is required' },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch lot data with item information
    const { data: lot, error: lotError } = await supabase
      .from('item_lots')
      .select(`
        *,
        item:item_master(*)
      `)
      .eq('id', lotId)
      .single();

    if (lotError || !lot) {
      return NextResponse.json(
        { error: 'Lot not found' },
        { status: 404 }
      );
    }

    // Get user's org to verify access
    const orgId = await getCurrentUserOrgId(supabase, user);
    if (orgId !== lot.org_id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Generate QR code payload
    const qrPayload = generateQRPayload({
      type: 'lot',
      orgId: lot.org_id,
      itemSku: lot.item.sku,
      lotNumber: lot.lot_number,
      quantity: lot.quantity,
      expiryDate: lot.expiry_date ? new Date(lot.expiry_date) : undefined
    });

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 200
    });

    // Convert data URL to buffer
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

    // Create PDF (2" x 1" = 144pt x 72pt)
    const doc = new PDFDocument({
      size: [144, 72],
      margin: 4,
      autoFirstPage: true
    });

    // Stream chunks
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    // Add QR code (left side, 60x60 pt)
    doc.image(qrBuffer, 4, 6, { width: 60, height: 60 });

    // Add text (right side)
    const textX = 68;
    const textWidth = 144 - textX - 4;

    // Item SKU
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(lot.item.sku, textX, 6, {
        width: textWidth,
        ellipsis: true
      });

    // Item name (truncated if too long)
    doc
      .font('Helvetica')
      .fontSize(7)
      .text(lot.item.name, textX, 17, {
        width: textWidth,
        ellipsis: true,
        height: 14
      });

    // Lot number
    doc
      .fontSize(7)
      .text(`Lot: ${lot.lot_number}`, textX, 33, {
        width: textWidth,
        ellipsis: true
      });

    // Quantity
    doc
      .fontSize(7)
      .text(
        `Qty: ${lot.quantity} ${lot.item.unit_of_measure || 'units'}`,
        textX,
        43,
        {
          width: textWidth,
          ellipsis: true
        }
      );

    // Expiry date (if available)
    if (lot.expiry_date) {
      const expiryDate = new Date(lot.expiry_date);
      const formattedDate = expiryDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      doc
        .fontSize(7)
        .text(`Exp: ${formattedDate}`, textX, 53, {
          width: textWidth,
          ellipsis: true
        });
    }

    // Finalize PDF
    doc.end();

    // Wait for PDF to finish
    await new Promise<void>((resolve) => {
      doc.on('end', () => resolve());
    });

    // Combine chunks
    const pdfBuffer = Buffer.concat(chunks);

    // Return PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="lot-${lot.lot_number}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });
  } catch (error) {
    console.error('Label generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate label', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
