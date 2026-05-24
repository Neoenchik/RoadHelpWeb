import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { OtpInput } from '@/components/ui/otp-input'

describe('OtpInput', () => {
  it('переходит к следующей ячейке при вводе цифры', async () => {
    const user = userEvent.setup()
    render(<OtpInput length={4} />)
    const cells = screen.getAllByRole('textbox')
    await user.type(cells[0], '1')
    expect(cells[0]).toHaveValue('1')
    expect(cells[1]).toHaveFocus()
  })

  it('paste 4 цифр распределяет их по ячейкам и вызывает onComplete', async () => {
    const onComplete = vi.fn()
    const user = userEvent.setup()
    render(<OtpInput length={4} onComplete={onComplete} />)
    const first = screen.getAllByRole('textbox')[0]
    first.focus()
    await user.paste('1234')
    expect(onComplete).toHaveBeenCalledWith('1234')
  })

  it('игнорирует не-цифры', async () => {
    const user = userEvent.setup()
    render(<OtpInput length={4} />)
    const first = screen.getAllByRole('textbox')[0]
    await user.type(first, 'a')
    expect(first).toHaveValue('')
  })

  it('Backspace на пустой ячейке возвращает фокус назад', async () => {
    const user = userEvent.setup()
    render(<OtpInput length={4} />)
    const cells = screen.getAllByRole('textbox')
    await user.type(cells[0], '1')
    expect(cells[1]).toHaveFocus()
    await user.keyboard('{Backspace}')
    expect(cells[0]).toHaveFocus()
  })
})
