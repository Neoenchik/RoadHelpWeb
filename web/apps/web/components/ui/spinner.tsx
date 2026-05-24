import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface SpinnerProps {
  className?: string
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 16,
  md: 24,
  lg: 32,
} as const

export function Spinner({ className, label, size = 'md' }: SpinnerProps) {
  const px = sizeMap[size]
  return (
    <div role="status" aria-live="polite" className={cn('inline-flex items-center gap-2 text-ink-500', className)}>
      <Loader2 size={px} strokeWidth={1.75} className="animate-spin" />
      {label && <span className="text-caption">{label}</span>}
      {!label && <span className="sr-only">Загрузка</span>}
    </div>
  )
}
