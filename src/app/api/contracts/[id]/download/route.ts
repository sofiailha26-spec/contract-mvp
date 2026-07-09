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

    // Append signatures to the LAST existing page instead of creating a new one
    const pages = pdfDoc.getPages()
    const targetPage = pages[pages.length - 1]
    const { width, height } = targetPage.getSize()

    // 假设最后一页底部有大约 150pt 的留白
    const yPos = 80 // 距离底部 80pt 的位置
    const xPosA = 60
    const xPosB = 320

    // Prepare images
    const adminSignBytes = contract.adminSignatureUrl ? Buffer.from(contract.adminSignatureUrl.split(',')[1], 'base64') : null
    const creatorSignBytes = contract.creatorSignatureUrl ? Buffer.from(contract.creatorSignatureUrl.split(',')[1], 'base64') : null

    // Draw Admin Signature (Party A)
    if (adminSignBytes) {
      const adminImage = await pdfDoc.embedPng(adminSignBytes)
      // 根据图片比例缩放
      const scale = 50 / adminImage.height
      targetPage.drawImage(adminImage, {
        x: xPosA,
        y: yPos,
        width: adminImage.width * scale,
        height: 50
      })
    }

    // Draw Creator Signature (Party B)
    if (creatorSignBytes) {
      const creatorImage = await pdfDoc.embedPng(creatorSignBytes)
      const scale = 50 / creatorImage.height
      targetPage.drawImage(creatorImage, {
        x: xPosB,
        y: yPos,
        width: creatorImage.width * scale,
        height: 50
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
