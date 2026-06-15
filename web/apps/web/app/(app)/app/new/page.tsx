'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { AuthGuard } from '@/components/auth-guard'
import { MapBlock } from '@/components/domain/MapBlock'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { IconButton } from '@/components/ui/icon-button'
import { useGeolocation } from '@/hooks/useGeolocation'
import { api } from '@/lib/api'
import { SERVICES, serviceMeta } from '@/lib/services'

import type { ServiceType } from '@road-help/shared'

type Step = 'service' | 'address' | 'confirm'

const DEFAULT_CENTER: [number, number] = [37.6173, 55.7558] // Москва, центр

export default function NewOrderPage() {
  return (
    <AuthGuard allow={['USER']}>
      <Wizard />
    </AuthGuard>
  )
}

function Wizard() {
  const router = useRouter()
  const params = useSearchParams()
  const initialService = params.get('service') as ServiceType | null

  const [step, setStep] = useState<Step>(initialService ? 'address' : 'service')
  const [service, setService] = useState<ServiceType | null>(initialService)
  const [coords, setCoords] = useState<[number, number]>(DEFAULT_CENTER)
  const [address, setAddress] = useState('Москва')
  const [description, setDescription] = useState('')

  const updateCoords = useCallback((c: [number, number]) => {
    setCoords((prev) => (prev[0] === c[0] && prev[1] === c[1] ? prev : c))
  }, [])

  const create = useMutation({
    mutationFn: async () => {
      if (!service) throw new Error('no service')
      const r = await api.post('/api/orders', {
        service_type: service,
        lat: coords[1],
        lng: coords[0],
        address,
        description: description || null,
      })
      return r.data as { id: string }
    },
    onSuccess: ({ id }) => router.push(`/app/orders/${id}`),
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Не удалось создать заказ'),
  })

  return (
    <main className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between p-4">
        <IconButton aria-label="Назад" onClick={() => goBack(step, setStep, router)}>
          <Icon name={step === 'service' ? 'X' : 'ArrowLeft'} size={20} />
        </IconButton>
        <span className="text-caption text-ink-500">
          Шаг {step === 'service' ? 1 : step === 'address' ? 2 : 3} из 3
        </span>
        <span className="w-11" />
      </header>

      {step === 'service' && (
        <ServiceStep
          onPick={(s) => {
            setService(s)
            setStep('address')
          }}
        />
      )}

      {step === 'address' && (
        <AddressStep
          coords={coords}
          onCoords={updateCoords}
          address={address}
          onAddress={setAddress}
          onNext={() => setStep('confirm')}
        />
      )}

      {step === 'confirm' && service && (
        <ConfirmStep
          service={service}
          coords={coords}
          address={address}
          description={description}
          onDescription={setDescription}
          onSubmit={() => create.mutate()}
          submitting={create.isPending}
        />
      )}
    </main>
  )
}

function goBack(step: Step, setStep: (s: Step) => void, router: ReturnType<typeof useRouter>) {
  if (step === 'service') router.push('/app')
  else if (step === 'address') setStep('service')
  else setStep('address')
}

function ServiceStep({ onPick }: { onPick: (s: ServiceType) => void }) {
  return (
    <div className="flex-1 px-4 pb-8">
      <h1 className="text-h1">Что случилось?</h1>
      <p className="mt-1 text-body text-ink-500">Выберите услугу — это займёт секунду.</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {SERVICES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onPick(s.id)}
            className="aspect-square rounded-2xl bg-surface-base p-4 shadow-soft transition-all hover:shadow-pop active:scale-[0.98]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-500">
              <Icon name={s.icon} size={28} />
            </div>
            <div className="mt-3 text-left text-body font-medium">{s.name}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function AddressStep({
  coords,
  onCoords,
  address,
  onAddress,
  onNext,
}: {
  coords: [number, number]
  onCoords: (c: [number, number]) => void
  address: string
  onAddress: (s: string) => void
  onNext: () => void
}) {
  const { coords: gps, request, loading } = useGeolocation()

  useEffect(() => {
    if (gps) onCoords([gps.lng, gps.lat])
  }, [gps, onCoords])

  return (
    <div className="relative flex-1">
      <MapBlock
        center={coords}
        zoom={15}
        centerPin
        onCenterChange={(c) => onCoords(c)}
        className="absolute inset-0 rounded-none"
      />
      <Button
        size="md"
        variant="raised"
        className="absolute right-4 top-4 z-10"
        onClick={request}
        loading={loading}
      >
        <Icon name="Crosshair" size={18} /> Моё местоположение
      </Button>
      <div className="fixed inset-x-0 bottom-0 z-20 space-y-3 bg-surface-base p-4 pb-safe shadow-sheet">
        <div className="flex items-start gap-2">
          <Icon name="MapPin" size={20} className="mt-1 text-primary-500" />
          <div>
            <div className="text-caption text-ink-500">Адрес</div>
            <input
              value={address}
              onChange={(e) => onAddress(e.target.value)}
              className="w-full bg-transparent text-body text-ink-900 outline-none"
              placeholder="Введите адрес"
            />
          </div>
        </div>
        <Button size="xl" block onClick={onNext} disabled={!address.trim()}>
          Дальше
        </Button>
      </div>
    </div>
  )
}

function ConfirmStep({
  service,
  coords,
  address,
  description,
  onDescription,
  onSubmit,
  submitting,
}: {
  service: ServiceType
  coords: [number, number]
  address: string
  description: string
  onDescription: (s: string) => void
  onSubmit: () => void
  submitting: boolean
}) {
  const meta = serviceMeta(service)
  return (
    <div className="flex-1 space-y-4 px-4 pb-32">
      <h1 className="text-h1">Проверьте заказ</h1>
      <Card className="space-y-3">
        <Row icon="Wrench" label="Услуга" value={meta?.name ?? service} />
        <Row icon="MapPin" label="Адрес" value={address} />
        <Row icon="Banknote" label="Цена" value="от 1 500 ₽" />
      </Card>

      <Card>
        <label className="text-caption text-ink-500">Комментарий мастеру</label>
        <textarea
          value={description}
          onChange={(e) => onDescription(e.target.value)}
          rows={3}
          className="mt-1 w-full resize-none bg-transparent text-body text-ink-900 outline-none"
          placeholder="Например: машина с правой стороны двора"
        />
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-20 bg-surface-base p-4 pb-safe shadow-sheet">
        <Button size="xl" block onClick={onSubmit} loading={submitting}>
          Найти мастера
        </Button>
      </div>
    </div>
  )
}

function Row({ icon, label, value }: { icon: 'Wrench' | 'MapPin' | 'Banknote'; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
        <Icon name={icon} size={20} />
      </div>
      <div>
        <div className="text-caption text-ink-500">{label}</div>
        <div className="text-body">{value}</div>
      </div>
    </div>
  )
}
