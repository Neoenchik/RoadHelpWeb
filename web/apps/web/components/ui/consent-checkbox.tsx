'use client'

import Link from 'next/link'
import { forwardRef, type InputHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

export interface ConsentCheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: string
}

export const ConsentCheckbox = forwardRef<HTMLInputElement, ConsentCheckboxProps>(
  ({ className, error, id = 'privacy-consent', ...props }, ref) => {
    return (
      <div className="space-y-2">
        <label
          htmlFor={id}
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors',
            error
              ? 'border-danger bg-danger/5'
              : 'border-primary-200 bg-primary-50/60 hover:border-primary-400',
            className,
          )}
        >
          <input
            ref={ref}
            id={id}
            type="checkbox"
            className="mt-1 h-5 w-5 shrink-0 rounded border-ink-400 accent-primary-500"
            {...props}
          />
          <span className="text-body leading-snug text-ink-800">
            Я даю согласие на{' '}
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary-600 underline underline-offset-2 hover:text-primary-700"
              onClick={(e) => e.stopPropagation()}
            >
              обработку персональных данных
            </Link>{' '}
            и ознакомился(ась) с{' '}
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary-600 underline underline-offset-2 hover:text-primary-700"
              onClick={(e) => e.stopPropagation()}
            >
              политикой конфиденциальности
            </Link>{' '}
            Road Help
          </span>
        </label>
        {error && <p className="text-caption font-medium text-danger">{error}</p>}
        <p className="text-center text-caption text-ink-500">
          Полный текст:{' '}
          <Link href="/privacy" target="_blank" className="text-primary-600 underline">
            политика конфиденциальности
          </Link>
        </p>
      </div>
    )
  },
)

ConsentCheckbox.displayName = 'ConsentCheckbox'
