import { useEffect } from 'react'
import { toast } from 'sonner'

export default function UpdateNotifier() {
  useEffect(() => {
    if (!window.electron?.onUpdateReady) return undefined
    let promptBeforeInstall = true
    window.electron
      ?.getUpdaterSettings?.()
      .then((cfg) => {
        promptBeforeInstall = Boolean(cfg?.promptBeforeInstall ?? true)
      })
      .catch(() => {})

    const unsubReady = window.electron.onUpdateReady(() => {
      toast('Update ready', {
        description: 'A new version of Hooman is ready to install.',
        action: {
          label: 'Install now',
          onClick: async () => {
            if (!promptBeforeInstall) {
              await window.electron?.installUpdate?.()
              return
            }
            const restartNow = window.confirm('Update is ready. Restart now to install it?')
            if (restartNow) await window.electron?.installUpdate?.()
          },
        },
        duration: Infinity,
      })
    })
    const unsubStatus = window.electron?.onUpdateStatus?.((event) => {
      if (event?.type === 'available') {
        toast('Update available', {
          description: event.message || 'New update found.',
        })
      }
      if (event?.type === 'error') {
        toast.error(event.message || 'Update check failed')
      }
    })
    return () => {
      unsubReady?.()
      unsubStatus?.()
    }
  }, [])

  return null
}
