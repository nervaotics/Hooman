import { ChevronDown, ChevronUp } from 'lucide-react'

export default function FormSection({
  title,
  icon: Icon,
  required,
  expanded,
  onToggle,
  children,
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/5"
      >
        <div className="flex items-center gap-2 font-semibold text-foreground">
          {Icon ? <Icon className="h-4 w-4 text-accent" /> : null}
          <span>
            {title}
            {required ? <span className="text-danger"> *</span> : null}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted" />
        )}
      </button>
      {expanded ? <div className="space-y-4 border-t border-border p-4">{children}</div> : null}
    </section>
  )
}

export function Field({ label, error, required, children, htmlFor }) {
  return (
    <label className="grid gap-1 text-sm" htmlFor={htmlFor}>
      <span className="text-muted">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </span>
      {children}
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  )
}
