using System;
using RoadHelp.Api.Enums;

namespace RoadHelp.Api.Models;

public class StatusChangeLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public StatusChangeTargetType TargetType { get; set; }
    public Guid TargetId { get; set; }
    
    public string? OldStatus { get; set; }
    public string? NewStatus { get; set; }
    public string? Reason { get; set; }
    public Guid? ChangedById { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}