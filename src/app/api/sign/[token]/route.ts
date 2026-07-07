import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const token = (await params).token
    const contract = await prisma.contract.findUnique({
      where: { token }
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
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const token = (await params).token
    const data = await request.json()
    const { creatorName, signature } = data

    if (!creatorName || !signature) {
      return NextResponse.json({ error: 'Name and signature are required' }, { status: 400 })
    }

    const contract = await prisma.contract.update({
      where: { token },
      data: {
        creatorName,
        creatorSignatureUrl: signature,
        status: 'pending_admin'
      }
    })
    
    return NextResponse.json(contract)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update contract' }, { status: 500 })
  }
}
