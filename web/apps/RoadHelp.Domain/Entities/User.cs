using RoadHelp.Domain.Enums;

namespace RoadHelp.Domain.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public long? TelegramId { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? PasswordHash { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string? LastName { get; set; }
    public string? AvatarUrl { get; set; }
    public Role Role { get; set; } = Role.USER;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ExecutorProfile? ExecutorProfile { get; set; }
    public ICollection<Order> OrdersAsUser { get; set; } = new List<Order>();
    public ICollection<Order> OrdersAsExecutor { get; set; } = new List<Order>();
    public ICollection<PaymentMethod> PaymentMethods { get; set; } = new List<PaymentMethod>();
    public ICollection<PushSubscription> PushSubscriptions { get; set; } = new List<PushSubscription>();
}
