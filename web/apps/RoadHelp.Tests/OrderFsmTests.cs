using System;
using FluentAssertions;
using RoadHelp.Domain.Enums;
using RoadHelp.Domain.Entities;
using RoadHelp.Domain.Services;
using RoadHelp.Application.Interfaces;
using RoadHelp.Application.Services;
using Xunit;

namespace RoadHelp.Tests;

public class OrderFsmTests
{
    private readonly OrderFsm _fsm;

    public OrderFsmTests()
    {
        _fsm = new OrderFsm();
    }

    [Fact]
    public void Transition_FromPendingToMatched_ShouldSucceed()
    {
        // Arrange
        var order = new Order { Id = Guid.NewGuid(), Status = OrderStatus.PENDING };

        // Act
        var result = _fsm.Transition(order, OrderStatus.MATCHED, null, "User requested match");

        // Assert
        order.Status.Should().Be(OrderStatus.MATCHED);
        result.Should().NotBeNull();
        result.OldStatus.Should().Be("PENDING");
        result.NewStatus.Should().Be("MATCHED");
        result.Reason.Should().Be("User requested match");
    }

    [Fact]
    public void Transition_FromPendingToAccepted_ShouldFail()
    {
        // Arrange
        var order = new Order { Id = Guid.NewGuid(), Status = OrderStatus.PENDING };

        // Act
        Action act = () => _fsm.Transition(order, OrderStatus.ACCEPTED);

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Invalid transition from PENDING to ACCEPTED");
        
        // Status should not have changed
        order.Status.Should().Be(OrderStatus.PENDING);
    }
    
    [Fact]
    public void Transition_CompleteLifecycle_ShouldSucceed()
    {
        // Arrange
        var order = new Order { Id = Guid.NewGuid(), Status = OrderStatus.PENDING };

        // Act & Assert
        _fsm.Transition(order, OrderStatus.MATCHED);
        order.Status.Should().Be(OrderStatus.MATCHED);

        _fsm.Transition(order, OrderStatus.ACCEPTED);
        order.Status.Should().Be(OrderStatus.ACCEPTED);

        _fsm.Transition(order, OrderStatus.EN_ROUTE);
        order.Status.Should().Be(OrderStatus.EN_ROUTE);

        _fsm.Transition(order, OrderStatus.ARRIVED);
        order.Status.Should().Be(OrderStatus.ARRIVED);

        _fsm.Transition(order, OrderStatus.IN_PROGRESS);
        order.Status.Should().Be(OrderStatus.IN_PROGRESS);

        _fsm.Transition(order, OrderStatus.AWAITING_CONFIRMATION);
        order.Status.Should().Be(OrderStatus.AWAITING_CONFIRMATION);

        _fsm.Transition(order, OrderStatus.COMPLETED);
        order.Status.Should().Be(OrderStatus.COMPLETED);
    }
}
