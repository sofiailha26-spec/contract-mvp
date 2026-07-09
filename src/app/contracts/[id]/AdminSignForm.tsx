'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// Dynamically import SignaturePad with SSR disabled
const SignaturePad = dynamic(() => import('@/components/SignaturePad'), { ssr: false })

export default function AdminSignForm({ contractId }: { contractId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const sigCanvasRef = useRef<any>(null)
  const router = useRouter()

  const handleClear = () => {
    sigCanvasRef.current?.clear()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (sigCanvasRef.current?.isEmpty()) {
      alert('Please provide your signature')
      return
    }

    setIsSubmitting(true)

    try {
      const signatureDataUrl = sigCanvasRef.current.getTrimmedCanvas().toDataURL('image/png')

      const res = await fetch(`/api/contracts/${contractId}/admin-sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminName: 'Admin', // 默认占位
          signature: signatureDataUrl
        })
      })

      if (!res.ok) throw new Error('Failed to sign contract')

      router.refresh()
    } catch (error) {
      console.error(error)
      alert('Failed to submit signature')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block mb-1 font-medium">Signature</label>
        <div className="border border-gray-300 rounded">
          <SignaturePad ref={sigCanvasRef} />
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="text-sm text-gray-500 mt-1 hover:underline"
        >
          Clear Signature
        </button>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {isSubmitting ? 'Submitting...' : 'Sign and Complete Contract'}
      </button>
    </form>
  )
}
