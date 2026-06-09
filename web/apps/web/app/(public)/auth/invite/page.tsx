'use client'

import { Suspense } from 'react'

import { InviteInner } from './invite-inner'

export default function InvitePage() {
  return (
    <Suspense>
      <InviteInner />
    </Suspense>
  )
}
