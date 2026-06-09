namespace RoadHelp.Domain.Entities;

public class Review
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = null!;

    public Guid FromUserId { get; set; }
    public Guid ToUserId { get; set; }

    public int Score { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
