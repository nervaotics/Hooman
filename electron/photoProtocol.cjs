const { protocol, net } = require('electron')
const path = require('path')
const { pathToFileURL } = require('url')

const SCHEME = 'hooman'

function getPhotoDir() {
  const { app } = require('electron')
  return path.join(app.getPath('userData'), 'employee-photos')
}

function registerPhotoScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        bypassCSP: true,
      },
    },
  ])
}

function registerPhotoProtocol() {
  protocol.handle(SCHEME, async (request) => {
    try {
      const url = new URL(request.url)
      if (url.hostname !== 'employee-photo') {
        return new Response('Not found', { status: 404 })
      }
      const fileName = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
      if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
        return new Response('Forbidden', { status: 403 })
      }
      const filePath = path.join(getPhotoDir(), fileName)
      return net.fetch(pathToFileURL(filePath).toString())
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}

/**
 * Convert stored photo_url to a renderer-safe URL (custom protocol).
 * @param {string | null | undefined} photoUrl
 */
function normalizePhotoUrl(photoUrl) {
  if (!photoUrl) return null
  const raw = String(photoUrl).trim()
  if (!raw) return null
  if (raw.startsWith(`${SCHEME}://`)) return raw
  if (raw.startsWith('data:image/')) return raw

  const fileName = path.basename(raw.replace(/^file:\/\//i, '').replace(/\\/g, '/'))
  if (!fileName) return null
  return `${SCHEME}://employee-photo/${encodeURIComponent(fileName)}`
}

function photoUrlFromFileName(fileName) {
  return `${SCHEME}://employee-photo/${encodeURIComponent(fileName)}`
}

module.exports = {
  registerPhotoScheme,
  registerPhotoProtocol,
  normalizePhotoUrl,
  photoUrlFromFileName,
  getPhotoDir,
}
