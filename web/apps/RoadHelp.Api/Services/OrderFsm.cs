using System;
using System.Collections.Generic;
using System.Linq;
using RoadHelp.Api.Enums;
using RoadHelp.Api.Models;

namespace RoadHelp.Api.Services;

public class OrderFsm
{
    private static readonly Dictionary<OrderStatus, HashSet<OrderStatus>> Transitions = new()
    {
        { OrderStatus.PENDING, new HashSet<OrderStatus> { OrderStatus.MATCHED, OrderStatus.CANCELLED } },
        { OrderStatus.MATCHED, new HashSet<OrderStatus> { OrderStatus.ACCEPTED, OrderStatus.PENDING, OrderStatus.CANCELLED } },
        { OrderStatus.ACCEPTED, new HashSet<OrderStatus> { OrderStatus.EN_ROUTE, OrderStatus.CANCELLED } },
        { OrderStatus.EN_ROUTE, new HashSet<OrderStatus> { OrderStatus.ARRIVED, OrderStatus.CANCELLED } },
        { OrderStatus.ARRIVED, new HashSet<OrderStatus> { OrderStatus.IN_PROGRESS } },
        { OrderStatus.IN_PROGRESS, new HashSet<OrderStatus> { OrderStatus.AWAITING_CONFIRMATION } },
        { OrderStatus.AWAITING_CONFIRMATION, new HashSet<OrderStatus> { OrderStatus.COMPLETED, OrderStatus.DISPUTED } },
        { OrderStatus.DISPUTED, new HashSet<OrderStatus> { OrderStatus.COMPLETED, OrderStatus.CANCELLED } }
    };

    public StatusChangeLog Transition(Order order, OrderStatus newStatus, Guid? byUserId = null, string? reason = null)
    {
        if (!Transitions.TryGetValue(order.Status, out var allowed) || !allowed.Contains(newStatus))
        {
            throw new InvalidOperationException($"Invalid transition from {order.Status} to {newStatus}");
        }

        var oldStatus = order.Status;
        order.Status = newStatus;

        return new StatusChangeLog
        {
            TargetType = StatusChangeTargetType.order,
            TargetId = order.Id,
            OldStatus = oldStatus.ToString(),
            NewStatus = newStatus.ToString(),
            Reason = reason,
            ChangedById = byUserId
        };
    }
}