// Общие типы. После реализации backend на шаге 8+ запустить `npm run openapi:gen`,
// и openapi.ts появится с типами всех роутов.

export type Role = 'USER' | 'EXECUTOR' | 'ADMIN' | 'OPERATOR'

export type ServiceType = 'tow' | 'tire' | 'fuel' | 'lockout' | 'battery'

export type OrderStatus =
  | 'PENDING'
  | 'MATCHED'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'AWAITING_CONFIRMATION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED'

export type ExecutorVerificationStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'SUSPENDED'
  | 'DISABLED'

export type ExecutorOnlineStatus = 'ONLINE' | 'OFFLINE'
