declare module 'pdfjs-dist/legacy/build/pdf' {
  export interface TextItem {
    str: string
    dir: string
    transform: number[]
    width: number
    height: number
    fontName: string
    hasEOL?: boolean
  }

  export interface TextContent {
    items: TextItem[]
  }

  export interface PageViewport {
    width: number
    height: number
    scale: number
  }

  export interface PDFPageProxy {
    getTextContent(): Promise<TextContent>
    getViewport(params: { scale: number }): PageViewport
  }

  export interface PDFDocumentProxy {
    numPages: number
    getPage(pageNumber: number): Promise<PDFPageProxy>
    destroy(): void
  }

  export interface PDFDocumentLoadingTask {
    promise: Promise<PDFDocumentProxy>
  }

  export function getDocument(params: {
    data: Uint8Array
    useSystemFonts?: boolean
    standardFontDataUrl?: string
  }): PDFDocumentLoadingTask
}
