import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AdminSignForm from './AdminSignForm'

export default async function ContractPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const id = (await params).id
  const contract = await prisma.contract.findUnique({
    where: { id }
  })

  if (!contract) {
    notFound()
  }

  // 只要有 creatorSignatureUrl 就允许 admin 签名
  const canAdminSign = contract.creatorSignatureUrl && !contract.adminSignatureUrl

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Contract Details</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Contract Info</h2>
        <p><strong>Name:</strong> {contract.name}</p>
        <p><strong>Status:</strong> <span className="uppercase font-semibold">{contract.status}</span></p>

        <div className="mt-4">
          <Link
            href={`/api/contracts/${contract.id}/original`}
            target="_blank"
            className="text-blue-500 hover:underline mr-4"
          >
            View Original PDF
          </Link>

          {contract.status === 'completed' && (
            <Link
              href={`/api/contracts/${contract.id}/download`}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 inline-block mt-2"
            >
              Download Final PDF
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Party B (Creator)</h2>
          {contract.creatorSignatureUrl ? (
            <div>
              <p className="mb-2"><strong>Name:</strong> {contract.creatorName}</p>
              <div className="border border-gray-300 p-2 rounded">
                <img src={contract.creatorSignatureUrl} alt="Creator Signature" className="max-h-40" />
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Waiting for creator to sign...</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Party A (Admin)</h2>
          {canAdminSign ? (
            <AdminSignForm contractId={contract.id} />
          ) : contract.adminSignatureUrl ? (
            <div>
              <p className="mb-2"><strong>Name:</strong> {contract.adminName}</p>
              <div className="border border-gray-300 p-2 rounded">
                <img src={contract.adminSignatureUrl} alt="Admin Signature" className="max-h-40" />
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Waiting for creator to sign first...</p>
          )}
        </div>
      </div>
    </div>
  )
}
