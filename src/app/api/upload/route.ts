import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
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
    const base64 = Buffer.from(bytes).toString('base64')
    const dataUrl = `data:application/pdf;base64,${base64}`

    const contract = await prisma.contract.create({
      data: {
        name,
        pdfUrl: dataUrl,        // 前端 iframe 用
        pdfData: base64,        // 下载/生成最终 PDF 时用
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
