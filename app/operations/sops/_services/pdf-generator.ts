/**
 * GMP-Compliant SOP PDF Generator
 *
 * Generates professional PDFs from structured SOP content using pdfkit.
 * Features:
 * - Dynamic org branding (company name)
 * - 11 GMP-standard sections
 * - Professional layout with headers/footers
 * - Automatic upload to Supabase Storage
 */

import PDFDocument from 'pdfkit'
import { createClient } from '@/app/utils/supabase/server'
import { convert } from 'html-to-text'

interface GenerateSOPPDFOptions {
  sopDocumentId: string
  versionId: string
  orgId: string
}

interface SOPPDFData {
  // SOP Document metadata
  code: string
  title: string
  category: string
  department: string | null

  // Version metadata
  versionNumber: number
  revisionCode: string | null
  effectiveDate: string | null
  expiryDate: string | null
  status: string

  // Structured content
  purpose?: string | null
  scope?: string | null
  responsibilities?: string | null
  definitions?: string | null
  required_materials_equipment?: string | null
  safety_precautions?: string | null
  procedure: string
  quality_control_checkpoints?: string | null
  documentation_requirements?: string | null
  deviations_and_corrective_actions?: string | null
  references?: string | null

  // Org branding
  companyName: string
}

/**
 * Main function to generate SOP PDF
 */
export async function generateSOPPDF(options: GenerateSOPPDFOptions): Promise<{
  success: boolean
  fileUrl?: string
  error?: string
}> {
  try {
    const supabase = await createClient()

    // 1. Fetch SOP document, version, and structured content
    const { data: sopDocument, error: sopError } = await supabase
      .from('sop_documents')
      .select('code, title, category, department, org_id')
      .eq('id', options.sopDocumentId)
      .single()

    if (sopError || !sopDocument) {
      return { success: false, error: 'SOP document not found' }
    }

    const { data: version, error: versionError } = await supabase
      .from('sop_versions')
      .select('version_number, revision_code, effective_date, expiry_date, status')
      .eq('id', options.versionId)
      .single()

    if (versionError || !version) {
      return { success: false, error: 'SOP version not found' }
    }

    const { data: content, error: contentError } = await supabase
      .from('sop_structured_content')
      .select('*')
      .eq('sop_version_id', options.versionId)
      .single()

    if (contentError || !content) {
      return { success: false, error: 'Structured content not found' }
    }

    // 2. Fetch org settings for branding
    const { data: orgSettings } = await supabase
      .from('org_settings')
      .select('company_name')
      .eq('org_id', options.orgId)
      .single()

    const companyName = orgSettings?.company_name || 'CureCore'

    // 3. Build PDF data object
    const pdfData: SOPPDFData = {
      code: sopDocument.code,
      title: sopDocument.title,
      category: sopDocument.category,
      department: sopDocument.department,
      versionNumber: version.version_number,
      revisionCode: version.revision_code,
      effectiveDate: version.effective_date,
      expiryDate: version.expiry_date,
      status: version.status,
      purpose: content.purpose,
      scope: content.scope,
      responsibilities: content.responsibilities,
      definitions: content.definitions,
      required_materials_equipment: content.required_materials_equipment,
      safety_precautions: content.safety_precautions,
      procedure: content.procedure,
      quality_control_checkpoints: content.quality_control_checkpoints,
      documentation_requirements: content.documentation_requirements,
      deviations_and_corrective_actions: content.deviations_and_corrective_actions,
      references: content.references,
      companyName
    }

    // 4. Generate PDF buffer
    const pdfBuffer = await createPDFBuffer(pdfData)

    // 5. Upload to Supabase Storage
    const timestamp = Date.now()
    const fileName = `${sopDocument.code}_v${version.version_number}_${timestamp}.pdf`
    const filePath = `${options.orgId}/${options.sopDocumentId}/generated/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('sops')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return { success: false, error: uploadError.message }
    }

    // 6. Update sop_versions with auto_generated_pdf_url
    const { error: updateError } = await supabase
      .from('sop_versions')
      .update({
        auto_generated_pdf_url: uploadData.path,
        auto_generated_pdf_last_generated_at: new Date().toISOString()
      })
      .eq('id', options.versionId)

    if (updateError) {
      console.error('Update error:', updateError)
      return { success: false, error: updateError.message }
    }

    return { success: true, fileUrl: uploadData.path }
  } catch (err: any) {
    console.error('generateSOPPDF error:', err)
    return { success: false, error: err.message || 'Failed to generate PDF' }
  }
}

/**
 * Create PDF buffer using pdfkit
 */
async function createPDFBuffer(data: SOPPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 72, bottom: 72, left: 72, right: 72 }
    })

    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    try {
      // Header
      doc.fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#174940')
        .text(data.companyName, { align: 'center' })

      doc.moveDown(0.5)
      doc.fontSize(16)
        .text('Standard Operating Procedure', { align: 'center' })

      doc.moveDown(1)

      // Metadata table
      doc.fontSize(10).font('Helvetica')
      const leftCol = 72
      const rightCol = 300
      let y = doc.y

      doc.fillColor('#000000')

      // Left column
      doc.font('Helvetica-Bold').text('SOP Code:', leftCol, y)
      doc.font('Helvetica').text(data.code, leftCol + 80, y)

      doc.font('Helvetica-Bold').text('Title:', leftCol, y + 20)
      doc.font('Helvetica').text(data.title, leftCol + 80, y + 20, { width: 200 })

      doc.font('Helvetica-Bold').text('Category:', leftCol, y + 50)
      doc.font('Helvetica').text(data.category.toUpperCase(), leftCol + 80, y + 50)

      if (data.department) {
        doc.font('Helvetica-Bold').text('Department:', leftCol, y + 70)
        doc.font('Helvetica').text(data.department, leftCol + 80, y + 70)
      }

      // Right column
      doc.font('Helvetica-Bold').text('Version:', rightCol, y)
      doc.font('Helvetica').text(`${data.versionNumber}`, rightCol + 80, y)

      if (data.revisionCode) {
        doc.font('Helvetica-Bold').text('Revision:', rightCol, y + 20)
        doc.font('Helvetica').text(data.revisionCode, rightCol + 80, y + 20)
      }

      doc.font('Helvetica-Bold').text('Status:', rightCol, y + 40)
      doc.font('Helvetica').text(data.status.toUpperCase(), rightCol + 80, y + 40)

      if (data.effectiveDate) {
        doc.font('Helvetica-Bold').text('Effective:', rightCol, y + 60)
        doc.font('Helvetica').text(new Date(data.effectiveDate).toLocaleDateString(), rightCol + 80, y + 60)
      }

      if (data.expiryDate) {
        doc.font('Helvetica-Bold').text('Expires:', rightCol, y + 80)
        doc.font('Helvetica').text(new Date(data.expiryDate).toLocaleDateString(), rightCol + 80, y + 80)
      }

      doc.moveDown(4)
      doc.moveTo(72, doc.y).lineTo(540, doc.y).stroke()
      doc.moveDown(1)

      // GMP Sections
      let sectionNumber = 1

      if (data.purpose) {
        addSection(doc, sectionNumber++, 'Purpose', data.purpose)
      }

      if (data.scope) {
        addSection(doc, sectionNumber++, 'Scope', data.scope)
      }

      if (data.responsibilities) {
        addSection(doc, sectionNumber++, 'Responsibilities', data.responsibilities)
      }

      if (data.definitions) {
        addSection(doc, sectionNumber++, 'Definitions', data.definitions)
      }

      if (data.required_materials_equipment) {
        addSection(doc, sectionNumber++, 'Required Materials & Equipment', data.required_materials_equipment)
      }

      if (data.safety_precautions) {
        addSection(doc, sectionNumber++, 'Safety Precautions', data.safety_precautions)
      }

      // Procedure is always included (required field)
      addSection(doc, sectionNumber++, 'Procedure', data.procedure)

      if (data.quality_control_checkpoints) {
        addSection(doc, sectionNumber++, 'Quality Control Checkpoints', data.quality_control_checkpoints)
      }

      if (data.documentation_requirements) {
        addSection(doc, sectionNumber++, 'Documentation Requirements', data.documentation_requirements)
      }

      if (data.deviations_and_corrective_actions) {
        addSection(doc, sectionNumber++, 'Deviations & Corrective Actions', data.deviations_and_corrective_actions)
      }

      if (data.references) {
        addSection(doc, sectionNumber++, 'References', data.references)
      }

      // Footer
      const pageCount = doc.bufferedPageRange().count
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i)
        doc.fontSize(8)
          .fillColor('#666666')
          .text(
            `Generated: ${new Date().toLocaleString()} | Page ${i + 1} of ${pageCount}`,
            72,
            doc.page.height - 50,
            { align: 'center', width: doc.page.width - 144 }
          )
      }

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Helper function to add a numbered section
 * Converts HTML content to formatted text with proper list rendering
 */
function addSection(doc: PDFKit.PDFDocument, number: number, title: string, content: string) {
  // Check if we need a new page
  if (doc.y > 650) {
    doc.addPage()
  }

  doc.fontSize(14)
    .font('Helvetica-Bold')
    .fillColor('#2D6A5F')
    .text(`${number}. ${title}`, { underline: true })

  doc.moveDown(0.5)

  // Convert HTML to text with proper list formatting
  const textContent = convert(content, {
    wordwrap: 80,
    preserveNewlines: true,
    formatters: {
      // Custom formatter for ordered lists
      'orderedList': (elem, walk, builder, options) => {
        builder.openBlock({ leadingLineBreaks: 1 })
        let counter = 1
        for (const child of elem.children) {
          if (child.type === 'tag' && child.name === 'li') {
            builder.addInline(`${counter}. `)
            walk([child], builder)
            builder.addLineBreak()
            counter++
          }
        }
        builder.closeBlock({ trailingLineBreaks: 1 })
      },
      // Custom formatter for unordered lists
      'unorderedList': (elem, walk, builder, options) => {
        builder.openBlock({ leadingLineBreaks: 1 })
        for (const child of elem.children) {
          if (child.type === 'tag' && child.name === 'li') {
            builder.addInline('• ')
            walk([child], builder)
            builder.addLineBreak()
          }
        }
        builder.closeBlock({ trailingLineBreaks: 1 })
      }
    },
    selectors: [
      { selector: 'ol', format: 'orderedList' },
      { selector: 'ul', format: 'unorderedList' }
    ]
  })

  doc.fontSize(10)
    .font('Helvetica')
    .fillColor('#000000')
    .text(textContent, { align: 'justify' })

  doc.moveDown(1.5)
}
