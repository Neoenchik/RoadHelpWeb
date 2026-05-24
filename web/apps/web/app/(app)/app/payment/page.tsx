'use client'

import { useRouter } from 'next/navigation'

import { AuthGuard } from '@/components/auth-guard'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Icon } from '@/components/ui/icon'
import { IconButton } from '@/components/ui/icon-button'

export default function PaymentPage() {
  const router = useRouter()
  return (
    <AuthGuard allow={['USER']}>
      <main className="mx-auto max-w-screen-sm space-y-4 p-4">
        <header className="flex items-center gap-3">
          <IconButton aria-label="Назад" onClick={() => router.back()}>
            <Icon name="ArrowLeft" size={20} />
          </IconButton>
          <h1 className="text-h1">Способы оплаты</h1>
        </header>
        <Card>
          <EmptyState
            icon={<Icon name="CreditCard" size={24} />}
            title="Карты ещё не добавлены"
            description="Платёжная интеграция подключается отдельным шагом — после выбора провайдера."
          />
        </Card>
      </main>
    </AuthGuard>
  )
}
