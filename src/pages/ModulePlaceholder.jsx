export default function ModulePlaceholder({ title, description }) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="max-w-2xl text-sm text-muted">
        {description ||
          'This module is scaffolded. Wire forms and tables to the existing IPC handlers next.'}
      </p>
    </div>
  )
}
