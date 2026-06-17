const jwt = require('jsonwebtoken')

function getSecret() {
  return process.env.JWT_SECRET || 'dev-only-change-JWT_SECRET-in-production'
}

function signPayload(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: '7d' })
}

function verifyToken(token) {
  if (!token) return null
  try {
    return jwt.verify(token, getSecret())
  } catch {
    return null
  }
}

module.exports = { signPayload, verifyToken }
