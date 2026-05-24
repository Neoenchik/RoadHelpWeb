namespace RoadHelp.Api.Enums;

public enum Role { USER, EXECUTOR, ADMIN, OPERATOR }
public enum ServiceType { tow, tire, fuel, lockout, battery }
public enum OrderStatus { PENDING, MATCHED, ACCEPTED, EN_ROUTE, ARRIVED, IN_PROGRESS, AWAITING_CONFIRMATION, COMPLETED, CANCELLED, DISPUTED }
public enum ExecutorOnlineStatus { ONLINE, OFFLINE }
public enum ExecutorVerificationStatus { PENDING, VERIFIED, SUSPENDED, DISABLED }
public enum PaymentMethodType { card, wallet }
public enum StatusChangeTargetType { executor, order }
public enum InviteRole { ADMIN, OPERATOR }