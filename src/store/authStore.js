import { create } from 'zustand'
import { getStoredToken, setStoredToken } from '@/lib/sessionStorage.js'

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  hydrated: false,

  setHydrated: (value) => set({ hydrated: value }),

  setSession: (user, token) => {
    if (typeof window !== 'undefined' && window.electron?.setAuthToken) {
      window.electron.setAuthToken(token)
    }
    setStoredToken(token)
    set({
      user,
      token,
      isAuthenticated: Boolean(user && token),
    })
  },

  clearSession: () => {
    if (typeof window !== 'undefined' && window.electron?.setAuthToken) {
      window.electron.setAuthToken(null)
    }
    setStoredToken(null)
    set({ user: null, token: null, isAuthenticated: false })
  },

  restoreTokenFromDisk: () => {
    const token = getStoredToken()
    if (token && typeof window !== 'undefined' && window.electron?.setAuthToken) {
      window.electron.setAuthToken(token)
    }
    set({ token })
    return token
  },

  applyUser: (user) => {
    const token = get().token
    set({
      user,
      isAuthenticated: Boolean(user && token),
    })
  },
}))
