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

    // 提高 yPos 的值，在 PDF 中 0 是最底部，数值越大位置越靠上。
    // 再向上移动 0.3cm（约 8.5pt），从240调整为248.5
    const yPos = 248.5
    // 往右移动 0.5cm（约 14.17pt），分别为各自的 X 坐标加上 14.2
    const xPosA = 74.2
    const xPosB = 334.2

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
