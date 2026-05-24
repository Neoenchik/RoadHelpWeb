'use client'

import { useRouter } from 'next/navigation'

import { AuthGuard } from '@/components/auth-guard'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { IconButton } from '@/components/ui/icon-button'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/auth'

export default function ProfilePage() {
  return (
    <AuthGuard allow={['USER']}>
      <Inner />
    </AuthGuard>
  )
}

function Inner() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const clear = useAuthStore((s) => s.clear)

  async function logout() {
    try { await api.post('/api/auth/logout') } catch { /* ignore */ }
    clear()
    router.replace('/')
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
        <Avatar
          name={user ? `${user.first_name} ${user.last_name ?? ''}` : '?'}
          src={user?.avatar_url ?? undefined}
          size="xl"
        />
        <div>
          <div className="text-h3">{user?.first_name} {user?.last_name ?? ''}</div>
          <div className="text-caption text-ink-500">{user?.phone ?? user?.email}</div>
        </div>
      </Card>

      <Card className="divide-y divide-ink-300/50">
        <Row icon="CreditCard" label="Способы оплаты" onClick={() => router.push('/app/payment')} />
        <Row icon="ClipboardList" label="История заказов" onClick={() => router.push('/app/history')} />
        <Row icon="Bell" label="Уведомления" onClick={() => {}} />
      </Card>

      <Button variant="ghost" block onClick={logout}>
        <Icon name="LogOut" size={18} /> Выйти
      </Button>
    </main>
  )
}

function Row({ icon, label, onClick }: { icon: 'CreditCard' | 'ClipboardList' | 'Bell'; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 py-3 text-left">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-100 text-ink-700">
        <Icon name={icon} size={18} />
      </div>
      <span className="flex-1 text-body">{label}</span>
      <Icon name="ChevronRight" size={20} className="text-ink-500" />
    </button>
  )
}
