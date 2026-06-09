'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/auth'

export function InviteInner() {
  const params = useSearchParams()
  const token = params.get('token') ?? ''
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)
  const hydrated = useAuthStore((s) => s.hydrated)
  const setSession = useAuthStore((s) => s.setSession)
  const [status, setStatus] = useState<'loading' | 'need-login' | 'error'>('loading')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }
    if (!hydrated) return

    if (!accessToken) {
      setStatus('need-login')
      router.replace(`/auth/login?next=${encodeURIComponent(`/auth/invite?token=${token}`)}`)
      return
    }

    async function redeem() {
      try {
        const r = await api.post('/api/auth/redeem-invite', { token })
        setSession(r.data.access_token, r.data.user)
        const role = r.data.user?.role
        toast.success('Приглашение принято')
        if (role === 'ADMIN') router.replace('/admin')
        else if (role === 'OPERATOR') router.replace('/operator')
        else router.replace('/app')
      } catch (err: any) {
        setStatus('error')
        toast.error(err?.response?.data?.detail ?? err?.response?.data ?? 'Не удалось активировать приглашение')
      }
    }

    void redeem()
  }, [token, accessToken, hydrated, router, setSession])

  if (status === 'error') {
    return (
      <Card className="mx-auto max-w-md space-y-4 p-6 text-center">
        <p className="text-body">Ссылка приглашения недействительна или уже использована.</p>
        <Button onClick={() => router.replace('/')}>На главную</Button>
      </Card>
    )
  }

  return (
    <Card className="mx-auto max-w-md space-y-4 p-8 text-center">
      <Spinner size="lg" label="Активируем приглашение…" />
    </Card>
  )
}
