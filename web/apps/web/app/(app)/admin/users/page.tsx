'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'

export default function AdminUsersPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')

  const { data, isPending } = useQuery<any[]>({
    queryKey: ['admin', 'users', q, role],
    queryFn: async () => {
      const params: string[] = []
      if (q) params.push(`q=${encodeURIComponent(q)}`)
      if (role) params.push(`role=${role}`)
      return (await api.get(`/api/admin/users${params.length ? '?' + params.join('&') : ''}`)).data
    },
  })

  const setRoleM = useMutation({
    mutationFn: async ({ id, r }: { id: string; r: string }) =>
      (await api.patch(`/api/admin/users/${id}`, { role: r })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('Роль обновлена')
    },
  })

  return (
    <main className="mx-auto max-w-screen-2xl space-y-4 p-6">
      <h1 className="text-h1">Пользователи</h1>
      <div className="flex gap-3">
        <Input placeholder="Поиск" value={q} onChange={(e) => setQ(e.target.value)} />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-12 rounded-xl border border-ink-300 bg-surface-base px-3 text-body"
        >
          <option value="">Все роли</option>
          <option value="USER">USER</option>
          <option value="EXECUTOR">EXECUTOR</option>
          <option value="OPERATOR">OPERATOR</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </div>

      <Card className="overflow-x-auto p-0">
        {isPending ? (
          <div className="space-y-2 p-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
        ) : (
          <table className="min-w-full">
            <thead className="border-b border-ink-300/50 text-caption text-ink-500">
              <tr>
                <th className="p-3 text-left">Имя</th>
                <th className="p-3 text-left">Контакт</th>
                <th className="p-3 text-left">Роль</th>
                <th className="p-3 text-right">Изменить роль</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((u) => (
                <tr key={u.id} className="border-b border-ink-300/40 last:border-0">
                  <td className="p-3">{u.first_name} {u.last_name ?? ''}</td>
                  <td className="p-3 text-caption text-ink-500">{u.phone ?? u.email ?? '—'}</td>
                  <td className="p-3">{u.role}</td>
                  <td className="p-3 text-right">
                    <select
                      value={u.role}
                      onChange={(e) => setRoleM.mutate({ id: u.id, r: e.target.value })}
                      className="h-9 rounded-lg border border-ink-300 bg-surface-base px-2 text-caption"
                    >
                      <option value="USER">USER</option>
                      <option value="EXECUTOR">EXECUTOR</option>
                      <option value="OPERATOR">OPERATOR</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </main>
  )
}
