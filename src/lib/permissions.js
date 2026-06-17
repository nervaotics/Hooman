export const MODULE_LABELS = {
  employee_data: 'Employee data',
  payroll_processing: 'Payroll processing',
}

export const ACCESS_LABELS = {
  none: 'No access',
  read: 'Read only',
  write: 'Read & write',
}

export function canRead(user, module) {
  if (!user) return false
  if (user.isSuperAdmin) return true
  const level = user.permissions?.[module] ?? 'none'
  return level === 'read' || level === 'write'
}

export function canWrite(user, module) {
  if (!user) return false
  if (user.isSuperAdmin) return true
  return user.permissions?.[module] === 'write'
}

export function isSuperAdmin(user) {
  return Boolean(user?.isSuperAdmin || user?.role === 'super_admin')
}

export const defaultPermissions = () => ({
  employee_data: 'none',
  payroll_processing: 'none',
})
