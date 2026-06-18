const PERMISSION_MODULES = ['employee_data', 'payroll_processing', 'accounting']

const ACCESS_LEVELS = ['none', 'read', 'write']

function normalizePermissions(raw) {
  const base = {
    employee_data: 'none',
    payroll_processing: 'none',
    accounting: 'none',
  }
  if (!raw) return base

  let parsed = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      return base
    }
  }
  if (typeof parsed !== 'object' || parsed === null) return base

  for (const mod of PERMISSION_MODULES) {
    const level = String(parsed[mod] ?? 'none').toLowerCase()
    base[mod] = ACCESS_LEVELS.includes(level) ? level : 'none'
  }
  return base
}

function isSuperAdmin(user) {
  return user?.role === 'super_admin'
}

/** Legacy hr_staff keeps full module access (not settings / user admin). */
function isLegacyFullAccess(user) {
  return user?.role === 'hr_staff'
}

function canAccess(user, module, level = 'read') {
  if (!user) return false
  if (isSuperAdmin(user)) return true
  if (isLegacyFullAccess(user)) return true
  if (!PERMISSION_MODULES.includes(module)) return false

  const perm = normalizePermissions(user.permissions)[module]
  if (level === 'read') return perm === 'read' || perm === 'write'
  if (level === 'write') return perm === 'write'
  return false
}

function validatePermissionsInput(input) {
  const normalized = normalizePermissions(input)
  for (const mod of PERMISSION_MODULES) {
    if (!ACCESS_LEVELS.includes(normalized[mod])) {
      const err = new Error(`Invalid permission for ${mod}`)
      err.code = 'INVALID_PERMISSIONS'
      throw err
    }
  }
  return normalized
}

function permissionsForClient(user) {
  if (isSuperAdmin(user)) {
    return { employee_data: 'write', payroll_processing: 'write', accounting: 'write' }
  }
  if (isLegacyFullAccess(user)) {
    return { employee_data: 'write', payroll_processing: 'write', accounting: 'write' }
  }
  return normalizePermissions(user.permissions)
}

module.exports = {
  PERMISSION_MODULES,
  ACCESS_LEVELS,
  normalizePermissions,
  validatePermissionsInput,
  isSuperAdmin,
  isLegacyFullAccess,
  canAccess,
  permissionsForClient,
}
