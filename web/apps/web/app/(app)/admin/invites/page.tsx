'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'

interface Invite {
  id: string
  email: string
  role: 'ADMIN' | 'OPERATOR'
  invite_url: string
  expires_at: string
  used_at: string | null
  created_at: string
}

export default function AdminInvitesPage() {
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'OPERATOR' | 'ADMIN'>('OPERATOR')

  const { data: invites } = useQuery<Invite[]>({
    queryKey: ['admin', 'invites'],
    queryFn: async () => (await api.get('/api/admin/invites')).data,
  })

  const revoke = useMutation({
    mutationFn: async (inviteId: string) =>
      (await api.delete(`/api/admin/invites/${inviteId}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'invites'] })
      toast.success('Приглашение отозвано')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Не удалось отозвать'),
  })

  const create = useMutation({
    mutationFn: async () => (await api.post('/api/admin/invites', { email, role })).data,
    onSuccess: (data: Invite) => {
      qc.invalidateQueries({ queryKey: ['admin', 'invites'] })
      navigator.clipboard?.writeText(data.invite_url).catch(() => {})
      toast.success('Ссылка скопирована в буфер')
      setEmail('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Ошибка'),
  })

  return (
    <main className="mx-auto max-w-screen-lg space-y-4 p-6">
      <h1 className="text-h1">Приглашения</h1>

      <Card className="space-y-3">
        <div className="text-h3">Пригласить нового сотрудника</div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <Input placeholder="email@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            className="h-12 rounded-xl border border-ink-300 bg-surface-base px-3 text-body"
          >
            <option value="OPERATOR">OPERATOR</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <Button onClick={() => create.mutate()} disabled={!email} loading={create.isPending}>
            Отправить
          </Button>
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full">
          <thead className="border-b border-ink-300/50 text-caption text-ink-500">
            <tr>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Роль</th>
              <th className="p-3 text-left">Создано</th>
              <th className="p-3 text-left">Истекает</th>
              <th className="p-3 text-left">Статус</th>
              <th className="p-3 text-left">Действия</th>
            </tr>
          </thead>
          <tbody>
            {(invites ?? []).map((i) => (
              <tr key={i.id} className="border-b border-ink-300/40 last:border-0">
                <td className="p-3">{i.email}</td>
                <td className="p-3">{i.role}</td>
                <td className="p-3 text-caption text-ink-500">{format(new Date(i.created_at), 'd MMM HH:mm', { locale: ru })}</td>
                <td className="p-3 text-caption text-ink-500">{format(new Date(i.expires_at), 'd MMM HH:mm', { locale: ru })}</td>
                <td className="p-3">{i.used_at ? <Badge variant="success">Использовано</Badge> : <Badge variant="warning">Ожидает</Badge>}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(i.invite_url)
                        toast.success('Ссылка скопирована')
                      }}
                      className="text-caption text-primary-600 hover:underline"
                    >
                      Скопировать
                    </button>
                    {!i.used_at && (
                      <button
                        type="button"
                        onClick={() => revoke.mutate(i.id)}
                        className="text-caption text-danger hover:underline"
                      >
                        Отозвать
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </main>
  )
}
