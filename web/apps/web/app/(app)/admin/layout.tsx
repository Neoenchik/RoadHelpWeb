'use client'

import { usePathname, useRouter } from 'next/navigation'
import { type ReactNode, useState } from 'react'

import { AdminNav } from '@/components/admin/admin-nav'
import { AuthGuard } from '@/components/auth-guard'
import { Icon } from '@/components/ui/icon'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/auth'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const clear = useAuthStore((s) => s.clear)
  const [mobileOpen, setMobileOpen] = useState(false)

  async function logout() {
    try {
      await api.post('/api/auth/logout')
    } catch {}
    clear()
    router.replace('/')
  }

  return (
    <AuthGuard allow={['ADMIN']}>
      <div className="flex min-h-svh">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-300/50 bg-surface-raised md:flex">
          <AdminSidebar onLogout={logout} />
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-ink-900/40"
              aria-label="Закрыть меню"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="relative flex h-full w-72 flex-col border-r border-ink-300/50 bg-surface-raised shadow-sheet">
              <AdminSidebar onLogout={logout} onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-ink-300/50 bg-surface-base px-4 py-3 md:hidden">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-xl hover:bg-surface-sunken"
              aria-label="Меню"
              onClick={() => setMobileOpen(true)}
            >
              <Icon name="Menu" size={22} />
            </button>
            <div className="text-h3 font-bold">Admin</div>
            <div className="ml-auto text-micro text-ink-500 truncate max-w-[40%]">{pathname}</div>
          </header>
          <main className="flex-1 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </AuthGuard>
  )
}

function AdminSidebar({
  onLogout,
  onNavigate,
}: {
  onLogout: () => void
  onNavigate?: () => void
}) {
  return (
    <>
      <div className="px-5 pt-6 pb-4 text-h3 font-extrabold tracking-tight">Road Help</div>
      <div className="px-3 py-2 text-micro text-ink-500">АДМИН-ПАНЕЛЬ</div>
      <div className="mt-2 flex-1 px-3">
        <AdminNav onNavigate={onNavigate} />
      </div>
      <div className="p-3">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-body text-ink-700 hover:bg-surface-sunken"
        >
          <Icon name="LogOut" size={20} /> Выйти
        </button>
      </div>
    </>
  )
}
