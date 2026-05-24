'use client'

import {
  type ClipboardEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { cn } from '@/lib/utils'

export interface OtpInputProps {
  length?: number
  value?: string
  onChange?: (value: string) => void
  onComplete?: (value: string) => void
  error?: boolean
  autoFocus?: boolean
  disabled?: boolean
  'aria-label'?: string
}

export function OtpInput({
  length = 4,
  value,
  onChange,
  onComplete,
  error,
  autoFocus = true,
  disabled,
  'aria-label': ariaLabel = 'Код из СМС',
}: OtpInputProps) {
  const isControlled = value !== undefined
  const [internal, setInternal] = useState('')
  const current = isControlled ? value! : internal

  const refs = useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from({ length }, (_, i) => current[i] ?? '')

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus()
  }, [autoFocus])

  const setValue = useCallback(
    (next: string) => {
      const trimmed = next.slice(0, length)
      if (!isControlled) setInternal(trimmed)
      onChange?.(trimmed)
      if (trimmed.length === length) onComplete?.(trimmed)
    },
    [isControlled, length, onChange, onComplete]
  )

  const handleInput = (i: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, '')
    if (!cleaned) return
    const next = (current.slice(0, i) + cleaned + current.slice(i + cleaned.length)).slice(0, length)
    setValue(next)
    const nextIndex = Math.min(i + cleaned.length, length - 1)
    refs.current[nextIndex]?.focus()
    refs.current[nextIndex]?.select()
  }

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (digits[i]) {
        const next = current.slice(0, i) + current.slice(i + 1)
        setValue(next)
      } else if (i > 0) {
        const next = current.slice(0, i - 1) + current.slice(i)
        setValue(next)
        refs.current[i - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus()
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      refs.current[i + 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (pasted) {
      setValue(pasted)
      const focusIndex = Math.min(pasted.length, length - 1)
      refs.current[focusIndex]?.focus()
    }
  }

  return (
    <div role="group" aria-label={ariaLabel} className="flex gap-3">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          aria-label={`Цифра ${i + 1}`}
          className={cn(
            'h-14 w-12 rounded-xl border bg-surface-base text-center text-h2 font-semibold',
            'tabular-nums text-ink-900',
            'transition-colors duration-150',
            error
              ? 'border-danger focus:ring-4 focus:ring-danger/20'
              : digit
                ? 'border-primary-500 bg-primary-50'
                : 'border-ink-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-100',
          )}
        />
      ))}
    </div>
  )
}
