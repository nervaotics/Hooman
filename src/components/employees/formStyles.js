import { cn } from '@/lib/utils.js'

export const inputClass = (hasError) =>
  cn(
    'rounded-md border bg-sidebar px-3 py-2 text-foreground outline-none focus:border-accent',
    hasError ? 'border-danger' : 'border-border',
  )

export const selectClass = (hasError) => inputClass(hasError)
