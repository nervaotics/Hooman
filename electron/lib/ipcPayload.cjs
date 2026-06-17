function stripToken(payload) {
  if (!payload || typeof payload !== 'object') return { clean: {}, token: null }
  const { __token, ...rest } = payload
  return { clean: rest, token: __token ?? null }
}

module.exports = { stripToken }
