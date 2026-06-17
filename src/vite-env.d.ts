/// <reference types="vite/client" />

export {}

declare global {
  interface Window {
    electron?: {
      setAuthToken: (token: string | null) => void
      bootstrapStatus: () => Promise<{
        hasDbConfig: boolean
        dbReachable: boolean
        hasUsers: boolean
        needsAdminSetup: boolean
        needsDatabaseSetup?: boolean
        error?: string
        migrationError?: string
      }>
      login: (credentials: { username: string; password: string }) => Promise<{
        token: string
        user: { id: number; username: string; role: string; employeeId: number | null }
      }>
      logout: () => Promise<{ ok: boolean }>
      createFirstAdmin: (data: {
        username: string
        password: string
      }) => Promise<{ ok: boolean }>
      session: () => Promise<{
        user: {
          id: number
          username: string
          role: string
          employeeId: number | null
        } | null
      }>
      getEmployees: (filters?: Record<string, unknown>) => Promise<unknown[]>
      getAttendanceLogs: (filters?: Record<string, unknown>) => Promise<unknown[]>
      syncAttendance: () => Promise<unknown>
      getDeviceStatus: () => Promise<
        Array<{
          id: string
          name: string
          ip: string
          port: number
          enabled: boolean
          status: string
          lastMessage: string | null
          lastCount: number | null
        }>
      >
      getDbConfig: () => Promise<{ merged: Record<string, unknown>; saved: unknown }>
      saveDbConfig: (config: Record<string, unknown>) => Promise<{ ok: boolean }>
      testDbConnection: (config: Record<string, unknown>) => Promise<{ ok: boolean }>
      onUpdateReady: (cb: () => void) => () => void
      installUpdate: () => Promise<{ ok: boolean }>
    }
  }
}
