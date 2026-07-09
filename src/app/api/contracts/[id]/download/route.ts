import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PDFDocument } from 'pdf-lib'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id
    const contract = await prisma.contract.findUnique({
      where: { id }
    })

    if (!contract || contract.status !== 'completed') {
      return new NextResponse('Contract not found or not completed', { status: 404 })
    }

    // Load original PDF from base64 stored in DB
    let pdfBytes: ArrayBuffer | Buffer
    if (contract.pdfData) {
      pdfBytes = Buffer.from(contract.pdfData, 'base64')
    } else {
      return new NextResponse('PDF Data not found in database', { status: 404 })
    }

    const pdfDoc = await PDFDocument.load(pdfBytes)

    // Append a new page for signatures
    const page = pdfDoc.addPage()
    const { width, height } = page.getSize()

    // Prepare names, fallback to english to prevent pdf-lib winAnsi encoding error if user inputs chinese
    // We strictly encode the string to safe ASCII or fallback
    const safeAdminName = (contract.adminName || 'Admin').replace(/[^\x00-\x7F]/g, '*');
    const safeCreatorName = (contract.creatorName || 'Creator').replace(/[^\x00-\x7F]/g, '*');

    // Draw Admin Signature (Party A)
    if (contract.adminSignatureUrl) {
      const adminSignBytes = Buffer.from(contract.adminSignatureUrl.split(',')[1], 'base64')
      const adminImage = await pdfDoc.embedPng(adminSignBytes)

      page.drawText(`Party A: ${safeAdminName}`, {
        x: 50,
        y: height - 100,
        size: 14
      })

      page.drawImage(adminImage, {
        x: 50,
        y: height - 200,
        width: 150,
        height: 80
      })
    }

    // Draw Creator Signature (Party B)
    if (contract.creatorSignatureUrl) {
      const creatorSignBytes = Buffer.from(contract.creatorSignatureUrl.split(',')[1], 'base64')
      const creatorImage = await pdfDoc.embedPng(creatorSignBytes)

      page.drawText(`Party B: ${safeCreatorName}`, {
        x: 300,
        y: height - 100,
        size: 14
      })

      page.drawImage(creatorImage, {
        x: 300,
        y: height - 200,
        width: 150,
        height: 80
      })
    }

    const finalPdfBytes = await pdfDoc.save()

    return new NextResponse(finalPdfBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="contract-${id}-signed.pdf"`,
      },
    })
  } catch (error) {
    console.error(error)
    return new NextResponse('Failed to generate PDF', { status: 500 })
  }
}
