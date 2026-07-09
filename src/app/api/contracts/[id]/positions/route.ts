import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id
    const body = await request.json()

    // Validate inputs
    if (typeof body.adminSignX !== 'number' || typeof body.adminSignY !== 'number' ||
        typeof body.creatorSignX !== 'number' || typeof body.creatorSignY !== 'number') {
      return new NextResponse('Invalid coordinates', { status: 400 })
    }

    const contract = await prisma.contract.update({
      where: { id },
      data: {
        adminSignX: body.adminSignX,
        adminSignY: body.adminSignY,
        adminSignPage: body.adminSignPage || 1,
        creatorSignX: body.creatorSignX,
        creatorSignY: body.creatorSignY,
        creatorSignPage: body.creatorSignPage || 1
      }
    })

    return NextResponse.json({ success: true, contract })
  } catch (error) {
    console.error('Save positions error:', error)
    return new NextResponse('Failed to save positions', { status: 500 })
  }
}
