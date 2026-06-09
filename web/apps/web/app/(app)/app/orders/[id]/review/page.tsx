'use client'

import { useMutation } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { AuthGuard } from '@/components/auth-guard'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { RatingStars } from '@/components/ui/rating-stars'
import { api } from '@/lib/api'

export default function ReviewPage() {
  return (
    <AuthGuard allow={['USER']}>
      <Inner />
    </AuthGuard>
  )
}

function Inner() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [score, setScore] = useState(5)
  const [comment, setComment] = useState('')

  const submit = useMutation({
    mutationFn: async () =>
      (await api.post(`/api/orders/${id}/review`, { score, comment: comment || null })).data,
    onSuccess: () => {
      toast.success('Спасибо за отзыв!')
      router.replace('/app')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Не удалось'),
  })

  return (
    <main className="mx-auto flex min-h-svh max-w-screen-sm flex-col p-4">
      <div className="flex-1 space-y-6 py-8">
        <div className="text-center space-y-2">
          <h1 className="text-h1">Как всё прошло?</h1>
          <p className="text-body text-ink-500">Ваш отзыв помогает другим водителям.</p>
        </div>
        <div className="flex justify-center">
          <RatingStars value={score} onChange={setScore} size={44} />
        </div>
        <Card>
          <textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Расскажите подробнее (опционально)"
            className="w-full resize-none bg-transparent text-body text-ink-900 outline-none"
          />
        </Card>
      </div>
      <div className="space-y-3 pb-safe">
        <Button size="xl" block onClick={() => submit.mutate()} loading={submit.isPending}>
          Отправить
        </Button>
        <Button variant="ghost" block onClick={() => router.replace('/app')}>
          Пропустить
        </Button>
      </div>
    </main>
  )
}
