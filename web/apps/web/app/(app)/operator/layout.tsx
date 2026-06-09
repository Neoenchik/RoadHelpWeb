'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

import { AuthGuard } from '@/components/auth-guard'
import { Icon } from '@/components/ui/icon'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/auth'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/operator',          label: 'Dashboard', icon: 'Gauge' as const },
  { href: '/operator/active',   label: 'Активные',  icon: 'Activity' as const },
  { href: '/operator/disputes', label: 'Споры',     icon: 'AlertTriangle' as const },
]

export default function OperatorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const clear = useAuthStore((s) => s.clear)

  async function logout() {
    try { await api.post('/api/auth/logout') } catch {}
    clear()
    router.replace('/')
  }

  return (
    <AuthGuard allow={['OPERATOR', 'ADMIN']}>
      <div className="flex min-h-svh">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-300/50 bg-surface-raised md:flex">
          <div className="px-5 pt-6 pb-4 text-h3 font-extrabold tracking-tight">Road Help</div>
          <div className="px-3 py-2 text-micro text-ink-500">OPERATOR</div>
          <nav className="mt-2 flex flex-col gap-1 px-3">
            {NAV.map((n) => {
              const active = pathname === n.href || pathname.startsWith(n.href + '/')
              return (
                <Link
                  key={n.href}
                  href={n.href}
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
          <div className="mt-auto p-3">
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-body text-ink-700 hover:bg-surface-sunken"
            >
              <Icon name="LogOut" size={20} /> Выйти
            </button>
          </div>
        </aside>
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </AuthGuard>
  )
}
