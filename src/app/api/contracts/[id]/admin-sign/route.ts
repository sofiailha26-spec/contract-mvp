import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id
    const { adminName, signature } = await request.json()

    if (!adminName || !signature) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    const contract = await prisma.contract.findUnique({
      where: { id }
    })

    if (!contract || !contract.creatorSignatureUrl) {
      return new NextResponse('Contract not ready for admin signature', { status: 400 })
    }

    const updatedContract = await prisma.contract.update({
      where: { id },
      data: {
        adminName,
        adminSignatureUrl: signature,
        status: 'completed'
      }
    })

    return NextResponse.json(updatedContract)
  } catch (error) {
    console.error(error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
