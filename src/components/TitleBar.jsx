/** Windows draggable strip — pairs with Electron titleBarOverlay. */
export default function TitleBar() {
  return (
    <div
      className="flex h-9 shrink-0 items-center border-b border-border bg-sidebar px-4"
      style={{ WebkitAppRegion: 'drag' }}
    >
      <span className="text-xs font-semibold tracking-tight text-muted">Hooman</span>
    </div>
  )
}
