const crypto = require('crypto')
const { safeStorage, app } = require('electron')

const FALLBACK_SALT = 'hooman-supabase-secrets-v1'

function encryptionAvailable() {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

function fallbackKey() {
  const os = require('os')
  const seed = [
    app.getPath('userData'),
    os.hostname(),
    os.userInfo().username,
    FALLBACK_SALT,
  ].join('|')
  return crypto.createHash('sha256').update(seed).digest()
}

function encryptWithFallback(plain) {
  const key = fallbackKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([Buffer.from([0]), iv, tag, enc]).toString('base64')
}

function decryptWithFallback(encoded) {
  const buf = Buffer.from(encoded, 'base64')
  if (buf[0] !== 0) throw new Error('Unsupported secret format')
  const iv = buf.subarray(1, 13)
  const tag = buf.subarray(13, 29)
  const data = buf.subarray(29)
  const key = fallbackKey()
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

/**
 * Encrypt a string for local storage (Windows DPAPI when available).
 * @param {string} plain
 */
function encryptSecret(plain) {
  const text = String(plain ?? '')
  if (!text) return ''
  if (encryptionAvailable()) {
    const enc = safeStorage.encryptString(text)
    return Buffer.concat([Buffer.from([1]), enc]).toString('base64')
  }
  return encryptWithFallback(text)
}

/**
 * @param {string} encoded
 */
function decryptSecret(encoded) {
  const raw = String(encoded || '')
  if (!raw) return ''
  const buf = Buffer.from(raw, 'base64')
  if (buf[0] === 1) {
    if (!encryptionAvailable()) {
      throw new Error('Secrets were encrypted with Windows secure storage but it is unavailable.')
    }
    return safeStorage.decryptString(buf.subarray(1))
  }
  if (buf[0] === 0) return decryptWithFallback(raw)
  throw new Error('Unrecognized secret encoding')
}

/**
 * @param {{ dbPassword?: string, anonKey?: string, serviceRoleKey?: string }} secrets
 */
function encryptSecretsObject(secrets) {
  return encryptSecret(
    JSON.stringify({
      dbPassword: secrets.dbPassword || '',
      anonKey: secrets.anonKey || '',
      serviceRoleKey: secrets.serviceRoleKey || '',
    }),
  )
}

/**
 * @param {string} encoded
 */
function decryptSecretsObject(encoded) {
  if (!encoded) {
    return { dbPassword: '', anonKey: '', serviceRoleKey: '' }
  }
  try {
    const parsed = JSON.parse(decryptSecret(encoded))
    return {
      dbPassword: String(parsed.dbPassword || ''),
      anonKey: String(parsed.anonKey || ''),
      serviceRoleKey: String(parsed.serviceRoleKey || ''),
    }
  } catch (err) {
    const wrap = new Error('Could not read saved Supabase credentials. Re-enter them in Settings.')
    wrap.cause = err
    throw wrap
  }
}

module.exports = {
  encryptionAvailable,
  encryptSecret,
  decryptSecret,
  encryptSecretsObject,
  decryptSecretsObject,
}
