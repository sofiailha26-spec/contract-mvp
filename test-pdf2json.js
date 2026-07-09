const fs = require('fs');
const PDFParser = require('pdf2json');

async function test() {
  const pdfParser = new PDFParser();
  pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError) );
  pdfParser.on("pdfParser_dataReady", pdfData => {
      const page = pdfData.Pages[pdfData.Pages.length - 1]; // last page
      for (const text of page.Texts) {
         const str = decodeURIComponent(text.R[0].T);
         console.log(str, 'x:', text.x, 'y:', text.y);
      }
  });
  
  // Download a test file or load dummy
  console.log("PDFParser initialized");
}
test();
