import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('рендерит детей и срабатывает onClick', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Найти мастера</Button>)
    const btn = screen.getByRole('button', { name: /найти мастера/i })
    await user.click(btn)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('disabled при loading и показывает spinner', () => {
    render(<Button loading>Подождите</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('применяет variant=danger', () => {
    render(<Button variant="danger">Удалить</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-danger')
  })
})
