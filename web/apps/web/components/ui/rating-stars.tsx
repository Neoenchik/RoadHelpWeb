'use client'

import { Star } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'

export interface RatingStarsProps {
  value?: number
  onChange?: (value: number) => void
  readonly?: boolean
  size?: number
  ariaLabel?: string
}

export function RatingStars({
  value = 0,
  onChange,
  readonly,
  size = 32,
  ariaLabel = 'Оценка',
}: RatingStarsProps) {
  const [hover, setHover] = useState(0)
  const display = hover || value

  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} из 5`}
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={cn(
            'p-1 rounded-md transition-transform',
            !readonly && 'hover:scale-110 active:scale-95',
            readonly && 'cursor-default',
          )}
        >
          <Star
            size={size}
            strokeWidth={1.75}
            className={cn(
              'transition-colors',
              star <= display ? 'fill-accent-500 text-accent-500' : 'text-ink-300',
            )}
          />
        </button>
      ))}
    </div>
  )
}
