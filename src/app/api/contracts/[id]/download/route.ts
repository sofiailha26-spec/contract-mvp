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

    let pdfBytes: Buffer
    if (contract.pdfData) {
      pdfBytes = Buffer.from(contract.pdfData, 'base64')
    } else {
      return new NextResponse('PDF Data not found in database', { status: 404 })
    }

    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()

    const SIGNATURE_HEIGHT = 50

    // Draw Admin Signature
    if (contract.adminSignatureUrl && contract.adminSignX !== null && contract.adminSignY !== null) {
      const adminSignBytes = Buffer.from(contract.adminSignatureUrl.split(',')[1], 'base64')
      const adminImage = await pdfDoc.embedPng(adminSignBytes)
      const scale = SIGNATURE_HEIGHT / adminImage.height
      const imgWidth = adminImage.width * scale

      const pageIdx = contract.adminSignPage || (pages.length - 1)
      const targetPage = pages[Math.min(pageIdx, pages.length - 1)]

      targetPage.drawImage(adminImage, {
        x: contract.adminSignX,
        y: contract.adminSignY,
        width: imgWidth,
        height: SIGNATURE_HEIGHT,
      })
    }

    // Draw Creator Signature
    if (contract.creatorSignatureUrl && contract.creatorSignX !== null && contract.creatorSignY !== null) {
      const creatorSignBytes = Buffer.from(contract.creatorSignatureUrl.split(',')[1], 'base64')
      const creatorImage = await pdfDoc.embedPng(creatorSignBytes)
      const scale = SIGNATURE_HEIGHT / creatorImage.height
      const imgWidth = creatorImage.width * scale

      const pageIdx = contract.creatorSignPage || (pages.length - 1)
      const targetPage = pages[Math.min(pageIdx, pages.length - 1)]

      targetPage.drawImage(creatorImage, {
        x: contract.creatorSignX,
        y: contract.creatorSignY,
        width: imgWidth,
        height: SIGNATURE_HEIGHT,
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
