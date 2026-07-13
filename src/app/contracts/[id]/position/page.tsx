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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Internal PDF dimensions to convert back to points
  const [pdfNativeWidth, setPdfNativeWidth] = useState(595.28)
  const [pdfNativeHeight, setPdfNativeHeight] = useState(841.89)

  // Responsive page width for react-pdf renderer
  const [renderWidth, setRenderWidth] = useState(800)

  // Box positions as percentages (0 to 1)
  // FIX: Set default y to 0.1 (near the top/header) instead of 0.85 (bottom) to make it easier to grab
  const [adminPos, setAdminPos] = useState({ x: 0.1, y: 0.1, page: 1 })
  const [creatorPos, setCreatorPos] = useState({ x: 0.5, y: 0.1, page: 1 })

  const pageRefs = useRef<(HTMLDivElement | null)[]>([])

  // Track dragging state
  const [draggingTarget, setDraggingTarget] = useState<'admin' | 'creator' | null>(null)
  const [draggingPage, setDraggingPage] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    params.then(p => {
      setId(p.id)
      fetchPdfData(p.id)
    })
  }, [params])

  // Adjust PDF width based on window size
  useEffect(() => {
    const updateWidth = () => {
      setRenderWidth(Math.min(window.innerWidth - 32, 800)) // Max 800px width, with 32px padding on mobile
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

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

  const onDocumentLoadSuccess = (pdf: any) => {
    setNumPages(pdf.numPages)
    // Default signatures to the very last page, but at the TOP (y: 0.1) as requested
    setAdminPos(p => ({ ...p, page: pdf.numPages, y: 0.1 }))
    setCreatorPos(p => ({ ...p, page: pdf.numPages, y: 0.1 }))
  }

  const onPageLoadSuccess = (page: any) => {
    if (page.pageNumber === 1) {
      const viewport = page.getViewport({ scale: 1 })
      setPdfNativeWidth(viewport.width)
      setPdfNativeHeight(viewport.height)
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, target: 'admin' | 'creator', pageNum: number) => {
    // Prevent default touch behaviors like scrolling
    if (e.pointerType === 'touch' && e.cancelable) {
      e.preventDefault();
    }

    // Capture the pointer so dragging works perfectly even if the cursor moves outside the box temporarily
    e.currentTarget.setPointerCapture(e.pointerId)

    // Calculate the exact pixel offset where the user clicked inside the box
    const rect = e.currentTarget.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top

    setDragOffset({ x: offsetX, y: offsetY })
    setDraggingTarget(target)
    setDraggingPage(pageNum)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>, target: 'admin' | 'creator', pageNum: number) => {
    if (draggingTarget !== target || draggingPage !== pageNum) return

    const parentRect = e.currentTarget.parentElement?.getBoundingClientRect()
    if (!parentRect) return

    // Calculate new position using the offset to prevent the box from "jumping" to center
    let x = (e.clientX - dragOffset.x - parentRect.left) / parentRect.width
    let y = (e.clientY - dragOffset.y - parentRect.top) / parentRect.height

    // Clamp coordinates so it cannot leave the PDF page
    x = Math.max(0, Math.min(x, 0.75))
    y = Math.max(0, Math.min(y, 0.93))

    if (target === 'admin') {
      setAdminPos(p => ({ ...p, x, y }))
    } else {
      setCreatorPos(p => ({ ...p, x, y }))
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
    setDraggingTarget(null)
    setDraggingPage(null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/contracts/${id}/positions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminSignX: adminPos.x * pdfNativeWidth,
          adminSignY: (1 - adminPos.y) * pdfNativeHeight - 50,
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

  const moveToThisPage = (pageNum: number) => {
    // When moving to a new page, also place them at the top
    setAdminPos(p => ({ ...p, page: pageNum, y: 0.1 }))
    setCreatorPos(p => ({ ...p, page: pageNum, y: 0.1 }))
    // Scroll to this page
    pageRefs.current[pageNum - 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  if (loading) return <div className="p-12 text-center">Loading PDF...</div>
  if (!pdfData) return <div className="p-12 text-center text-red-500">Could not load PDF.</div>

  const boxWidth = "25%"
  const boxHeight = "7%"

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Sticky Top Header */}
      <div className="sticky top-0 z-50 bg-white shadow-md border-b border-gray-200 px-4 py-3 mb-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Review & Position Signatures</h1>
            <p className="text-sm text-gray-500">Scroll to preview the full contract. Drag signatures to place them.</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 text-white px-8 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 shadow-sm transition-all w-full sm:w-auto"
          >
            {saving ? 'Saving...' : 'Save & Finish'}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 flex flex-col items-center">
        <Document
          file={`data:application/pdf;base64,${pdfData}`}
          onLoadSuccess={onDocumentLoadSuccess}
          className="flex flex-col items-center gap-8 w-full"
        >
          {Array.from(new Array(numPages), (el, index) => {
            const pageNum = index + 1
            const hasAdmin = adminPos.page === pageNum
            const hasCreator = creatorPos.page === pageNum

            return (
              <div key={`page_${pageNum}`} className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col items-center border border-gray-200" style={{ width: renderWidth }}>

                {/* Page Toolbar */}
                <div className="w-full bg-gray-50 border-b border-gray-200 px-4 py-2 flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-600">Page {pageNum} of {numPages}</span>
                  {(!hasAdmin || !hasCreator) && (
                    <button
                      onClick={() => moveToThisPage(pageNum)}
                      className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-100 transition-colors shadow-sm"
                    >
                      Place Signatures Here
                    </button>
                  )}
                </div>

                {/* Page Canvas */}
                <div
                  ref={el => { pageRefs.current[index] = el }}
                  className="relative touch-none"
                  style={{ width: renderWidth }}
                >
                  <Page
                    pageNumber={pageNum}
                    onLoadSuccess={onPageLoadSuccess}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    width={renderWidth}
                  />

                  {/* Admin Drag Box */}
                  {hasAdmin && (
                    <div
                      className="absolute border-2 border-dashed border-blue-600 bg-blue-500/30 flex items-center justify-center text-blue-900 font-bold text-xs sm:text-sm shadow-md transition-all hover:bg-blue-500/40 select-none cursor-grab active:cursor-grabbing touch-none"
                      style={{
                        left: `${adminPos.x * 100}%`,
                        top: `${adminPos.y * 100}%`,
                        width: boxWidth,
                        height: boxHeight,
                        zIndex: draggingTarget === 'admin' ? 50 : 10,
                        transform: draggingTarget === 'admin' ? 'scale(1.03)' : 'scale(1)'
                      }}
                      onPointerDown={(e) => handlePointerDown(e, 'admin', pageNum)}
                      onPointerMove={(e) => handlePointerMove(e, 'admin', pageNum)}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                    >
                      My Sign
                    </div>
                  )}

                  {/* Creator Drag Box */}
                  {hasCreator && (
                    <div
                      className="absolute border-2 border-dashed border-green-600 bg-green-500/30 flex items-center justify-center text-green-900 font-bold text-xs sm:text-sm shadow-md transition-all hover:bg-green-500/40 select-none cursor-grab active:cursor-grabbing touch-none"
                      style={{
                        left: `${creatorPos.x * 100}%`,
                        top: `${creatorPos.y * 100}%`,
                        width: boxWidth,
                        height: boxHeight,
                        zIndex: draggingTarget === 'creator' ? 50 : 10,
                        transform: draggingTarget === 'creator' ? 'scale(1.03)' : 'scale(1)'
                      }}
                      onPointerDown={(e) => handlePointerDown(e, 'creator', pageNum)}
                      onPointerMove={(e) => handlePointerMove(e, 'creator', pageNum)}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                    >
                      Creator Sign
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </Document>
      </div>
    </div>
  )
}
