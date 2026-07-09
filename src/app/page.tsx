import AdminAuth from '@/components/AdminAuth'
import Dashboard from './Dashboard'

export default function Page() {
  return (
    <AdminAuth>
      <Dashboard />
    </AdminAuth>
  )
}
