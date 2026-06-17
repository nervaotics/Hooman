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
      getPayrollPeriods: () => Promise<unknown[]>
      getPayrollPeriod: (id: number) => Promise<{ period: Record<string, unknown>; records: unknown[] }>
      createPayrollPeriod: (data: Record<string, unknown>) => Promise<{ period: Record<string, unknown> }>
      updatePayrollPeriod: (id: number, data: Record<string, unknown>) => Promise<{ period: Record<string, unknown> }>
      deletePayrollPeriod: (id: number) => Promise<{ ok: boolean }>
      processPayrollPeriod: (id: number) => Promise<{
        processed: number
        skipped: number
        totalEmployees: number
        records?: unknown[]
      }>
      updatePayrollRecord: (
        id: number,
        data: { arrears?: number; deduction_amount?: number },
      ) => Promise<{ ok: boolean }>
      approvePayrollPeriod: (id: number) => Promise<{ ok: boolean }>
      revertPayrollPeriod: (id: number) => Promise<{ ok: boolean }>
      getPayrollStatutorySettings: () => Promise<Record<string, unknown>>
      savePayrollStatutorySettings: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
      getPayrollPeriodAttendance: (
        periodId: number,
        employeeIds: number[],
      ) => Promise<{ rows: unknown[] }>
      getPayrollHistory: () => Promise<unknown[]>
      getAttendanceLogs: (filters?: Record<string, unknown>) => Promise<unknown[]>
      syncAttendance: (filters?: { fromDate?: string; toDate?: string }) => Promise<unknown>
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
