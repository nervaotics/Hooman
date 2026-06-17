/** True when running inside the Hooman Electron shell (preload exposed). */
export function isElectron() {
  return typeof window !== 'undefined' && Boolean(window.electron)
}

export function requireElectron() {
  if (!isElectron()) {
    throw new Error(
      'Hooman must run in the desktop app. Close the browser tab and use the window opened by npm run dev.',
    )
  }
  return window.electron
}

/**
 * Call a preload API method with a clear error if the desktop shell is stale.
 * @param {string} method
 * @param {...unknown} args
 */
export function callElectron(method, ...args) {
  const api = requireElectron()
  const fn = api[method]
  if (typeof fn !== 'function') {
    throw new Error(
      `Desktop API "${method}" is missing. Fully quit the Hooman/Electron window (not just refresh), stop npm run dev, then start it again.`,
    )
  }
  return fn(...args)
}
