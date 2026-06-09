import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/auth'

describe('api client — Bearer injection', () => {
  afterEach(() => {
    useAuthStore.getState().clear()
  })

  it('подставляет access-токен в Authorization', async () => {
    useAuthStore.getState().setSession('test-token', {
      id: 'u1', phone: '+79990000000', email: null,
      first_name: 'Иван', last_name: null, avatar_url: null, role: 'USER',
    })
    const config = await api.interceptors.request.handlers[0]!.fulfilled({
      headers: { set: vi.fn() } as any,
    } as any)
    expect((config!.headers as any).set).toHaveBeenCalledWith(
      'Authorization', 'Bearer test-token'
    )
  })
})
