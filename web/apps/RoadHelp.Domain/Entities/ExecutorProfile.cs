using RoadHelp.Domain.Enums;

namespace RoadHelp.Domain.Entities;

public class ExecutorProfile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public ExecutorOnlineStatus OnlineStatus { get; set; } = ExecutorOnlineStatus.OFFLINE;
    public ExecutorVerificationStatus VerificationStatus { get; set; } = ExecutorVerificationStatus.PENDING;

    public List<string> ServiceTypes { get; set; } = new();
    public string? VehicleMake { get; set; }
    public string? VehiclePlate { get; set; }
    public List<string> DocumentsUrl { get; set; } = new();

    public double Rating { get; set; }
    public int CompletedCount { get; set; }
    public int DeclineCount { get; set; }

    public double? Lat { get; set; }
    public double? Lng { get; set; }
    public DateTime? LocationUpdatedAt { get; set; }
}
