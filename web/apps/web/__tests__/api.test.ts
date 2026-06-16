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
    const handlers = api.interceptors.request.handlers ?? []
    expect(handlers.length).toBeGreaterThan(0)
    const fulfilled = handlers[0]!.fulfilled!
    const config = await fulfilled({
      headers: { set: vi.fn() } as any,
    } as any)
    expect((config!.headers as any).set).toHaveBeenCalledWith(
      'Authorization', 'Bearer test-token'
    )
  })
})
