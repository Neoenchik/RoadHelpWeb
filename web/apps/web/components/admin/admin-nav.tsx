'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

export const ADMIN_NAV = [
  { href: '/admin', label: 'Сводка', icon: 'LayoutDashboard' as const, exact: true },
  { href: '/admin/orders', label: 'Заказы', icon: 'ClipboardList' as const },
  { href: '/admin/active', label: 'На карте', icon: 'Map' as const },
  { href: '/admin/disputes', label: 'Споры', icon: 'Scale' as const },
  { href: '/admin/executors', label: 'Исполнители', icon: 'Wrench' as const },
  { href: '/admin/users', label: 'Пользователи', icon: 'Users' as const },
  { href: '/admin/invites', label: 'Приглашения', icon: 'Mail' as const },
  { href: '/admin/broadcast', label: 'Рассылка', icon: 'Megaphone' as const },
]

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1">
      {ADMIN_NAV.map((n) => {
        const active = n.exact
          ? pathname === n.href
          : pathname === n.href || pathname.startsWith(n.href + '/')
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2 text-body transition-colors',
              active ? 'bg-primary-50 text-primary-700' : 'text-ink-700 hover:bg-surface-sunken',
            )}
          >
            <Icon name={n.icon} size={20} />
            {n.label}
          </Link>
        )
      })}
    </nav>
  )
}
