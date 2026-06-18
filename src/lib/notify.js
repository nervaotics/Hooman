import { toast } from 'sonner'
import { formatUserError } from '@/lib/userMessage.js'

export function toastError(err, fallback) {
  toast.error(formatUserError(err, fallback))
}

export function toastSuccess(message) {
  toast.success(message)
}
