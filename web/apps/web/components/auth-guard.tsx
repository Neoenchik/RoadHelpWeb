'use client'

import { usePathname, useRouter } from 'next/navigation'
import { type ReactNode, useEffect } from 'react'

import { Spinner } from '@/components/ui/spinner'
import { useAuthStore } from '@/lib/auth'

import type { Role } from '@road-help/shared'

const ROLE_HOME: Record<Role, string> = {
  USER: '/app',
  EXECUTOR: '/executor',
  ADMIN: '/admin',
  OPERATOR: '/operator',
}

const PATH_PREFIX_FOR_ROLE: Record<Role, string> = ROLE_HOME

export interface AuthGuardProps {
  /** Если задан — пускаем только эти роли. Иначе любая авторизованная. */
  allow?: Role[]
  children: ReactNode
}

/**
 * Если не залогинен — на /auth/login.
 * Если роль не в allow — редирект на home соответствующей роли.
 */
export function AuthGuard({ allow, children }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const hydrated = useAuthStore((s) => s.hydrated)

  useEffect(() => {
    if (!hydrated) return
    if (!user) {
      const next = encodeURIComponent(pathname)
      router.replace(`/auth/login?next=${next}`)
      return
    }
    if (allow && !allow.includes(user.role)) {
      router.replace(ROLE_HOME[user.role])
      return
    }
    // Если зашёл "не в свой раздел" — отправим в свой
    const expected = PATH_PREFIX_FOR_ROLE[user.role]
    if (!pathname.startsWith(expected)) {
      router.replace(expected)
    }
  }, [hydrated, user, allow, pathname, router])

  if (!hydrated || !user || (allow && !allow.includes(user.role))) {
    return (
      <div className="grid min-h-svh place-items-center">
        <Spinner size="lg" label="Загрузка…" />
      </div>
    )
  }
  return <>{children}</>
}
