import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PDFDocument } from 'pdf-lib'
import { readFile } from 'fs/promises'
import path from 'path'

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
    
    // Load original PDF
    const pdfPath = path.join(process.cwd(), 'public', contract.pdfUrl)
    const pdfBytes = await readFile(pdfPath)
    const pdfDoc = await PDFDocument.load(pdfBytes)
    
    // Append a new page for signatures
    const page = pdfDoc.addPage()
    const { width, height } = page.getSize()

    // Draw Admin Signature (Party A)
    if (contract.adminSignatureUrl) {
      const adminSignBytes = Buffer.from(contract.adminSignatureUrl.split(',')[1], 'base64')
      const adminImage = await pdfDoc.embedPng(adminSignBytes)
      
      page.drawText(`Party A: ${contract.adminName || 'Admin'}`, {
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
      
      page.drawText(`Party B: ${contract.creatorName || 'Creator'}`, {
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
