import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id
    const contract = await prisma.contract.findUnique({
      where: { id },
      select: { pdfData: true }
    })

    if (!contract || !contract.pdfData) {
      return new NextResponse('Not found', { status: 404 })
    }

    return NextResponse.json({ base64: contract.pdfData })
  } catch (error) {
    return new NextResponse('Internal Error', { status: 500 })
  }
}
