import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { createClient } from '@/utils/supabase/server';
import { getCurrentUserOrgId } from '@/lib/auth';
import { generateQRPayload } from '@/lib/barcode/parser';

/**
 * Generates 2" x 1" (144pt x 72pt) container labels with QR code
 * GET /api/labels/container?id={containerId}
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const containerId = searchParams.get('id');

    if (!containerId) {
      return NextResponse.json(
        { error: 'Container ID is required' },
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

    // Fetch container data with item and lot information
    const { data: container, error: containerError } = await supabase
      .from('inventory_containers')
      .select(`
        *,
        item:item_master(*),
        lot:item_lots(*)
      `)
      .eq('id', containerId)
      .single();

    if (containerError || !container) {
      return NextResponse.json(
        { error: 'Container not found' },
        { status: 404 }
      );
    }

    // Get user's org to verify access
    const orgId = await getCurrentUserOrgId(supabase, user);
    if (orgId !== container.org_id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Generate QR code payload for container tracking
    const qrPayload = generateQRPayload({
      type: 'container',
      orgId: container.org_id,
      containerId: container.id,
      containerCode: container.container_code,
      itemSku: container.item.sku,
      lotNumber: container.lot.lot_number
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

    // Container code
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(container.container_code, textX, 6, {
        width: textWidth,
        ellipsis: true
      });

    // Item name (truncated if too long)
    doc
      .font('Helvetica')
      .fontSize(7)
      .text(container.item.name, textX, 17, {
        width: textWidth,
        ellipsis: true,
        height: 14
      });

    // Lot number
    doc
      .fontSize(7)
      .text(`Lot: ${container.lot.lot_number}`, textX, 33, {
        width: textWidth,
        ellipsis: true
      });

    // Tare weight (use refined if available, else calculated)
    const tareWeight = container.refined_tare_weight || container.calculated_tare_weight;
    if (tareWeight) {
      doc
        .fontSize(6)
        .text(`Tare: ${parseFloat(tareWeight).toFixed(2)} ${container.weight_unit}`, textX, 43, {
          width: textWidth,
          ellipsis: true
        });
    }

    // Current net weight
    if (container.current_net_weight) {
      doc
        .fontSize(7)
        .font('Helvetica-Bold')
        .text(
          `Net: ${parseFloat(container.current_net_weight).toFixed(2)} ${container.weight_unit}`,
          textX,
          53,
          {
            width: textWidth,
            ellipsis: true
          }
        );
    }

    // Location (bottom)
    if (container.location) {
      doc
        .font('Helvetica')
        .fontSize(6)
        .text(container.location, textX, 63, {
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
        'Content-Disposition': `attachment; filename="container-${container.container_code}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });
  } catch (error) {
    console.error('Container label generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate label', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
