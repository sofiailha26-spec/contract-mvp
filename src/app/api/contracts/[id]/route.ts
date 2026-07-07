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
    
    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }
    
    return NextResponse.json(contract)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch contract' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id
    const data = await request.json()
    const { adminName, signature } = data

    if (!adminName || !signature) {
      return NextResponse.json({ error: 'Admin name and signature are required' }, { status: 400 })
    }

    const contract = await prisma.contract.update({
      where: { id },
      data: {
        adminName: adminName,
        adminSignatureUrl: signature,
        status: 'completed'
      }
    })
    
    return NextResponse.json(contract)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update contract' }, { status: 500 })
  }
}
