'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { AuthGuard } from '@/components/auth-guard'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { IconButton } from '@/components/ui/icon-button'
import { Spinner } from '@/components/ui/spinner'
import { api } from '@/lib/api'

interface UploadedFile {
  file: File
  preview: string
}

export default function VerificationPage() {
  const router = useRouter()
  const [passport, setPassport] = useState<UploadedFile | null>(null)
  const [license, setLicense] = useState<UploadedFile | null>(null)
  const [sts, setSts] = useState<UploadedFile | null>(null)

  const uploadDocs = useMutation({
    mutationFn: async (files: File[]) => {
      const form = new FormData()
      files.forEach(f => form.append('files', f))
      return (await api.post('/api/executor/me/documents', form)).data
    },
    onSuccess: () => {
      toast.success('Документы отправлены на проверку')
      router.push('/executor')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.detail ?? 'Ошибка при отправке документов')
    }
  })

  const handleSubmit = () => {
    const files = [passport?.file, license?.file, sts?.file].filter(Boolean) as File[]
    if (files.length < 3) {
      toast.error('Загрузите все 3 документа')
      return
    }
    uploadDocs.mutate(files)
  }

  const handleFile = (setter: (f: UploadedFile | null) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setter({ file, preview: URL.createObjectURL(file) })
  }

  const clearFile = (setter: (f: UploadedFile | null) => void) => () => setter(null)

  return (
    <AuthGuard allow={['EXECUTOR']}>
      <main className="mx-auto max-w-screen-sm space-y-4 p-4">
        <header className="flex items-center gap-3">
          <IconButton aria-label="Назад" onClick={() => router.back()}>
            <Icon name="ArrowLeft" size={20} />
          </IconButton>
          <h1 className="text-h1">Верификация</h1>
        </header>

        <Card className="space-y-4 p-4">
          <p className="text-body text-ink-700">
            Загрузите фото или сканы: паспорт (страница с фото), права и СТС.
          </p>

          <FileInput label="Паспорт (страница с фото)" file={passport} onChange={handleFile(setPassport)} onClear={clearFile(setPassport)} />
          <FileInput label="Водительские права" file={license} onChange={handleFile(setLicense)} onClear={clearFile(setLicense)} />
          <FileInput label="Свидетельство о регистрации ТС" file={sts} onChange={handleFile(setSts)} onClear={clearFile(setSts)} />

          <Button 
            size="xl" 
            block 
            onClick={handleSubmit}
            disabled={uploadDocs.isPending || !passport || !license || !sts}
          >
            {uploadDocs.isPending ? <Spinner size="sm" /> : 'Отправить на проверку'}
          </Button>
        </Card>
      </main>
    </AuthGuard>
  )
}

function FileInput({ 
  label, 
  file, 
  onChange, 
  onClear 
}: { 
  label: string
  file: UploadedFile | null
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClear: () => void
}) {
  return (
    <div className="space-y-2">
      <label className="text-caption font-medium">{label}</label>
      <div className="flex items-center gap-3">
        <label className="flex-1 cursor-pointer rounded-xl border border-dashed border-ink-300 px-4 py-6 text-center hover:border-primary-300">
          <input type="file" accept="image/*,.pdf" onChange={onChange} className="hidden" />
          <Icon name="Upload" size={20} className="mx-auto mb-1 text-ink-500" />
          <span className="text-caption text-ink-500">
            {file ? file.file.name : 'Нажмите для выбора файла'}
          </span>
        </label>
        {file && (
          <button type="button" onClick={onClear} className="text-ink-500 hover:text-ink-900">
            <Icon name="X" size={16} />
          </button>
        )}
      </div>
    </div>
  )
}