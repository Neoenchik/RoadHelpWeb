'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

export interface CountdownTimerProps {
  /** ISO-строка дедлайна с сервера */
  deadline: string
  onExpire?: () => void
  size?: number
  className?: string
}

export function CountdownTimer({ deadline, onExpire, size = 120, className }: CountdownTimerProps) {
  const total = Math.max(1, Math.round((+new Date(deadline) - Date.now()) / 1000))
  const [seconds, setSeconds] = useState(total)

  useEffect(() => {
    const interval = setInterval(() => {
      const left = Math.max(0, Math.round((+new Date(deadline) - Date.now()) / 1000))
      setSeconds(left)
      if (left <= 0) {
        clearInterval(interval)
        onExpire?.()
      }
    }, 250)
    return () => clearInterval(interval)
  }, [deadline, onExpire])

  const r = size / 2 - 4
  const c = 2 * Math.PI * r
  const progress = Math.max(0, seconds / total)
  const offset = c - c * progress
  const danger = seconds <= 10

  return (
    <div className={cn('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={4}
          fill="transparent"
          className="text-ink-300"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={4}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={cn(
            'transition-[stroke-dashoffset] duration-200',
            danger ? 'text-danger' : 'text-primary-500',
          )}
        />
      </svg>
      <span
        className={cn(
          'absolute text-h2 font-bold tabular-nums',
          danger ? 'text-danger' : 'text-ink-900',
        )}
      >
        {seconds}
      </span>
    </div>
  )
}
