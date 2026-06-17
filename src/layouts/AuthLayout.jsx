import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-surface p-6 text-foreground">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  )
}
