using System;
using System.Collections.Generic;
using RoadHelp.Api.Enums;

namespace RoadHelp.Api.Models;

public class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid? ExecutorId { get; set; }
    public User? Executor { get; set; }

    public ServiceType ServiceType { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.PENDING;

    public double Lat { get; set; }
    public double Lng { get; set; }
    public string Address { get; set; } = string.Empty;
    public string? Description { get; set; }

    public decimal? EstimatedPrice { get; set; }
    public decimal? FinalPrice { get; set; }
    public string? CancelReason { get; set; }
    public string? TransactionId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? MatchedAt { get; set; }
    public DateTime? AcceptedAt { get; set; }
    public DateTime? ArrivedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    public ICollection<Review> Reviews { get; set; } = new List<Review>();
}