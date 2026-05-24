'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

const iconButtonVariants = cva(
  [
    'inline-flex items-center justify-center',
    'transition-colors duration-150',
    'rounded-full',
    'disabled:opacity-50 disabled:pointer-events-none',
    'tap-target',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-primary-500 text-white hover:bg-primary-400 shadow-glow',
        ghost:   'bg-transparent text-ink-900 hover:bg-surface-sunken',
        raised:  'bg-surface-base text-ink-900 shadow-pop hover:bg-surface-raised',
      },
      size: {
        sm: 'h-9 w-9',
        md: 'h-11 w-11',
        lg: 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'ghost',
      size: 'md',
    },
  }
)

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  /** Обязательный label для screen readers — IconButton без текста. */
  'aria-label': string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </button>
  )
)
IconButton.displayName = 'IconButton'
