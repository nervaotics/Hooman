const { toUserMessage } = require('./userErrors.cjs')

/**
 * Wrap ipcMain.handle so every thrown error is user-friendly in the renderer.
 * @param {import('electron').IpcMain} ipcMain
 */
function wrapIpcMain(ipcMain) {
  const original = ipcMain.handle.bind(ipcMain)
  ipcMain.handle = (channel, handler) =>
    original(channel, async (...args) => {
      try {
        return await handler(...args)
      } catch (err) {
        const friendly = toUserMessage(err)
        const wrapped = new Error(friendly)
        if (err && typeof err === 'object' && err.code) wrapped.code = err.code
        throw wrapped
      }
    })
}

module.exports = { wrapIpcMain }
