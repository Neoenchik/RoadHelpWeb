'use client'

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

import { useAuthStore } from '@/lib/auth'

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // нужен для refresh-cookie
  timeout: 15_000,
})

// inject Bearer
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

// rotation 401 → refresh → retry once
type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

let refreshPromise: Promise<string | null> | null = null

async function attemptRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ access_token: string; user: any }>(
        `${API_URL}/api/auth/refresh`,
        null,
        { withCredentials: true }
      )
      .then((r) => {
        useAuthStore.getState().setSession(r.data.access_token, r.data.user)
        return r.data.access_token
      })
      .catch(() => {
        useAuthStore.getState().clear()
        return null
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined
    const status = error.response?.status
    const url = config?.url ?? ''
    if (
      status === 401 &&
      config &&
      !config._retried &&
      !url.includes('/api/auth/refresh') &&
      !url.includes('/api/auth/verify-otp') &&
      !url.includes('/api/auth/login-password')
    ) {
      config._retried = true
      const newToken = await attemptRefresh()
      if (newToken) {
        config.headers.set('Authorization', `Bearer ${newToken}`)
        return api(config)
      }
    }
    return Promise.reject(error)
  }
)
