import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CountdownTimer } from '@/components/ui/countdown-timer'

describe('CountdownTimer', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('показывает оставшиеся секунды', () => {
    const deadline = new Date(Date.now() + 60_000).toISOString()
    render(<CountdownTimer deadline={deadline} />)
    expect(screen.getByText(/^\d+$/)).toBeInTheDocument()
  })

  it('вызывает onExpire когда время вышло', () => {
    const onExpire = vi.fn()
    const deadline = new Date(Date.now() + 1000).toISOString()
    render(<CountdownTimer deadline={deadline} onExpire={onExpire} />)
    vi.advanceTimersByTime(2000)
    expect(onExpire).toHaveBeenCalled()
  })
})
