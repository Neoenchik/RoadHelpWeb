'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { AuthGuard } from '@/components/auth-guard'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/auth'
import { SERVICES } from '@/lib/services'

import type { ServiceType } from '@road-help/shared'

export default function ExecutorProfilePage() {
  return (
    <AuthGuard allow={['EXECUTOR']}>
      <Inner />
    </AuthGuard>
  )
}

function Inner() {
  const router = useRouter()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const clear = useAuthStore((s) => s.clear)

  const { data: profile } = useQuery<{
    service_types: ServiceType[]
    vehicle_make: string | null
    vehicle_plate: string | null
    rating: number
    completed_count: number
    verification_status: string
  }>({
    queryKey: ['executor', 'me'],
    queryFn: async () => (await api.get('/api/executor/me')).data,
  })

  const [services, setServices] = useState<ServiceType[]>([])
  const [make, setMake] = useState('')
  const [plate, setPlate] = useState('')

  useEffect(() => {
    if (profile) {
      setServices(profile.service_types ?? [])
      setMake(profile.vehicle_make ?? '')
      setPlate(profile.vehicle_plate ?? '')
    }
  }, [profile])

  const save = useMutation({
    mutationFn: async () =>
      (await api.patch('/api/executor/me', {
        service_types: services,
        vehicle_make: make || null,
        vehicle_plate: plate || null,
      })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['executor', 'me'] })
      toast.success('Сохранено')
    },
  })

  async function logout() {
    try { await api.post('/api/auth/logout') } catch { /* ignore */ }
    clear()
    router.replace('/')
  }

  if (!profile) {
    return <div className="grid min-h-svh place-items-center"><Spinner size="lg" /></div>
  }

  return (
    <main className="mx-auto max-w-screen-sm space-y-4 p-4">
      <header className="flex items-center gap-3">
        <IconButton aria-label="Назад" onClick={() => router.back()}>
          <Icon name="ArrowLeft" size={20} />
        </IconButton>
        <h1 className="text-h1">Профиль</h1>
      </header>

      <Card className="flex items-center gap-4">
        <Avatar name={`${user?.first_name} ${user?.last_name ?? ''}`} size="xl" />
        <div>
          <div className="text-h3">{user?.first_name} {user?.last_name ?? ''}</div>
          <div className="text-caption text-ink-500">{user?.phone}</div>
          <div className="mt-1 flex items-center gap-1 text-caption">
            <Icon name="Star" size={14} className="fill-accent-500 text-accent-500" />
            <span className="font-medium">{profile.rating.toFixed(1)}</span>
            <span className="text-ink-500">· {profile.completed_count} заказов</span>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="text-h3">Услуги</div>
        <div className="grid grid-cols-2 gap-2">
          {SERVICES.map((s) => {
            const active = services.includes(s.id)
            return (
              <button
                key={s.id}
                type="button"
                onClick={() =>
                  setServices((prev) => active ? prev.filter((x) => x !== s.id) : [...prev, s.id])
                }
                className={
                  'flex items-center gap-2 rounded-xl border p-3 text-left transition-colors ' +
                  (active
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-ink-300 text-ink-700 hover:border-primary-300')
                }
              >
                <Icon name={s.icon} size={18} />
                <span className="text-caption font-medium">{s.name}</span>
              </button>
            )
          })}
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="text-h3">Автомобиль</div>
        <Input label="Марка и модель" value={make} onChange={(e) => setMake(e.target.value)} />
        <Input label="Номер" value={plate} onChange={(e) => setPlate(e.target.value)} />
      </Card>

      <Button block size="lg" onClick={() => save.mutate()} loading={save.isPending}>
        Сохранить
      </Button>

      <Button variant="ghost" block onClick={logout}>
        <Icon name="LogOut" size={18} /> Выйти
      </Button>
    </main>
  )
}
