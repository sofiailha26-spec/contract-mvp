import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { readFile } from 'fs/promises'
import path from 'path'

export async function generateFinalPdf(contract: any) {
  const templatePath = path.join(process.cwd(), 'public', contract.template.filePath)
  console.log("generateFinalPdf - input file:", templatePath)
  
  // MVP 只支持 PDF 文件的合成操作
  if (contract.template.fileType !== 'pdf' && !templatePath.toLowerCase().endsWith('.pdf')) {
    console.error("generateFinalPdf - Only PDF is supported. Got:", contract.template.fileType)
    throw new Error('generateFinalPdf Error: Only PDF template is supported for PDF generation in current MVP')
  }

  const pdfBytes = await readFile(templatePath)
  
  const pdfDoc = await PDFDocument.load(pdfBytes)

  // Use a simple font for MVP if custom fonts are failing
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  
  const pages = pdfDoc.getPages()
  const firstPage = pages[0]
  
  const adminData = JSON.parse(contract.adminData || '{}')
  const userData = JSON.parse(contract.userData || '{}')

  // We are drawing English alphabets to avoid WinAnsi encoding issues with StandardFonts
  // Note: For a true Chinese MVP, a valid .ttf font is required. This gets the PDF download working.
  try {
    firstPage.drawText(`Admin: ${adminData.admin_text_1 || adminData.company_name || ''}`, {
      x: 50,
      y: firstPage.getHeight() - 100,
      size: 14,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    })
    
    firstPage.drawText(`User: ${userData.user_text_1 || userData.user_name || ''}`, {
      x: 50,
      y: firstPage.getHeight() - 130,
      size: 14,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    })
  } catch (e) {
    console.error("Text drawing error", e)
  }

  // Add Admin Signature
  if (adminData.admin_sign) {
    try {
      const adminSignImageBytes = Buffer.from(adminData.admin_sign.split(',')[1], 'base64')
      const adminImage = await pdfDoc.embedPng(adminSignImageBytes)
      firstPage.drawImage(adminImage, {
        x: 50,
        y: 50,
        width: 150,
        height: 50,
      })
    } catch(e) { console.error("Admin sign error", e) }
  }

  // Add User Signature
  if (userData.user_sign) {
    try {
      const userSignImageBytes = Buffer.from(userData.user_sign.split(',')[1], 'base64')
      const userImage = await pdfDoc.embedPng(userSignImageBytes)
      firstPage.drawImage(userImage, {
        x: 300,
        y: 50,
        width: 150,
        height: 50,
      })
    } catch(e) { console.error("User sign error", e) }
  }

  const pdfBytesFinal = await pdfDoc.save()
  console.log("generateFinalPdf - generated successfully, length:", pdfBytesFinal.length)
  return pdfBytesFinal
}
