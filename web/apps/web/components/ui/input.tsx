'use client'

import { forwardRef, type InputHTMLAttributes, type ReactNode, useId } from 'react'

import { cn } from '@/lib/utils'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string
  hint?: string
  error?: string
  prefix?: ReactNode
  suffix?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, prefix, suffix, className, id: idProp, ...props }, ref) => {
    const generated = useId()
    const id = idProp ?? generated
    const describedById = hint || error ? `${id}-msg` : undefined

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-caption text-ink-700">
            {label}
          </label>
        )}
        <div
          className={cn(
            'flex h-12 items-center gap-2 rounded-xl border bg-surface-base px-3',
            'transition-colors duration-150',
            error
              ? 'border-danger focus-within:ring-2 focus-within:ring-danger/20'
              : 'border-ink-300 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100',
            className
          )}
        >
          {prefix && <span className="shrink-0 text-ink-500">{prefix}</span>}
          <input
            ref={ref}
            id={id}
            aria-invalid={!!error}
            aria-describedby={describedById}
            className="h-full flex-1 bg-transparent text-body text-ink-900 placeholder:text-ink-500 outline-none"
            {...props}
          />
          {suffix && <span className="shrink-0 text-ink-500">{suffix}</span>}
        </div>
        {(hint || error) && (
          <p
            id={describedById}
            className={cn(
              'text-micro',
              error ? 'text-danger' : 'text-ink-500'
            )}
          >
            {error ?? hint}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'
