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

  // Base dimensions that will represent the original PDF scale
  const pdfWidth = 595.28 // standard A4 width
  const pdfHeight = 841.89 // standard A4 height

  // Position states (in percentages 0-1 to be responsive)
  const [adminPos, setAdminPos] = useState({ x: 0.1, y: 0.8, page: 1 })
  const [creatorPos, setCreatorPos] = useState({ x: 0.5, y: 0.8, page: 1 })

  const containerRef = useRef<HTMLDivElement>(null)
  const [containerDims, setContainerDims] = useState({ width: 0, height: 0 })

  useEffect(() => {
    params.then(p => {
      setId(p.id)
      fetchPdfData(p.id)
    })
  }, [params])

  // Update container dimensions when the window resizes or component loads
  useEffect(() => {
    const updateDims = () => {
      if (containerRef.current) {
        setContainerDims({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || (containerRef.current.clientWidth * (pdfHeight/pdfWidth))
        })
      }
    }
    updateDims()
    window.addEventListener('resize', updateDims)
    // Small delay to ensure the page has rendered
    setTimeout(updateDims, 500)
    return () => window.removeEventListener('resize', updateDims)
  }, [pdfData, currentPage])

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

  const handleDrag = (e: React.DragEvent | React.TouchEvent | React.MouseEvent, type: 'admin' | 'creator', isDragEnd = false) => {
    if (!containerRef.current) return

    // Support both mouse and touch events
    let clientX, clientY;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('changedTouches' in e && e.changedTouches.length > 0 && isDragEnd) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    } else {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect()

    // Calculate percentage position (0 to 1) relative to the PDF page container
    let x = (clientX - rect.left) / rect.width
    let y = (clientY - rect.top) / rect.height

    // Constrain within bounds
    x = Math.max(0, Math.min(x, 0.8)) // 0.8 to leave room for the box width
    y = Math.max(0, Math.min(y, 0.9)) // 0.9 to leave room for the box height

    if (type === 'admin') {
      setAdminPos({ ...adminPos, x, y, page: currentPage })
    } else {
      setCreatorPos({ ...creatorPos, x, y, page: currentPage })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/contracts/${id}/positions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Convert percentages back to actual PDF points (standard A4 sizes)
          // Note: pdf-lib Y coordinate starts from bottom, so we invert Y
          adminSignX: adminPos.x * pdfWidth,
          adminSignY: (1 - adminPos.y - 0.05) * pdfHeight, // Subtract box height roughly
          adminSignPage: adminPos.page - 1, // 0-indexed for backend

          creatorSignX: creatorPos.x * pdfWidth,
          creatorSignY: (1 - creatorPos.y - 0.05) * pdfHeight,
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

  const boxWidth = "120px"
  const boxHeight = "50px"

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <div className="mb-6 flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div>
          <h1 className="text-xl font-bold">Position Signatures</h1>
          <p className="text-sm text-gray-500">Drag the boxes to where you want the signatures to appear on the PDF.</p>
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
            {saving ? 'Saving...' : 'Save Positions & Finish'}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* PDF Viewer Area */}
        <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden border border-gray-300 relative select-none">
          <div
            ref={containerRef}
            className="relative inline-block shadow-lg mx-auto"
            style={{ minHeight: '800px' }}
          >
            <Document
              file={`data:application/pdf;base64,${pdfData}`}
              onLoadSuccess={({ numPages }) => {
                setNumPages(numPages)
                // Set default page to the last page where signatures usually go
                setCurrentPage(numPages)
                setAdminPos(p => ({ ...p, page: numPages }))
                setCreatorPos(p => ({ ...p, page: numPages }))
              }}
              className="w-full flex justify-center"
            >
              <Page
                pageNumber={currentPage}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                width={containerDims.width > 0 ? containerDims.width : undefined}
                className="max-w-full"
              />
            </Document>

            {/* Admin Drag Box */}
            {adminPos.page === currentPage && (
              <div
                className="absolute border-2 border-dashed border-blue-500 bg-blue-500/20 rounded cursor-move flex items-center justify-center text-blue-700 font-bold text-xs shadow-md z-10"
                style={{
                  left: `${adminPos.x * 100}%`,
                  top: `${adminPos.y * 100}%`,
                  width: boxWidth,
                  height: boxHeight,
                  touchAction: 'none'
                }}
                draggable
                onDragEnd={(e) => handleDrag(e, 'admin', true)}
                onTouchEnd={(e) => handleDrag(e, 'admin', true)}
              >
                My Sign (Admin)
              </div>
            )}

            {/* Creator Drag Box */}
            {creatorPos.page === currentPage && (
              <div
                className="absolute border-2 border-dashed border-green-500 bg-green-500/20 rounded cursor-move flex items-center justify-center text-green-700 font-bold text-xs shadow-md z-10"
                style={{
                  left: `${creatorPos.x * 100}%`,
                  top: `${creatorPos.y * 100}%`,
                  width: boxWidth,
                  height: boxHeight,
                  touchAction: 'none'
                }}
                draggable
                onDragEnd={(e) => handleDrag(e, 'creator', true)}
                onTouchEnd={(e) => handleDrag(e, 'creator', true)}
              >
                Creator Sign
              </div>
            )}
          </div>
        </div>

        {/* Instructions Sidebar */}
        <div className="w-64 bg-white p-4 rounded-lg shadow-sm border border-gray-200 self-start">
          <h3 className="font-bold mb-3">How to use</h3>
          <ol className="list-decimal pl-4 space-y-2 text-sm text-gray-600">
            <li>Navigate to the page where you want the signatures (usually the last page).</li>
            <li>Drag the blue box to where you want <b>your</b> signature to go.</li>
            <li>Drag the green box to where the <b>Creator's</b> signature should go.</li>
            <li>Click Save. Signatures will be perfectly placed in these boxes.</li>
          </ol>
          <div className="mt-6 pt-4 border-t">
             {adminPos.page !== currentPage && (
               <div className="text-xs text-blue-600 mb-2">My Sign is on page {adminPos.page}</div>
             )}
             {creatorPos.page !== currentPage && (
               <div className="text-xs text-green-600">Creator Sign is on page {creatorPos.page}</div>
             )}
          </div>
        </div>
      </div>
    </div>
  )
}
