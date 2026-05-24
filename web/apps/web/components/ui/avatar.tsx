'use client'

import * as RadixAvatar from '@radix-ui/react-avatar'
import { forwardRef } from 'react'

import { cn } from '@/lib/utils'

export interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  sm: 'h-8 w-8 text-caption',
  md: 'h-10 w-10 text-body',
  lg: 'h-12 w-12 text-h3',
  xl: 'h-16 w-16 text-h2',
}

function initials(name: string | null | undefined) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
  ({ src, name, size = 'md', className }, ref) => (
    <RadixAvatar.Root
      ref={ref}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-ink-100 font-semibold text-ink-700',
        sizes[size],
        className
      )}
    >
      {src && (
        <RadixAvatar.Image
          src={src}
          alt={name ?? ''}
          className="h-full w-full object-cover"
        />
      )}
      <RadixAvatar.Fallback delayMs={src ? 600 : 0}>
        {initials(name)}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  )
)
Avatar.displayName = 'Avatar'
