'use client'

import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

import { api } from '@/lib/api'

export default function AdminBroadcastPage() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [role, setRole] = useState('')

  const send = useMutation({
    mutationFn: async () =>
      (await api.post('/api/admin/broadcast', {
        title: title || 'RoadHelp',
        message,
        role: role || null,
      })).data,
    onSuccess: (data: { sent: number; message: string }) => {
      toast.success(`Отправлено ${data.sent} получателям`)
      setMessage('')
      setTitle('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Ошибка отправки'),
  })

  return (
    <main className="mx-auto max-w-screen-md space-y-4 p-4 md:p-6">
      <h1 className="text-h1">Рассылка</h1>

      <Card className="space-y-4">
        <p className="text-body text-ink-700">
          Push или SMS пользователям выбранной роли.
        </p>

        <Input label="Заголовок" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="RoadHelp" />

        <div className="space-y-1.5">
          <label className="block text-caption text-ink-700">Текст сообщения</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-ink-300 bg-surface-base px-3 py-2 text-body outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="Текст для пользователей…"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-caption text-ink-700">Аудитория</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-12 w-full rounded-xl border border-ink-300 bg-surface-base px-3 text-body"
          >
            <option value="">Все пользователи</option>
            <option value="USER">Только клиенты</option>
            <option value="EXECUTOR">Только исполнители</option>
            <option value="OPERATOR">Только операторы</option>
          </select>
        </div>

        <Button
          block
          size="lg"
          disabled={!message.trim()}
          loading={send.isPending}
          onClick={() => send.mutate()}
        >
          Отправить рассылку
        </Button>
      </Card>
    </main>
  )
}
