import TitleBar from '@/components/TitleBar.jsx'
import { isElectron } from '@/lib/electron.js'

export default function AppChrome({ children }) {
  const customTitleBar =
    isElectron() && Boolean(window.electron?.customTitleBar)

  if (!customTitleBar) {
    return children
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface text-foreground">
      <TitleBar />
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
