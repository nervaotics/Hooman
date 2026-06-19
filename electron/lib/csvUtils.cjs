function escapeCsvCell(value) {
  const s = value == null ? '' : String(value)
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/**
 * @param {string[]} headers
 * @param {Record<string, unknown>[]} rows
 */
function rowsToCsv(headers, rows) {
  const lines = [headers.map(escapeCsvCell).join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvCell(row[h] ?? '')).join(','))
  }
  return `\uFEFF${lines.join('\r\n')}`
}

module.exports = { rowsToCsv, escapeCsvCell }
