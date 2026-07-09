import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link' // Add Link for custom logic

// Dynamically import our wrapper component with ssr: false
const SignaturePad = dynamic(() => import('@/components/SignaturePad'), { ssr: false })

export default function CreatorSignClient() {
  const params = useParams()
  const token = params?.token as string

  const [contract, setContract] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [hasRead, setHasRead] = useState(false)
  const [creatorName, setCreatorName] = useState('')
  const sigPadRef = useRef<any>(null)

  useEffect(() => {
    if (token) {
       fetchContract()
    }
  }, [token])

  const fetchContract = async () => {
    setLoading(true)
    try {
      // Add a cache buster to prevent any Next.js caching shenanigans
      const res = await fetch(`/api/sign/${token}?t=${Date.now()}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setContract(data)
      } else {
        setContract(null)
      }
    } catch (error) {
      console.error(error)
      setContract(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-center">Loading contract...</div>
  if (!contract) return <div className="p-8 text-center text-red-500">Invalid link or contract not found</div>
  if (contract.status !== 'pending_creator' && !submitted) {
    return <div className="p-8 text-center text-gray-500">This contract has already been signed or is no longer available.</div>
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-md w-full text-center">
          <div className="text-green-500 text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold mb-2">Successfully Signed</h1>
          <p className="text-gray-500">Your signature has been securely saved. The admin will review it shortly.</p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasRead) {
      alert('Please confirm you have read the contract.')
      return
    }
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      alert('Please provide your signature.')
      return
    }

    setSubmitting(true)
    const signatureDataUrl = sigPadRef.current.getTrimmedCanvas().toDataURL('image/png')

    try {
      const res = await fetch(`/api/sign/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorName: 'Creator', signature: signatureDataUrl })
      })

      if (res.ok) {
        setSubmitted(true)
      } else {
        alert('Failed to submit signature')
      }
    } catch (error) {
      alert('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row h-[85vh]">

        {/* Left Side: PDF Preview */}
        <div className="w-full md:w-2/3 bg-gray-100 border-r border-gray-200 flex flex-col">
          <div className="bg-gray-800 text-white p-3 text-sm font-medium flex justify-between items-center">
            <span>Contract Document</span>
            {/* Switched back to normal a tag to avoid next router fetching completely */}
            <a href={`/api/contracts/${contract.id}/original`} target="_blank" className="text-blue-300 hover:text-white underline text-xs">Open in new tab</a>
          </div>
          <div className="flex-1 overflow-auto">
            {/* Added loading attribute to delay iframe loading slightly */}
            <iframe
               src={`/api/contracts/${contract.id}/original#toolbar=0&navpanes=0`}
               className="w-full h-full border-none"
               title="PDF Preview"
               loading="lazy"
            />
          </div>
        </div>

        {/* Right Side: Sign Action */}
        <div className="w-full md:w-1/3 p-6 flex flex-col bg-white overflow-y-auto">
           <h2 className="text-xl font-bold mb-1">Review & Sign</h2>
           <p className="text-sm text-gray-500 mb-6">{contract.name}</p>

           <form onSubmit={handleSubmit} className="flex flex-col gap-6 mt-auto">
             <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
               <label className="flex items-start gap-3 cursor-pointer">
                 <input
                   type="checkbox"
                   className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-600"
                   checked={hasRead}
                   onChange={(e) => setHasRead(e.target.checked)}
                 />
                 <span className="text-sm text-gray-700">
                   I have read and agree to the terms in the contract document shown on the left.
                 </span>
               </label>
             </div>

             {hasRead && (
               <>
                 <div>
                   <div className="flex justify-between items-end mb-1">
                     <label className="block text-sm font-medium text-gray-900">Your Signature</label>
                     <button
                       type="button"
                       onClick={() => sigPadRef.current?.clear()}
                       className="text-xs text-red-500 hover:text-red-700"
                     >
                       Clear
                     </button>
                   </div>
                   <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                     <SignaturePad
                       ref={sigPadRef}
                       className="w-full h-32 rounded-lg cursor-crosshair"
                     />
                   </div>
                 </div>

                 <button
                   type="submit"
                   disabled={submitting}
                   className="w-full rounded-md bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 mt-4"
                 >
                   {submitting ? 'Submitting...' : 'Sign Contract'}
                 </button>
               </>
             )}
           </form>
        </div>

      </div>
    </div>
  )
}