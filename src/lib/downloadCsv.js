export function downloadCsvFile(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename || 'export.csv'
  anchor.click()
  URL.revokeObjectURL(url)
}
