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

    return () => {
      unsubReady?.()
    }
  }, [])

  return null
}
