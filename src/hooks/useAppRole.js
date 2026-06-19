import { useEffect, useState } from 'react'

/**
 * @returns {{ role: string | null, isServer: boolean, isClient: boolean, loading: boolean }}
 */
export function useAppRole() {
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const state = await window.electron?.getSetupState?.()
        if (!cancelled) setRole(state?.appRole ?? null)
      } catch {
        if (!cancelled) setRole(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return {
    role,
    isServer: role !== 'client',
    isClient: role === 'client',
    loading,
  }
}
