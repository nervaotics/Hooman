/** Default ZKTeco readers — overridden by Settings (electron-store). */
const DEFAULT_DEVICES = [
  {
    id: 'dev-1',
    name: 'Device 1',
    ip: '192.168.0.21',
    port: 4370,
    subnet: '192.168.0.0',
    enabled: true,
  },
  {
    id: 'dev-2',
    name: 'Device 2',
    ip: '192.168.0.23',
    port: 4370,
    subnet: '192.168.0.0',
    enabled: true,
  },
  {
    id: 'dev-3',
    name: 'Device 3',
    ip: '192.168.0.25',
    port: 4370,
    subnet: '192.168.0.0',
    enabled: true,
  },
  {
    id: 'dev-4',
    name: 'Device 4',
    ip: '192.168.0.168',
    port: 4370,
    subnet: '192.168.0.0',
    enabled: true,
  },
]

const KNOWN_POOLS = [
  '192.168.0.0',
  '192.168.8.0',
  '192.168.15.0',
  '192.168.20.0',
]

module.exports = { DEFAULT_DEVICES, KNOWN_POOLS }
