import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id
    const contract = await prisma.contract.findUnique({
      where: { id }
    })

    if (!contract || !contract.pdfData) {
      return new NextResponse('Original PDF not found', { status: 404 })
    }

    const pdfBytes = Buffer.from(contract.pdfData, 'base64')

    return new NextResponse(pdfBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="contract-${id}-original.pdf"`,
      },
    })
  } catch (error) {
    console.error(error)
    return new NextResponse('Failed to load original PDF', { status: 500 })
  }
}
