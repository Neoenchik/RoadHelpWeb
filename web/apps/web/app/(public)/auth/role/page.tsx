'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/auth'

export default function RolePage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const setSession = useAuthStore((s) => s.setSession)
  const hydrated = useAuthStore((s) => s.hydrated)
  const accessToken = useAuthStore((s) => s.accessToken)

  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [picked, setPicked] = useState<'USER' | 'EXECUTOR' | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (hydrated && !accessToken) router.replace('/auth/login')
  }, [hydrated, accessToken, router])

  if (!user) {
    return (
      <Card className="p-6 text-center text-ink-500">Загрузка…</Card>
    )
  }

  async function onContinue() {
    if (!picked) {
      toast.error('Выберите роль')
      return
    }
    if (!first.trim()) {
      toast.error('Укажите имя')
      return
    }
    setSubmitting(true)
    try {
      const r = await api.patch('/api/users/me', {
        first_name: first.trim(),
        last_name: last.trim() || null,
        role: picked,
      })
      const token = r.data?.access_token
      if (token && r.data?.user) {
        setSession(token, r.data.user)
      } else if (r.data) {
        setUser(r.data)
      }
      router.replace(picked === 'EXECUTOR' ? '/executor' : '/app')
    } catch (err: any) {
      // /api/users/me пока заглушка (шаг 8) — на этом этапе мы хотя бы переходим
      // на нужный home, имя сохранится в следующем заходе.
      if (err?.response?.status === 404 || err?.response?.status === 405) {
        router.replace(picked === 'EXECUTOR' ? '/executor' : '/app')
      } else {
        toast.error(err?.response?.data?.detail ?? 'Не удалось сохранить')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="space-y-6 p-6 md:p-8">
      <div className="space-y-2">
        <h1 className="text-h1">Здравствуйте!</h1>
        <p className="text-body text-ink-500">Расскажите немного о себе.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <RoleCard
          icon="UserRound"
          title="Я клиент"
          desc="Заказываю помощь"
          active={picked === 'USER'}
          onClick={() => setPicked('USER')}
        />
        <RoleCard
          icon="Wrench"
          title="Я исполнитель"
          desc="Оказываю помощь"
          active={picked === 'EXECUTOR'}
          onClick={() => setPicked('EXECUTOR')}
        />
      </div>

      <div className="space-y-3">
        <Input label="Имя" value={first} onChange={(e) => setFirst(e.target.value)} placeholder="Алексей" />
        <Input label="Фамилия" value={last} onChange={(e) => setLast(e.target.value)} placeholder="Иванов" />
      </div>

      <Button size="xl" block onClick={onContinue} loading={submitting}>
        Продолжить
      </Button>
    </Card>
  )
}

function RoleCard({
  icon, title, desc, active, onClick,
}: {
  icon: 'UserRound' | 'Wrench'
  title: string
  desc: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all ' +
        (active
          ? 'border-primary-500 bg-primary-50 shadow-soft'
          : 'border-ink-300 bg-surface-base hover:border-primary-300')
      }
    >
      <div
        className={
          'flex h-10 w-10 items-center justify-center rounded-xl ' +
          (active ? 'bg-primary-500 text-white' : 'bg-ink-100 text-ink-700')
        }
      >
        <Icon name={icon} size={20} />
      </div>
      <div className="text-h3">{title}</div>
      <div className="text-caption text-ink-500">{desc}</div>
    </button>
  )
}
