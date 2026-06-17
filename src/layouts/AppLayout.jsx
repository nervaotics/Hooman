import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import Sidebar from '@/components/Sidebar.jsx'
import Topbar from '@/components/Topbar.jsx'
import UpdateNotifier from '@/components/UpdateNotifier.jsx'
import DevicePulse from '@/components/DevicePulse.jsx'

export default function AppLayout() {
  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-surface text-foreground">
      <Toaster richColors theme="dark" />
      <UpdateNotifier />
      <Sidebar footer={<DevicePulse />} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="min-h-0 flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
