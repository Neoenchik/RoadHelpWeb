'use client'

import { create } from 'zustand'

import type { Role } from '@road-help/shared'

export interface AuthUser {
  id: string
  phone: string | null
  email: string | null
  first_name: string
  last_name: string | null
  avatar_url: string | null
  role: Role
}

interface AuthState {
  accessToken: string | null
  user: AuthUser | null
  hydrated: boolean
  setSession: (token: string, user: AuthUser) => void
  clear: () => void
  setHydrated: (v: boolean) => void
  setUser: (user: AuthUser) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  hydrated: false,
  setSession: (token, user) => set({ accessToken: token, user }),
  clear: () => set({ accessToken: null, user: null }),
  setHydrated: (v) => set({ hydrated: v }),
  setUser: (user) => set({ user }),
}))
