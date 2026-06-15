import type { ServiceType } from '@road-help/shared'

export interface ServiceMeta {
  id: ServiceType
  name: string
  icon: 'Truck' | 'Disc3' | 'Fuel' | 'KeyRound' | 'BatteryCharging'
}

export const SERVICES: ServiceMeta[] = [
  { id: 'tow',     name: 'Эвакуатор',         icon: 'Truck' },
  { id: 'tire',    name: 'Спустило колесо',   icon: 'Disc3' },
  { id: 'fuel',    name: 'Закончилось топливо', icon: 'Fuel' },
  { id: 'lockout', name: 'Вскрытие',          icon: 'KeyRound' },
  { id: 'battery', name: 'Сел аккумулятор',   icon: 'BatteryCharging' },
]

export function serviceMeta(id: ServiceType): ServiceMeta | undefined {
  return SERVICES.find((s) => s.id === id)
}

export function serviceLabel(type: string): string {
  return serviceMeta(type.toLowerCase() as ServiceType)?.name ?? type
}
