const DEFAULT_FALLBACK = 'Something went wrong. Please try again.'

const BY_CODE = {
  UNAUTHORIZED: 'Your session has expired. Please sign in again.',
  FORBIDDEN: "You don't have permission to do that.",
}

const BY_PHRASE = [
  [/invalid credentials/i, 'Wrong username or password.'],
  [/wrong username or password/i, 'Wrong username or password.'],
  [/username and password required/i, 'Please enter your username and password.'],
  [/database is not configured/i, 'Database is not set up yet. Complete database setup first.'],
  [/econnrefused|connect econnrefused/i, 'Cannot connect to the database. Make sure MySQL is running.'],
  [/access denied for user/i, 'Database username or password is incorrect.'],
  [/unknown database/i, 'That database does not exist. Check the database name.'],
  [/enotfound|getaddrinfo/i, 'Cannot find the server. Check the host name or IP address.'],
  [/etimedout|timed out/i, 'The connection timed out. Check your network and firewall.'],
  [/you do not have permission/i, "You don't have permission to do that."],
  [/unauthorized/i, 'Your session has expired. Please sign in again.'],
  [/migration directory is corrupt/i, 'Install the latest Hooman version and try again.'],
  [/migration table is already locked/i, 'Database setup is busy. Close other Hooman windows and try again.'],
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
  if (/\b(cache-control|content-type|x-github|releases\.atom)/i.test(msg)) return true
  if (/\b(ENOENT|EACCES|ECONNRESET|ER_[A-Z_]+)\b/.test(msg)) return true
  if (/\bat\s+[\w.]+\s*\(/i.test(msg)) return true
  if (/\b(404|401|403|500)\b/.test(msg) && /github|firebase|api-key|releases\.atom/i.test(msg)) {
    return true
  }
  return false
}

/**
 * @param {unknown} err
 * @param {string} [fallback]
 */
export function formatUserError(err, fallback = DEFAULT_FALLBACK) {
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

  for (const [pattern, friendly] of BY_PHRASE) {
    if (pattern.test(message)) return friendly
  }

  if (!looksTechnical(message)) return message

  return fallback
}
