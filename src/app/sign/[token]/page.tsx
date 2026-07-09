import dynamic from 'next/dynamic'

// Dynamically import our client component with ssr: false
const CreatorSignClient = dynamic(() => import('./CreatorSignClient'), { ssr: false })

export default function CreatorSignPage() {
  return <CreatorSignClient />
}
