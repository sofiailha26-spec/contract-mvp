import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PDFDocument } from 'pdf-lib'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf'

/**
 * Find the signature positions on the last page.
 * The signature block is the lowest y-position line containing "Party A:" or "甲方".
 * pdfjs transform[5] = distance from page bottom (pdf-lib native coordinate).
 */
async function findSignaturePositions(
  pdfBytes: Buffer
): Promise<{ partyA: { x: number; y: number; pageIdx: number } | null; partyB: { x: number; y: number; pageIdx: number } | null }> {
  const doc = await getDocument({
    data: new Uint8Array(pdfBytes),
    useSystemFonts: false,
    standardFontDataUrl: undefined,
  } as any).promise

  const lastPageIdx = doc.numPages - 1
  const page = await doc.getPage(doc.numPages)
  const textContent = await page.getTextContent()
  const viewport = page.getViewport({ scale: 1.0 })

  // Group text items by y-position (rounded)
  const lines = new Map<number, Array<{ text: string; x: number; y: number }>>()
  for (const item of textContent.items) {
    if ('str' in item) {
      const tx = item.transform
      const x = tx[4]
      const y = Math.round(tx[5])
      if (!lines.has(y)) lines.set(y, [])
      lines.get(y)!.push({ text: item.str, x, y: tx[5] })
    }
  }

  // Sort ascending (bottom to top) so first match = signature block (lowest)
  const sortedYs = [...lines.keys()].sort((a, b) => a - b)

  console.log(`[DEBUG] Last page lines (bottom to top, pageHeight=${viewport.height}):`)
  for (const y of sortedYs) {
    const items = lines.get(y)!.sort((a, b) => a.x - b.x)
    const lineText = items.map(i => i.text).join('')
    console.log(`  y=${y}: "${lineText.substring(0, 120)}"`)
  }

  // Find signature block: lowest line containing "Party A:" or "甲方"
  let partyAY = 0
  let partyBY = 0
  let partyAItem: { x: number; y: number } | null = null
  let partyBItem: { x: number; y: number } | null = null

  for (const y of sortedYs) {
    const items = lines.get(y)!.sort((a, b) => a.x - b.x)
    const lineText = items.map(i => i.text).join('')

    // Skip page numbers and empty lines
    if (lineText.trim().length < 5) continue
    if (/^\d+\s*\/\s*\d+$/.test(lineText.trim())) continue

    // Find Party A position (first occurrence = lowest y = signature block)
    if (!partyAItem && (lineText.includes('Party A') || lineText.includes('甲方'))) {
      partyAY = y
      // Get the "Party" or "甲" item x-coordinate
      const pItem = items.find(i =>
        i.text === 'Party' || i.text === 'Party A' ||
        i.text.startsWith('甲方') || i.text === '甲'
      )
      if (pItem) {
        partyAItem = { x: pItem.x, y: pItem.y }
        console.log(`[DEBUG] Signature Party A found at y=${y}, x=${pItem.x}, line="${lineText.substring(0, 80)}"`)
      }
    }

    // Find Party B position
    if (!partyBItem && (lineText.includes('Party B') || lineText.includes('乙方'))) {
      partyBY = y
      const pItem = items.find(i =>
        i.text === 'Party' || i.text === 'Party B' ||
        i.text.startsWith('乙方') || i.text === '乙'
      )
      if (pItem) {
        partyBItem = { x: pItem.x, y: pItem.y }
        console.log(`[DEBUG] Signature Party B found at y=${y}, x=${pItem.x}, line="${lineText.substring(0, 80)}"`)
      }
    }

    // If we found both, stop searching
    if (partyAItem && partyBItem) break
  }

  const partyA = partyAItem ? { ...partyAItem, pageIdx: lastPageIdx } : null
  const partyB = partyBItem ? { ...partyBItem, pageIdx: lastPageIdx } : null

  // If Party A and Party B are on the same line but we only found one "Party" item,
  // use the second occurrence for Party B
  if (partyA && !partyB && partyAY === partyBY) {
    const items = lines.get(partyAY)!.sort((a, b) => a.x - b.x)
    const partyItems = items.filter(i => i.text === 'Party' || i.text.includes('乙'))
    if (partyItems.length >= 2) {
      const bItem = partyItems[1] // second "Party" = Party B
      console.log(`[DEBUG] Party B (same line) at x=${bItem.x}, y=${bItem.y}`)
      return { partyA, partyB: { x: bItem.x, y: bItem.y, pageIdx: lastPageIdx } }
    }
  }

  console.log(`[DEBUG] Final - partyA:`, partyA, `partyB:`, partyB)
  doc.destroy()
  return { partyA, partyB }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id
    const contract = await prisma.contract.findUnique({ where: { id } })

    if (!contract || contract.status !== 'completed') {
      return new NextResponse('Contract not found or not completed', { status: 404 })
    }

    let pdfBytes: Buffer
    if (contract.pdfData) {
      pdfBytes = Buffer.from(contract.pdfData, 'base64')
    } else {
      return new NextResponse('PDF Data not found in database', { status: 404 })
    }

    const { partyA, partyB } = await findSignaturePositions(pdfBytes)

    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()

    const adminSignBytes = contract.adminSignatureUrl
      ? Buffer.from(contract.adminSignatureUrl.split(',')[1], 'base64')
      : null
    const creatorSignBytes = contract.creatorSignatureUrl
      ? Buffer.from(contract.creatorSignatureUrl.split(',')[1], 'base64')
      : null

    const SIGNATURE_HEIGHT = 50
    const GAP_PT = 8 // ~0.3cm gap below text baseline

    // Draw Admin Signature (Party A)
    if (adminSignBytes) {
      const adminImage = await pdfDoc.embedPng(adminSignBytes)
      const scale = SIGNATURE_HEIGHT / adminImage.height
      const imgWidth = adminImage.width * scale

      if (partyA) {
        const targetPage = pages[partyA.pageIdx]
        // partyA.y = text baseline from bottom (pdf-lib)
        // Signature top should be just below text baseline
        // Signature bottom = baseline - GAP - HEIGHT
        const sigY = partyA.y - GAP_PT - SIGNATURE_HEIGHT

        console.log(`[DEBUG] Admin - textY:${partyA.y}, sigBottomY:${sigY}, sigTopY:${sigY + SIGNATURE_HEIGHT}`)

        targetPage.drawImage(adminImage, {
          x: partyA.x,
          y: Math.max(0, sigY),
          width: imgWidth,
          height: SIGNATURE_HEIGHT,
        })
      } else {
        const targetPage = pages[pages.length - 1]
        targetPage.drawImage(adminImage, {
          x: 74.2, y: 248.5,
          width: adminImage.width * (SIGNATURE_HEIGHT / adminImage.height),
          height: SIGNATURE_HEIGHT,
        })
      }
    }

    // Draw Creator Signature (Party B)
    if (creatorSignBytes) {
      const creatorImage = await pdfDoc.embedPng(creatorSignBytes)
      const scale = SIGNATURE_HEIGHT / creatorImage.height
      const imgWidth = creatorImage.width * scale

      if (partyB) {
        const targetPage = pages[partyB.pageIdx]
        const sigY = partyB.y - GAP_PT - SIGNATURE_HEIGHT

        console.log(`[DEBUG] Creator - textY:${partyB.y}, sigBottomY:${sigY}, sigTopY:${sigY + SIGNATURE_HEIGHT}`)

        targetPage.drawImage(creatorImage, {
          x: partyB.x,
          y: Math.max(0, sigY),
          width: imgWidth,
          height: SIGNATURE_HEIGHT,
        })
      } else {
        const targetPage = pages[pages.length - 1]
        targetPage.drawImage(creatorImage, {
          x: 334.2, y: 248.5,
          width: creatorImage.width * (SIGNATURE_HEIGHT / creatorImage.height),
          height: SIGNATURE_HEIGHT,
        })
      }
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
