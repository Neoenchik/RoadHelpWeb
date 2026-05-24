import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'

import { Providers } from '@/components/providers'

import './globals.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Road Help — экстренная помощь на дороге',
  description: 'Эвакуатор, шиномонтаж, топливо, вскрытие, прикурить АКБ — за минуту найдём ближайшего мастера.',
  manifest: '/manifest.json',
  applicationName: 'Road Help',
  appleWebApp: {
    capable: true,
    title: 'Road Help',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#FF6B35',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-svh bg-surface-base font-sans text-ink-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
