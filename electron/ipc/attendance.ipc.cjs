const { authorize } = require('../lib/authGuard.cjs')
const { DEFAULT_DEVICES } = require('../zkteco/devices.cjs')
const { pullFromDevice, getLastPollResults } = require('../zkteco/poller.cjs')
const attendanceService = require('../services/attendanceService.cjs')

/**
 * @param {import('electron').IpcMain} ipcMain
 * @param {import('electron-store')} store
 */
module.exports = function registerAttendanceIpc(ipcMain, store) {
  ipcMain.handle('attendance:getLogs', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'read' })
    const limit = Math.min(Number(auth.clean.limit ?? 200), 2000)
    return auth.knex('attendance_logs')
      .select('*')
      .orderBy('punch_time', 'desc')
      .limit(limit)
  })

  ipcMain.handle('attendance:getDaily', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'read' })
    const date =
      auth.clean.date ||
      attendanceService.localDateKey(new Date())
    const rows = await attendanceService.fetchDailyTable(auth.knex, date, {
      search: auth.clean.search,
    })
    return { date, timezone: attendanceService.ORG_TZ, rows }
  })

  ipcMain.handle('attendance:sync', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'write' })
    const devices = store.get('zkteco_devices', DEFAULT_DEVICES)
    const active = devices.filter((d) => d.enabled)
    const syncOptions = {
      fromDate: auth.clean.fromDate,
      toDate: auth.clean.toDate,
    }
    const results = []
    for (const d of active) {
      // eslint-disable-next-line no-await-in-loop
      results.push(await pullFromDevice(d, store, syncOptions))
    }
    const linked = await attendanceService.linkAttendanceEmployeeIds(auth.knex)
    const totals = results.reduce(
      (acc, r) => {
        if (!r.success) return acc
        acc.fetchedFromDevice += Number(r.fetchedFromDevice ?? r.count ?? 0)
        acc.inPeriod += Number(r.inPeriod ?? r.count ?? 0)
        acc.savedToDatabase += Number(r.savedToDatabase ?? r.count ?? 0)
        return acc
      },
      { fetchedFromDevice: 0, inPeriod: 0, savedToDatabase: 0 },
    )
    return {
      results,
      linked,
      period:
        syncOptions.fromDate && syncOptions.toDate
          ? { fromDate: syncOptions.fromDate, toDate: syncOptions.toDate }
          : null,
      totals,
    }
  })

  ipcMain.handle('attendance:override', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'write' })
    if (!auth.clean.id) throw new Error('id required')
    await auth.knex('attendance_logs').where({ id: auth.clean.id }).update({
      is_manual_override: true,
      override_reason: auth.clean.override_reason ?? '',
      updated_at: new Date(),
    })
    return { ok: true }
  })

  ipcMain.handle('attendance:deviceStatus', async (_e, payload) => {
    await authorize(store, payload, { module: 'employee_data', level: 'read' })
    const devices = store.get('zkteco_devices', DEFAULT_DEVICES)
    const last = getLastPollResults()
    return devices.map((d) => {
      const hit = last.find((r) => r.device === d.name || r.ip === d.ip)
      let status = 'unknown'
      if (hit) status = hit.success ? 'online' : 'offline'
      return {
        id: d.id,
        name: d.name,
        ip: d.ip,
        port: d.port,
        enabled: d.enabled,
        status,
        lastMessage: hit?.error ?? null,
        lastCount: hit?.count ?? null,
      }
    })
  })
}
