import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import Sidebar from '@/components/Sidebar.jsx'
import Topbar from '@/components/Topbar.jsx'
import UpdateNotifier from '@/components/UpdateNotifier.jsx'
import DevicePulse from '@/components/DevicePulse.jsx'
import { useAppRole } from '@/hooks/useAppRole.js'

const STORAGE_KEY = 'hooman.sidebar_collapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const { isServer } = useAppRole()

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-surface text-foreground">
      <Toaster richColors theme="dark" />
      <UpdateNotifier />
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
        footer={isServer ? <DevicePulse collapsed={collapsed} /> : null}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="min-h-0 flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
