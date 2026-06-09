'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'

const schema = z.object({
  phone: z
    .string()
    .min(11, 'Введите телефон полностью')
    .refine((v) => /^\+?\d{10,15}$/.test(v.replace(/\s/g, '')), 'Формат: +79991234567'),
})

type FormValues = z.infer<typeof schema>

function normalizePhone(input: string): string {
  let v = input.replace(/[^\d+]/g, '')
  if (v.startsWith('8')) v = '+7' + v.slice(1)
  if (!v.startsWith('+')) v = '+' + v
  return v
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') ?? ''
  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  function extractErrorMessage(err: any): string {
    const data = err?.response?.data
    if (typeof data === 'string' && data.trim()) return data
    if (typeof data?.detail === 'string' && data.detail.trim()) return data.detail
    if (typeof data?.title === 'string' && data.title.trim()) return data.title
    if (typeof data?.message === 'string' && data.message.trim()) return data.message
    return 'Не удалось отправить код'
  }

  async function onSubmit({ phone }: FormValues) {
    const normalized = normalizePhone(phone)
    try {
      await api.post('/api/auth/send-otp', { phone: normalized, purpose: 'login' })
      const q = new URLSearchParams({ phone: normalized })
      if (next) q.set('next', next)
      router.push(`/auth/verify?${q.toString()}`)
    } catch (err: any) {
      toast.error(extractErrorMessage(err))
    }
  }

  return (
    <Card className="space-y-6 p-6 md:p-8">
      <div className="space-y-2">
        <h1 className="text-h1">Вход</h1>
        <p className="text-body text-ink-500">
          Введите номер — пришлём код подтверждения.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Номер телефона"
          type="tel"
          autoFocus
          placeholder="+7 999 123-45-67"
          prefix={<Icon name="Phone" size={20} />}
          autoComplete="tel"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <Button type="submit" size="xl" block loading={isSubmitting}>
          Получить код
        </Button>
      </form>
      <p className="text-center text-micro text-ink-500">
        Продолжая, вы принимаете условия использования.
      </p>
    </Card>
  )
}
