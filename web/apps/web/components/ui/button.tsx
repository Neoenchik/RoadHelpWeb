'use client'

import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
} from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'font-medium select-none whitespace-nowrap',
    'transition-[transform,opacity,background-color,box-shadow] duration-150',
    'disabled:opacity-50 disabled:pointer-events-none',
    'active:scale-[0.98]',
    'tap-target',
  ].join(' '),
  {
    variants: {
      variant: {
        primary:
          'bg-primary-500 text-white hover:bg-primary-400 active:bg-primary-600 shadow-glow',
        secondary:
          'bg-surface-raised text-ink-900 border border-ink-300 hover:bg-surface-sunken',
        ghost:
          'bg-transparent text-ink-900 hover:bg-surface-sunken',
        danger:
          'bg-danger text-white hover:opacity-90',
        link:
          'bg-transparent text-primary-500 hover:text-primary-600 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9  px-3 text-caption rounded-lg',
        md: 'h-11 px-4 text-body    rounded-lg',
        lg: 'h-12 px-5 text-body    rounded-xl',
        xl: 'h-14 px-6 text-body font-semibold rounded-xl',
      },
      block: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, asChild, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'

    if (asChild) {
      const childElement = Children.toArray(children).find((child) => isValidElement(child)) as ReactElement | undefined
      if (!childElement) return null

      const childWithContent = cloneElement(childElement, {
        children: (
          <>
            {loading && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />}
            {childElement.props.children}
          </>
        ),
      })

      return (
        <Comp
          ref={ref}
          className={cn(buttonVariants({ variant, size, block }), className)}
          disabled={disabled || loading}
          {...props}
        >
          {childWithContent}
        </Comp>
      )
    }

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, block }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />}
        {children}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { buttonVariants }
