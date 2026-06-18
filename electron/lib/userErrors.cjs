const DEFAULT_FALLBACK = 'Something went wrong. Please try again.'

const BY_CODE = {
  UNAUTHORIZED: 'Your session has expired. Please sign in again.',
  FORBIDDEN: "You don't have permission to do that.",
  ECONNREFUSED:
    'Cannot connect to the database. Make sure MySQL is running and the host and port are correct.',
  ER_ACCESS_DENIED_ERROR: 'Database username or password is incorrect.',
  ER_BAD_DB_ERROR: 'That database does not exist. Check the database name.',
  ENOTFOUND: 'Cannot find the server. Check the host name or IP address.',
  ETIMEDOUT: 'The connection timed out. Check your network and firewall.',
  EHOSTUNREACH: 'Cannot reach the server on the network.',
  PROTOCOL_CONNECTION_LOST: 'The database connection was lost. Try again in a moment.',
}

/** [pattern, friendly message] — first match wins */
const BY_PHRASE = [
  [/invalid credentials/i, 'Wrong username or password.'],
  [/username and password required/i, 'Please enter your username and password.'],
  [/password must be at least 8/i, 'Password must be at least 8 characters.'],
  [/database is not configured/i, 'Database is not set up yet. Complete database setup first.'],
  [/incomplete database configuration/i, 'Please fill in host, database, and username.'],
  [/host, database, and user are required/i, 'Please fill in host, database, and username.'],
  [/an administrator account already exists/i, 'An administrator account already exists. Sign in instead.'],
  [/employee not found/i, 'That employee could not be found.'],
  [/user not found/i, 'That user could not be found.'],
  [/payroll period not found/i, 'That payroll period could not be found.'],
  [/period not found/i, 'That payroll period could not be found.'],
  [/you cannot deactivate your own/i, 'You cannot deactivate your own account.'],
  [/cannot deactivate the only super administrator/i, 'At least one super administrator must remain active.'],
  [/super administrator permissions cannot be edited/i, 'Super administrator access cannot be changed here.'],
  [/super administrator access required/i, 'Only a super administrator can do that.'],
  [/cannot delete — department is assigned/i, 'This department is used by employees and cannot be deleted.'],
  [/cannot delete — site is assigned/i, 'This site is used by employees and cannot be deleted.'],
  [/server ip is required/i, 'Please enter the server IP address.'],
  [/migration table is already locked/i, 'Database setup is busy. Close other Hooman windows and try again.'],
  [/migration directory is corrupt/i, 'This app is missing database update files. Install the latest Hooman version.'],
  [/wrong username or password/i, 'Wrong username or password.'],
  [/you do not have permission/i, "You don't have permission to do that."],
  [/unauthorized/i, 'Your session has expired. Please sign in again.'],
  [/name is required/i, 'Please enter a name.'],
]

function stripIpcWrapper(message) {
  return String(message || '')
    .replace(/^Error invoking remote method '[^']+':\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .trim()
}

function looksTechnical(message) {
  const msg = String(message || '')
  if (!msg) return false
  if (msg.length > 240) return true
  if (/\n/.test(msg)) return true
  if (/Error invoking remote method/i.test(msg)) return true
  if (/\bHeaders:\s*\{/i.test(msg)) return true
  if (/\b(cache-control|content-type|x-github)/i.test(msg)) return true
  if (/\b(ENOENT|EACCES|ECONNRESET|ER_[A-Z_]+)\b/.test(msg)) return true
  if (/\bat\s+[\w.]+\s*\(/i.test(msg)) return true
  if (/\b(404|401|403|500)\b/.test(msg) && /github|firebase|api-key|releases\.atom/i.test(msg)) {
    return true
  }
  return false
}

function matchPhrase(message) {
  for (const [pattern, friendly] of BY_PHRASE) {
    if (pattern.test(message)) return friendly
  }
  return null
}

function matchInfrastructure(message) {
  const lower = message.toLowerCase()
  if (lower.includes('econnrefused') || lower.includes('connect econnrefused')) {
    return BY_CODE.ECONNREFUSED
  }
  if (lower.includes('access denied for user')) return BY_CODE.ER_ACCESS_DENIED_ERROR
  if (lower.includes('unknown database')) return BY_CODE.ER_BAD_DB_ERROR
  if (lower.includes('enotfound') || lower.includes('getaddrinfo')) return BY_CODE.ENOTFOUND
  if (lower.includes('etimedout') || lower.includes('timed out')) return BY_CODE.ETIMEDOUT
  if (lower.includes('ehostunreach')) return BY_CODE.EHOSTUNREACH
  return null
}

/**
 * Turn backend/IPC errors into short, human-readable text.
 * @param {unknown} err
 * @param {string} [fallback]
 */
function toUserMessage(err, fallback = DEFAULT_FALLBACK) {
  if (!err) return fallback

  const code = typeof err === 'object' && err !== null ? err.code : undefined
  if (code && BY_CODE[code]) return BY_CODE[code]

  const raw =
    typeof err === 'string'
      ? err
      : typeof err === 'object' && err !== null && 'message' in err
        ? String(err.message || '')
        : String(err)

  const message = stripIpcWrapper(raw)
  if (!message) return fallback

  const fromPhrase = matchPhrase(message)
  if (fromPhrase) return fromPhrase

  if (!looksTechnical(message)) return message

  const fromInfra = matchInfrastructure(message)
  if (fromInfra) return fromInfra

  if (code && BY_CODE[code]) return BY_CODE[code]

  return fallback
}

module.exports = {
  DEFAULT_FALLBACK,
  toUserMessage,
  stripIpcWrapper,
}
