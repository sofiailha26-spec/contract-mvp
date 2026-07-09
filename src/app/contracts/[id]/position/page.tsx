'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Set up the worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

type PositionProps = {
  params: Promise<{ id: string }>
}

export default function PositionPage({ params }: PositionProps) {
  const router = useRouter()
  const [id, setId] = useState<string>('')
  const [pdfData, setPdfData] = useState<string>('')
  const [numPages, setNumPages] = useState<number>(1)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Internal PDF dimensions to convert back to points
  const [pdfNativeWidth, setPdfNativeWidth] = useState(595.28)
  const [pdfNativeHeight, setPdfNativeHeight] = useState(841.89)

  // Box positions as percentages (0 to 1)
  const [adminPos, setAdminPos] = useState({ x: 0.1, y: 0.85, page: 1 })
  const [creatorPos, setCreatorPos] = useState({ x: 0.5, y: 0.85, page: 1 })

  const containerRef = useRef<HTMLDivElement>(null)

  // Track dragging state
  const [draggingTarget, setDraggingTarget] = useState<'admin' | 'creator' | null>(null)

  useEffect(() => {
    params.then(p => {
      setId(p.id)
      fetchPdfData(p.id)
    })
  }, [params])

  const fetchPdfData = async (contractId: string) => {
    try {
      const res = await fetch(`/api/contracts/${contractId}/raw-pdf`)
      if (res.ok) {
        const data = await res.json()
        setPdfData(data.base64)
      } else {
        alert("Failed to load PDF data")
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Handle document load to get native dimensions
  const onDocumentLoadSuccess = (pdf: any) => {
    setNumPages(pdf.numPages)
    setCurrentPage(pdf.numPages)
    setAdminPos(p => ({ ...p, page: pdf.numPages }))
    setCreatorPos(p => ({ ...p, page: pdf.numPages }))
  }

  const onPageLoadSuccess = (page: any) => {
    // Get the native dimensions of the PDF page from viewport
    const viewport = page.getViewport({ scale: 1 })
    setPdfNativeWidth(viewport.width)
    setPdfNativeHeight(viewport.height)
  }

  // Unified Mouse & Touch event handlers for dragging
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent, target: 'admin' | 'creator') => {
    // Prevent default to avoid scrolling while dragging on mobile
    if(e.cancelable) e.preventDefault()
    setDraggingTarget(target)
  }

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!draggingTarget || !containerRef.current) return

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = (e as React.MouseEvent).clientX
      clientY = (e as React.MouseEvent).clientY
    }

    const rect = containerRef.current.getBoundingClientRect()

    // Calculate percentage relative to the visible page container
    let x = (clientX - rect.left) / rect.width
    let y = (clientY - rect.top) / rect.height

    // Clamp coordinates so boxes don't go outside the PDF bounds
    x = Math.max(0, Math.min(x, 0.75)) // 0.75 to leave space for box width
    y = Math.max(0, Math.min(y, 0.93)) // 0.93 to leave space for box height

    if (draggingTarget === 'admin') {
      setAdminPos({ ...adminPos, x, y, page: currentPage })
    } else {
      setCreatorPos({ ...creatorPos, x, y, page: currentPage })
    }
  }

  const handlePointerUp = () => {
    setDraggingTarget(null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/contracts/${id}/positions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Convert percentages to pdf-lib coordinate space
          // pdf-lib's Y coordinate starts from BOTTOM left
          adminSignX: adminPos.x * pdfNativeWidth,
          adminSignY: (1 - adminPos.y) * pdfNativeHeight - 50, // Subtract 50 (height of signature) to match top-left to bottom-left origin
          adminSignPage: adminPos.page - 1,

          creatorSignX: creatorPos.x * pdfNativeWidth,
          creatorSignY: (1 - creatorPos.y) * pdfNativeHeight - 50,
          creatorSignPage: creatorPos.page - 1
        })
      })

      if (res.ok) {
        router.push('/')
      } else {
        alert("Failed to save positions")
      }
    } catch (error) {
      console.error(error)
      alert("Error saving positions")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-12 text-center">Loading PDF...</div>
  if (!pdfData) return <div className="p-12 text-center text-red-500">Could not load PDF.</div>

  const boxWidth = "25%"
  const boxHeight = "7%"

  return (
    <div
      className="min-h-screen bg-gray-50 pb-12"
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      onMouseLeave={handlePointerUp}
    >
      <div className="max-w-5xl mx-auto py-6 px-4">
        {/* Top Control Bar */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200 gap-4">
          <div>
            <h1 className="text-xl font-bold">Position Signatures</h1>
            <p className="text-sm text-gray-500">Drag the boxes exactly where you want signatures to appear.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-md">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1 bg-white rounded shadow-sm disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-sm font-medium px-2">Page {currentPage} of {numPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                disabled={currentPage >= numPages}
                className="px-3 py-1 bg-white rounded shadow-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save & Finish'}
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-col md:flex-row gap-6">

          {/* Instructions Sidebar */}
          <div className="w-full md:w-64 bg-white p-4 rounded-lg shadow-sm border border-gray-200 self-start order-2 md:order-1">
            <h3 className="font-bold mb-3">Instructions</h3>
            <ol className="list-decimal pl-4 space-y-2 text-sm text-gray-600">
              <li>Go to the page where signatures should be (usually the last page).</li>
              <li>Drag the <span className="text-blue-600 font-semibold">Blue box</span> to where YOUR signature goes.</li>
              <li>Drag the <span className="text-green-600 font-semibold">Green box</span> to where the CREATOR'S signature goes.</li>
              <li>Click Save & Finish.</li>
            </ol>
            <div className="mt-6 pt-4 border-t space-y-2">
              {adminPos.page !== currentPage && (
                <div className="text-xs font-medium text-blue-600 bg-blue-50 p-2 rounded">
                  Your Sign is currently on page {adminPos.page}
                </div>
              )}
              {creatorPos.page !== currentPage && (
                <div className="text-xs font-medium text-green-600 bg-green-50 p-2 rounded">
                  Creator Sign is currently on page {creatorPos.page}
                </div>
              )}
            </div>
          </div>

          {/* PDF Viewer Area */}
          <div className="flex-1 bg-gray-300 rounded-lg overflow-hidden border border-gray-400 p-2 flex justify-center order-1 md:order-2 shadow-inner">
            {/* The wrapper that contains the PDF page and the draggable overlays */}
            <div
              ref={containerRef}
              className="relative shadow-xl bg-white"
              style={{ width: 'fit-content' }}
            >
              <Document
                file={`data:application/pdf;base64,${pdfData}`}
                onLoadSuccess={onDocumentLoadSuccess}
                className="flex justify-center"
              >
                <Page
                  pageNumber={currentPage}
                  onLoadSuccess={onPageLoadSuccess}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  // We let the page render at its native scale or responsive width
                  className="max-w-full"
                  width={window.innerWidth < 768 ? window.innerWidth - 64 : undefined} // Scale down on mobile
                />
              </Document>

              {/* Admin Drag Box */}
              {adminPos.page === currentPage && (
                <div
                  className="absolute border-2 border-dashed border-blue-600 bg-blue-500/30 cursor-move flex items-center justify-center text-blue-800 font-bold text-xs sm:text-sm shadow-md transition-shadow hover:shadow-lg hover:bg-blue-500/40"
                  style={{
                    left: `${adminPos.x * 100}%`,
                    top: `${adminPos.y * 100}%`,
                    width: boxWidth,
                    height: boxHeight,
                    touchAction: 'none',
                    zIndex: draggingTarget === 'admin' ? 50 : 10
                  }}
                  onMouseDown={(e) => handlePointerDown(e, 'admin')}
                  onTouchStart={(e) => handlePointerDown(e, 'admin')}
                >
                  My Sign
                </div>
              )}

              {/* Creator Drag Box */}
              {creatorPos.page === currentPage && (
                <div
                  className="absolute border-2 border-dashed border-green-600 bg-green-500/30 cursor-move flex items-center justify-center text-green-800 font-bold text-xs sm:text-sm shadow-md transition-shadow hover:shadow-lg hover:bg-green-500/40"
                  style={{
                    left: `${creatorPos.x * 100}%`,
                    top: `${creatorPos.y * 100}%`,
                    width: boxWidth,
                    height: boxHeight,
                    touchAction: 'none',
                    zIndex: draggingTarget === 'creator' ? 50 : 10
                  }}
                  onMouseDown={(e) => handlePointerDown(e, 'creator')}
                  onTouchStart={(e) => handlePointerDown(e, 'creator')}
                >
                  Creator Sign
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
