function punchKeyVariants(code) {
  const s = String(code ?? '').trim()
  if (!s) return []
  const keys = new Set([s])
  if (/^\d+$/.test(s)) {
    keys.add(String(parseInt(s, 10)))
    keys.add(s.padStart(5, '0'))
    keys.add(s.padStart(8, '0'))
  }
  return [...keys]
}

function resolveDeviceUserId(log) {
  const candidates = [log?.id, log?.uid, log?.userId, log?.deviceUserId]
  for (const value of candidates) {
    if (value == null || value === '' || value === 0) continue
    const s = String(value).trim()
    if (s) return s
  }
  return ''
}

function buildPunchMapFromRows(rows) {
  const map = new Map()
  for (const row of rows) {
    for (const key of punchKeyVariants(row.punch_code)) {
      map.set(key, row.id)
    }
    for (const key of punchKeyVariants(row.employee_code)) {
      map.set(key, row.id)
    }
  }
  return map
}

function lookupEmployeeId(punchMap, deviceUserId) {
  const id = String(deviceUserId ?? '').trim()
  if (!id) return null
  if (punchMap.has(id)) return punchMap.get(id)
  for (const key of punchKeyVariants(id)) {
    if (punchMap.has(key)) return punchMap.get(key)
  }
  return null
}

module.exports = {
  punchKeyVariants,
  resolveDeviceUserId,
  buildPunchMapFromRows,
  lookupEmployeeId,
}
