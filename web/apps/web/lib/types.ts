import type { OrderStatus, ServiceType } from '@road-help/shared'

export interface ExecutorMini {
  id: string
  first_name: string
  last_name: string | null
  avatar_url: string | null
  rating: number
  completed_count: number
  vehicle_make: string | null
  vehicle_plate: string | null
  lat: number | null
  lng: number | null
  distance_km?: number | null
  eta_min?: number | null
  estimated_price?: number | null
}

export interface Order {
  id: string
  user_id: string
  executor_id: string | null
  service_type: ServiceType
  status: OrderStatus
  lat: number
  lng: number
  address: string
  description: string | null
  estimated_price: string | null
  final_price: string | null
  cancel_reason: string | null
  created_at: string
  matched_at: string | null
  accepted_at: string | null
  arrived_at: string | null
  completed_at: string | null
  executor: ExecutorMini | null
}
