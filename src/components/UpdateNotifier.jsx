import { useEffect } from 'react'
import { toast } from 'sonner'

export default function UpdateNotifier() {
  useEffect(() => {
    if (!window.electron?.onUpdateReady) return undefined
    const unsub = window.electron.onUpdateReady(() => {
      toast('Update ready', {
        description: 'A new version of Hooman is ready to install.',
        action: {
          label: 'Restart & update',
          onClick: () => window.electron?.installUpdate?.(),
        },
        duration: Infinity,
      })
    })
    return unsub
  }, [])

  return null
}
