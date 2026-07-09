'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !name) return

    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', name)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      if (res.ok) {
        const data = await res.json()
        // Instead of going home, redirect to the positioning page
        router.push(`/contracts/${data.id}/position`)
      } else {
        const data = await res.json()
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert('Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto py-12">
      <div className="bg-white shadow sm:rounded-lg p-8">
        <h1 className="text-2xl font-bold mb-6">Upload PDF Contract</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium leading-6 text-gray-900">Contract Name</label>
            <div className="mt-2">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder="e.g. Creator Agreement v1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium leading-6 text-gray-900">PDF File</label>
            <div className="mt-2">
              <input
                type="file"
                required
                accept="application/pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                     setFile(e.target.files[0])
                     if(!name) setName(e.target.files[0].name.replace('.pdf', ''))
                  }
                }}
                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-md cursor-pointer bg-gray-50 focus:outline-none p-2"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="submit"
              disabled={loading || !file}
              className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
            >
              {loading ? 'Uploading...' : 'Upload & Position Signatures'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="rounded-md bg-white px-6 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
