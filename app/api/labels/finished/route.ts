import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { createClient } from '@/utils/supabase/server';
import { getCurrentUserOrgId } from '@/lib/auth';
import { generateQRPayload } from '@/lib/barcode/parser';

/**
 * Generates 2.25" x 1.25" (162pt x 90pt) finished product labels with QR code
 * GET /api/labels/finished?batchId={batchId}
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json(
        { error: 'Batch ID is required' },
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

    // Fetch batch data
    // Note: Adjust this query based on your actual batches table structure
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select(`
        *,
        formulation:formulations(*),
        outputs:batch_outputs(
          *,
          lot:item_lots(
            *,
            item:item_master(*)
          )
        )
      `)
      .eq('id', batchId)
      .single();

    if (batchError || !batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    // Get user's org to verify access
    const orgId = await getCurrentUserOrgId(supabase, user);
    if (orgId !== batch.org_id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get primary output lot (first output or specified)
    const outputLot = batch.outputs?.[0]?.lot;

    if (!outputLot) {
      return NextResponse.json(
        { error: 'No output lot found for this batch' },
        { status: 404 }
      );
    }

    // Generate QR code payload
    const qrPayload = generateQRPayload({
      type: 'batch',
      orgId: batch.org_id,
      batchId: batch.id,
      itemSku: outputLot.item.sku,
      lotNumber: outputLot.lot_number,
      quantity: outputLot.quantity,
      expiryDate: outputLot.expiry_date ? new Date(outputLot.expiry_date) : undefined
    });

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 240
    });

    // Convert data URL to buffer
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

    // Create PDF (2.25" x 1.25" = 162pt x 90pt)
    const doc = new PDFDocument({
      size: [162, 90],
      margin: 4,
      autoFirstPage: true
    });

    // Stream chunks
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    // Add QR code (left side, 75x75 pt)
    doc.image(qrBuffer, 4, 7.5, { width: 75, height: 75 });

    // Add text (right side)
    const textX = 84;
    const textWidth = 162 - textX - 4;

    // Product name
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(outputLot.item.name, textX, 7, {
        width: textWidth,
        ellipsis: true,
        height: 16
      });

    // SKU
    doc
      .font('Helvetica')
      .fontSize(8)
      .text(`SKU: ${outputLot.item.sku}`, textX, 25, {
        width: textWidth,
        ellipsis: true
      });

    // Batch ID
    doc
      .fontSize(8)
      .text(`Batch: ${batch.batch_number || batch.id.substring(0, 8)}`, textX, 36, {
        width: textWidth,
        ellipsis: true
      });

    // Lot number
    doc
      .fontSize(8)
      .text(`Lot: ${outputLot.lot_number}`, textX, 47, {
        width: textWidth,
        ellipsis: true
      });

    // Quantity
    doc
      .fontSize(8)
      .text(
        `Qty: ${outputLot.quantity} ${outputLot.item.unit_of_measure || 'units'}`,
        textX,
        58,
        {
          width: textWidth,
          ellipsis: true
        }
      );

    // Expiry date (if available)
    if (outputLot.expiry_date) {
      const expiryDate = new Date(outputLot.expiry_date);
      const formattedDate = expiryDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      doc
        .fontSize(8)
        .text(`Exp: ${formattedDate}`, textX, 69, {
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
        'Content-Disposition': `attachment; filename="finished-batch-${batch.batch_number || batchId}.pdf"`,
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
