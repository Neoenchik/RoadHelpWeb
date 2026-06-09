import Link from 'next/link'
import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-gradient-to-b from-primary-50/40 to-surface-base">
      <header className="px-4 py-4">
        <Link href="/" className="text-h3 font-extrabold tracking-tight">
          Road Help
        </Link>
      </header>
      <div className="flex flex-1 items-start justify-center px-4 pb-12 pt-4 md:items-center">
        <div className="w-full max-w-screen-sm">{children}</div>
      </div>
    </div>
  )
}
