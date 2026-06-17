const { exec } = require('child_process')

function checkProxyBypass() {
  return new Promise((resolve) => {
    exec(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyOverride',
      (err, stdout) => {
        if (err) {
          resolve({ configured: false, raw: null })
          return
        }
        const output = String(stdout || '')
        const hasLocalBypass =
          output.includes('<local>') ||
          output.includes('192.168.*') ||
          output.includes('127.0.0.1') ||
          output.includes('localhost')
        resolve({ configured: hasLocalBypass, raw: output })
      },
    )
  })
}

module.exports = { checkProxyBypass }
