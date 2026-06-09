'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { OtpInput } from '@/components/ui/otp-input'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/auth'

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  )
}

function VerifyForm() {
  const router = useRouter()
  const params = useSearchParams()
  const phone = params.get('phone') ?? ''
  const next = params.get('next') ?? ''
  const setSession = useAuthStore((s) => s.setSession)

  const [code, setCode] = useState('')
  const [isResending, setIsResending] = useState(false)

  function extractErrorMessage(err: any): string {
    const data = err?.response?.data
    if (typeof data === 'string' && data.trim()) return data
    if (typeof data?.detail === 'string' && data.detail.trim()) return data.detail
    if (typeof data?.title === 'string' && data.title.trim()) return data.title
    if (typeof data?.message === 'string' && data.message.trim()) return data.message
    return 'Неверный код'
  }

  function parseJwtPayload(token: string): Record<string, any> | null {
    try {
      const part = token.split('.')[1]
      if (!part) return null
      const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
          .join('')
      )
      return JSON.parse(json)
    } catch {
      return null
    }
  }

  async function verifyByPurpose(value: string, purpose: 'login' | 'register', role: 'USER' | 'EXECUTOR') {
    return api.post('/api/auth/verify-otp', {
      phone,
      otp: value,
      purpose,
      role,
    })
  }

  async function verify(value: string, role: 'USER' | 'EXECUTOR' = 'USER') {
    try {
      const r = await verifyByPurpose(value, 'login', role)

      const accessToken = r.data?.access_token ?? r.data?.accessToken
      const userFromResponse = r.data?.user
      if (!accessToken) {
        toast.error('Сервер не вернул access token')
        return
      }

      const jwt = parseJwtPayload(accessToken)
      const fallbackRole = (jwt?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? role) as string

      const user = userFromResponse ?? {
        id: jwt?.sub ?? 'unknown',
        phone,
        email: null,
        first_name: '',
        last_name: null,
        avatar_url: null,
        role: fallbackRole,
      }

      setSession(accessToken, user)

      if (next && next.startsWith('/')) {
        router.push(next)
        return
      }

      const home = roleHome(user.role)
      if (!user.first_name) {
        router.push('/auth/role')
        return
      }
      router.push(home)
    } catch (err: any) {
      const message = extractErrorMessage(err)
      if (message.toLowerCase().includes('user not found')) {
        toast.error('Пользователь не найден. Сначала зарегистрируйтесь.')
      } else {
        toast.error(message)
      }
      setCode('')
    }
  }

  async function resend() {
    if (!phone) return
    setIsResending(true)
    try {
      await api.post('/api/auth/send-otp', { phone, purpose: 'login' })
      toast.success('Код отправлен повторно')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Не удалось отправить код')
    } finally {
      setIsResending(false)
    }
  }

  if (!phone) {
    return (
      <Card className="space-y-3 p-6 text-center">
        <p>Не указан номер. Вернитесь на шаг входа.</p>
        <Button onClick={() => router.replace('/auth/login')}>На вход</Button>
      </Card>
    )
  }

  return (
    <Card className="space-y-6 p-6 md:p-8">
      <div className="space-y-2">
        <h1 className="text-h1">Введите код</h1>
        <p className="text-body text-ink-500">
          Мы отправили 4-значный код на номер {phone}
        </p>
      </div>
      <div className="flex justify-center">
        <OtpInput
          value={code}
          onChange={setCode}
          onComplete={(v) => verify(v)}
        />
      </div>
      <div className="flex flex-col items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={resend}
          loading={isResending}
        >
          Отправить код ещё раз
        </Button>
        <Button
          variant="link"
          size="sm"
          onClick={() => router.replace('/auth/login')}
        >
          Изменить номер
        </Button>
      </div>
    </Card>
  )
}

function roleHome(role: string): string {
  switch (role) {
    case 'EXECUTOR': return '/executor'
    case 'ADMIN': return '/admin'
    case 'OPERATOR': return '/operator'
    default: return '/app'
  }
}
