import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { toastError } from '@/lib/notify.js'

export default function EmployeeBulkImport() {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  const downloadTemplate = async () => {
    try {
      const { csv } = await window.electron.getBulkImportTemplate()
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'hooman-employees-template.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toastError(e, 'Could not download the import template.')
    }
  }

  const handleFile = async (file) => {
    if (!file) return
    setBusy(true)
    setResult(null)
    try {
      const csv = await file.text()
      const res = await window.electron.bulkImportEmployees(csv)
      setResult(res)
      if (res.imported > 0) {
        toast.success(`Imported ${res.imported} employee${res.imported === 1 ? '' : 's'}`)
      }
      if (res.failed > 0 && res.imported === 0) {
        toast.error(`Import failed — ${res.failed} row${res.failed === 1 ? '' : 's'} rejected`)
      } else if (res.failed > 0) {
        toast.warning(`${res.failed} row${res.failed === 1 ? '' : 's'} skipped`)
      }
    } catch (e) {
      toastError(e, 'Import failed.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Bulk employee import</h2>
        <p className="mt-1 text-sm text-muted">
          Super administrator only. Upload a CSV to create many employees at once. Employee IDs
          are auto-generated; punch codes must match ZKTeco device user IDs.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 text-sm">
        <p className="text-muted">
          CSV columns (no header for employee_id — it is assigned automatically):
        </p>

        <div className="mt-3 rounded-md border border-border bg-sidebar/50 p-3 font-mono text-xs text-muted">
          punch_code,name,cnic,phone,area,department,salary
        </div>

        <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-muted">
          <li>CNIC: 61101-089160-3 or 12345-123456-1</li>
          <li>Phone: 0300-1234567 or 0334-7359797</li>
          <li>Salary: optional monthly gross (PKR), e.g. 45000 — used for payroll</li>
          <li>Area/site and department are created if they do not exist</li>
        </ul>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadTemplate}
            className="btn-secondary bg-sidebar"
          >
            <Download className="h-4 w-4" />
            Download template
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="btn-primary disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            {busy ? 'Importing…' : 'Choose CSV file'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        {result ? (
          <div className="mt-4 max-h-64 overflow-auto rounded-md border border-border bg-sidebar/30 p-3 text-xs">
            <p className="font-medium text-foreground">
              Imported: {result.imported} · Failed: {result.failed}
            </p>
            {result.rows?.length ? (
              <ul className="mt-2 space-y-1 text-muted">
                {result.rows.map((r) => (
                  <li key={`${r.line}-${r.employee_id}`}>
                    Row {r.line}: {r.employee_id} — {r.name} (punch {r.punch_code}
                    {r.salary != null ? `, PKR ${Number(r.salary).toLocaleString()}` : ''})
                  </li>
                ))}
              </ul>
            ) : null}
            {result.errors?.length ? (
              <ul className="mt-2 space-y-1 text-danger">
                {result.errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
