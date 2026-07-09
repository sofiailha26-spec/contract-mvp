import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PDFDocument } from 'pdf-lib'
import PDFParser from 'pdf2json'

/**
 * Parses PDF bytes and extracts text elements from the last page.
 * Uses pdf2json which does not require 'canvas' native dependencies, fixing Vercel crashes.
 */
function extractTextFromLastPage(pdfBytes: Buffer): Promise<{ texts: { text: string; x: number; y: number }[], pageHeight: number }> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));

    pdfParser.on("pdfParser_dataReady", pdfData => {
      try {
        const lastPage = pdfData.Pages[pdfData.Pages.length - 1];
        // Note: pdf2json coordinates are typically in a 0-based CSS-like coordinate system
        // The default scale factor is roughly 4.5 * 16 / 72. We'll capture them as-is.
        const texts = lastPage.Texts.map((item: any) => ({
          text: decodeURIComponent(item.R[0].T),
          x: item.x,
          y: item.y
        }));

        // Height in pdf2json units
        const pageHeight = lastPage.Height;

        resolve({ texts, pageHeight });
      } catch (e) {
        reject(e);
      }
    });

    pdfParser.parseBuffer(pdfBytes);
  });
}

/**
 * Find the signature positions on the last page using pure JS coordinates.
 */
async function findSignaturePositionsPureJS(
  pdfBytes: Buffer
): Promise<{ partyA: { x: number; y: number } | null; partyB: { x: number; y: number } | null }> {

  // 1. Get raw text from pdf2json
  const { texts, pageHeight: jsonHeight } = await extractTextFromLastPage(pdfBytes);

  // 2. Load with pdf-lib to get actual target page dimensions
  const doc = await PDFDocument.load(pdfBytes);
  const lastPage = doc.getPages()[doc.getPages().length - 1];
  const pdfWidth = lastPage.getWidth();
  const pdfHeight = lastPage.getHeight();
  doc.isEncrypted

  // pdf2json has a fixed internal coordinate system relative to roughly a base unit.
  // x_multiplier approx = pdfWidth / (jsonPageWidth)
  // Let's find the scaling factor. pdf2json standard page width is usually around 38.
  // We'll calculate ratio by finding max x.
  const jsonWidth = Math.max(...texts.map(t => t.x)) + 5;

  // Safer scaling calculation (pdf2json standard conversion factor is 4.5 / 72 * 16... but empirical works best)
  // 1 pdf2json unit = ~22.6 pdf-lib points.
  const UNIT = 22.6;

  const mappedTexts = texts.map(t => ({
    text: t.text,
    // Convert to pdf-lib coordinate system
    libX: t.x * UNIT,
    // pdf-lib y is from bottom up. pdf2json is top down.
    libY: pdfHeight - (t.y * UNIT)
  }));

  // Group by y coordinate (with slight tolerance since text might be slightly off)
  const yTolerance = 5;
  const groups: { y: number, items: typeof mappedTexts }[] = [];

  for (const item of mappedTexts) {
    const existing = groups.find(g => Math.abs(g.y - item.libY) < yTolerance);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.push({ y: item.libY, items: [item] });
    }
  }

  // Sort groups by Y ascending (bottom of the page first)
  groups.sort((a, b) => a.y - b.y);

  let partyA: { x: number; y: number } | null = null;
  let partyB: { x: number; y: number } | null = null;
  let lineY_A = 0;
  let lineY_B = 0;

  for (const group of groups) {
    // Sort items left-to-right
    const items = group.items.sort((a, b) => a.libX - b.libX);
    const lineText = items.map(i => i.text).join('');

    // Skip empty or short lines
    if (lineText.trim().length < 2) continue;
    if (/^\d+\s*\/\s*\d+$/.test(lineText.trim())) continue;

    // Party A
    if (!partyA && (lineText.includes('Party A') || lineText.includes('甲方'))) {
      lineY_A = group.y;
      const tItem = items.find(i => i.text.includes('Party') || i.text.includes('甲'));
      if (tItem) partyA = { x: tItem.libX, y: tItem.libY };
    }

    // Party B
    if (!partyB && (lineText.includes('Party B') || lineText.includes('乙方'))) {
      lineY_B = group.y;
      const tItem = items.find(i => i.text.includes('Party') || i.text.includes('乙'));
      if (tItem) partyB = { x: tItem.libX, y: tItem.libY };
    }

    if (partyA && partyB) break;
  }

  // If they are on the same line and we only caught one:
  if (partyA && !partyB && lineY_A !== 0) {
     const sameLineGroup = groups.find(g => Math.abs(g.y - lineY_A) < yTolerance);
     if (sameLineGroup) {
        const items = sameLineGroup.items.sort((a, b) => a.libX - b.libX);
        const partyItems = items.filter(i => i.text.includes('Party') || i.text.includes('乙'));
        if (partyItems.length >= 2) {
           const bItem = partyItems[1];
           partyB = { x: bItem.libX, y: bItem.libY };
        }
     }
  }

  return { partyA, partyB };
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

    // Use our new Pure JS parsing which never throws Canvas module errors
    const { partyA, partyB } = await findSignaturePositionsPureJS(pdfBytes);

    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()
    const lastPageIdx = pages.length - 1;

    const adminSignBytes = contract.adminSignatureUrl
      ? Buffer.from(contract.adminSignatureUrl.split(',')[1], 'base64')
      : null
    const creatorSignBytes = contract.creatorSignatureUrl
      ? Buffer.from(contract.creatorSignatureUrl.split(',')[1], 'base64')
      : null

    const SIGNATURE_HEIGHT = 50
    // Increased gap to lower the signature since pdf2json coordinate top anchors might be slightly higher
    const GAP_PT = 20

    // Draw Admin Signature (Party A)
    if (adminSignBytes) {
      const adminImage = await pdfDoc.embedPng(adminSignBytes)
      const scale = SIGNATURE_HEIGHT / adminImage.height
      const imgWidth = adminImage.width * scale

      if (partyA) {
        const targetPage = pages[lastPageIdx]
        const sigY = partyA.y - GAP_PT - SIGNATURE_HEIGHT

        targetPage.drawImage(adminImage, {
          x: partyA.x,
          y: Math.max(0, sigY),
          width: imgWidth,
          height: SIGNATURE_HEIGHT,
        })
      } else {
        const targetPage = pages[lastPageIdx]
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
        const targetPage = pages[lastPageIdx]
        const sigY = partyB.y - GAP_PT - SIGNATURE_HEIGHT

        targetPage.drawImage(creatorImage, {
          x: partyB.x,
          y: Math.max(0, sigY),
          width: imgWidth,
          height: SIGNATURE_HEIGHT,
        })
      } else {
        const targetPage = pages[lastPageIdx]
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
  } catch (error: any) {
    console.error('PDF Generation Error:', error)
    // Send back exact error message to make debugging easier in production
    return new NextResponse(`Failed to generate PDF: ${error.message}`, { status: 500 })
  }
}
