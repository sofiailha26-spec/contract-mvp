import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { writeFile } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const name = formData.get('name') as string

    if (!file || !name) {
      return NextResponse.json({ error: 'File and name are required' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uniqueId = uuidv4()
    const fileName = `${uniqueId}.pdf`
    const filePath = `/uploads/${fileName}`
    const absolutePath = path.join(process.cwd(), 'public', 'uploads', fileName)

    await writeFile(absolutePath, buffer)

    const contract = await prisma.contract.create({
      data: {
        name,
        pdfUrl: filePath,
        token: uuidv4(),
        status: 'pending_creator'
      }
    })

    return NextResponse.json(contract)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to upload contract' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const contracts = await prisma.contract.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(contracts)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 })
  }
}
