import clsx from 'clsx'

const MESH_VARIANTS = {
  blue: 'from-accent/20 via-accent/5 to-transparent',
  green: 'from-success/20 via-success/5 to-transparent',
  amber: 'from-warning/20 via-warning/5 to-transparent',
  violet: 'from-violet-500/20 via-violet-500/5 to-transparent',
}

export default function MeshChartCard({ title, subtitle, icon: Icon, variant = 'blue', children, className }) {
  const mesh = MESH_VARIANTS[variant] || MESH_VARIANTS.blue

  return (
    <section
      className={clsx(
        'relative overflow-hidden rounded-xl border border-border bg-card p-5',
        className,
      )}
    >
      <div
        className={clsx(
          'pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-gradient-to-br opacity-60 blur-2xl',
          mesh,
        )}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
        aria-hidden
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              {Icon ? <Icon className="h-4 w-4 text-muted" /> : null}
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            </div>
            {subtitle ? <p className="mt-1 text-xs text-muted">{subtitle}</p> : null}
          </div>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </section>
  )
}
