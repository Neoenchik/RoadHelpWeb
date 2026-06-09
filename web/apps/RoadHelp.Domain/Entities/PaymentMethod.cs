using RoadHelp.Domain.Enums;

namespace RoadHelp.Domain.Entities;

public class PaymentMethod
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public PaymentMethodType Type { get; set; }
    public string Last4 { get; set; } = string.Empty;
    public string? Brand { get; set; }
    public bool IsDefault { get; set; }
    public string ProviderToken { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
