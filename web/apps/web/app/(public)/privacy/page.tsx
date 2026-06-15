import Link from 'next/link'

import { Button } from '@/components/ui/button'
import {
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_POLICY_TITLE,
  PRIVACY_POLICY_UPDATED,
  PRIVACY_SECTIONS,
} from '@/lib/privacy-policy'

export default function PrivacyPage() {
  return (
    <main className="min-h-svh bg-surface-base">
      <header className="border-b border-ink-300/50 bg-surface-raised">
        <div className="mx-auto flex max-w-screen-md items-center justify-between px-4 py-4">
          <Link href="/" className="text-h3 font-extrabold tracking-tight">
            Road Help
          </Link>
          <Button asChild size="sm" variant="ghost">
            <Link href="/auth/login">Войти</Link>
          </Button>
        </div>
      </header>

      <article className="mx-auto max-w-screen-md px-4 py-8 md:py-12">
        <h1 className="text-h1">{PRIVACY_POLICY_TITLE}</h1>
        <p className="mt-2 text-caption text-ink-500">
          Дата последнего обновления: {PRIVACY_POLICY_UPDATED}
        </p>

        <div className="mt-8 space-y-8">
          {PRIVACY_SECTIONS.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-h3 text-ink-900">{section.title}</h2>
              {section.paragraphs?.map((p) => (
                <p key={p} className="text-body leading-relaxed text-ink-700">
                  {p}
                </p>
              ))}
              {section.bullets && (
                <ul className="list-disc space-y-2 pl-5 text-body leading-relaxed text-ink-700">
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <p className="mt-10 text-caption text-ink-500">
          Контакт для обращений:{' '}
          <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`} className="text-primary-600 underline">
            {PRIVACY_CONTACT_EMAIL}
          </a>
        </p>
      </article>
    </main>
  )
}
