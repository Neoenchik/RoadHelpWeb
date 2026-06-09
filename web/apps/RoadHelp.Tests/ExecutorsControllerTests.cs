using System;
using System.Security.Claims;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Moq;
using RoadHelp.Api.Controllers;
using RoadHelp.Api.Hubs;
using RoadHelp.Domain.Entities;
using DomainOrder = RoadHelp.Domain.Entities.Order;
using RoadHelp.Domain.Enums;
using Role = RoadHelp.Domain.Enums.Role;
using RoadHelp.Domain.Services;
using RoadHelp.Infrastructure.Data;
using StackExchange.Redis;
using Xunit;

namespace RoadHelp.Tests;

public class ExecutorsControllerTests
{
    private static Mock<IHubContext<OrdersHub>> CreateOrdersHubMock()
    {
        var hubMock = new Mock<IHubContext<OrdersHub>>();
        var clientsMock = new Mock<IHubClients>();
        var proxyMock = new Mock<IClientProxy>();
        proxyMock
            .Setup(c => c.SendCoreAsync(It.IsAny<string>(), It.IsAny<object?[]>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        clientsMock.Setup(c => c.Group(It.IsAny<string>())).Returns(proxyMock.Object);
        hubMock.Setup(h => h.Clients).Returns(clientsMock.Object);
        return hubMock;
    }

    private static Mock<IConnectionMultiplexer> CreateRedisMock()
    {
        var dbMock = new Mock<IDatabase>();
        dbMock.Setup(d => d.SetMembersAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(Array.Empty<RedisValue>());
        dbMock.Setup(d => d.SetAddAsync(It.IsAny<RedisKey>(), It.IsAny<RedisValue>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(true);
        dbMock.Setup(d => d.KeyExpireAsync(It.IsAny<RedisKey>(), It.IsAny<TimeSpan?>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(true);

        var redisMock = new Mock<IConnectionMultiplexer>();
        redisMock.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(dbMock.Object);
        return redisMock;
    }

    private static ApplicationDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase("ExecTests_" + Guid.NewGuid())
            .Options;
        return new ApplicationDbContext(options);
    }

    private static ExecutorsController CreateController(ApplicationDbContext db, Guid executorId)
    {
        var controller = new ExecutorsController(
            db,
            Mock.Of<RoadHelp.Application.Interfaces.IS3Service>(),
            new OrderFsm(),
            CreateOrdersHubMock().Object,
            CreateRedisMock().Object);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, executorId.ToString()),
                    new Claim(ClaimTypes.Role, "EXECUTOR"),
                }, "test")),
            },
        };

        return controller;
    }

    [Fact]
    public async Task AcceptOrder_FromPending_AssignsExecutorAndReturnsOrder()
    {
        await using var db = CreateDb();
        var client = new User { Phone = "+79071111111", Role = Role.USER };
        var executor = new User { Phone = "+79072222222", Role = Role.EXECUTOR, FirstName = "Exec" };
        db.Users.AddRange(client, executor);
        await db.SaveChangesAsync();

        db.ExecutorProfiles.Add(new ExecutorProfile
        {
            UserId = executor.Id,
            OnlineStatus = ExecutorOnlineStatus.ONLINE,
            ServiceTypes = new() { "tow" },
        });

        var order = new DomainOrder
        {
            UserId = client.Id,
            ServiceType = ServiceType.tow,
            Status = OrderStatus.PENDING,
            Address = "Москва",
            Lat = 55.75,
            Lng = 37.61,
            CreatedAt = DateTime.UtcNow,
            EstimatedPrice = 1500,
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync();

        var controller = CreateController(db, executor.Id);
        var result = await controller.AcceptOrder(order.Id);

        result.Should().BeOfType<OkObjectResult>();
        await db.Entry(order).ReloadAsync();
        order.ExecutorId.Should().Be(executor.Id);
        order.Status.Should().Be(OrderStatus.ACCEPTED);
    }

    [Fact]
    public async Task CompleteOrder_FromInProgress_GoesToAwaitingConfirmation()
    {
        await using var db = CreateDb();
        var client = new User { Phone = "+79073333333", Role = Role.USER };
        var executor = new User { Phone = "+79074444444", Role = Role.EXECUTOR };
        db.Users.AddRange(client, executor);
        await db.SaveChangesAsync();

        var order = new DomainOrder
        {
            UserId = client.Id,
            ExecutorId = executor.Id,
            ServiceType = ServiceType.tow,
            Status = OrderStatus.IN_PROGRESS,
            Address = "Москва",
            Lat = 55.75,
            Lng = 37.61,
            CreatedAt = DateTime.UtcNow,
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync();

        var controller = CreateController(db, executor.Id);
        var result = await controller.CompleteOrder(order.Id);

        result.Should().BeOfType<OkObjectResult>();
        await db.Entry(order).ReloadAsync();
        order.Status.Should().Be(OrderStatus.AWAITING_CONFIRMATION);
    }

    [Fact]
    public async Task GetIncomingOrder_ReturnsPendingOrderForOnlineExecutor()
    {
        await using var db = CreateDb();
        var client = new User { Phone = "+79075555555", Role = Role.USER };
        var executor = new User { Phone = "+79076666666", Role = Role.EXECUTOR };
        db.Users.AddRange(client, executor);
        await db.SaveChangesAsync();

        db.ExecutorProfiles.Add(new ExecutorProfile
        {
            UserId = executor.Id,
            OnlineStatus = ExecutorOnlineStatus.ONLINE,
            ServiceTypes = new() { "tow" },
        });

        db.Orders.Add(new DomainOrder
        {
            UserId = client.Id,
            ServiceType = ServiceType.tow,
            Status = OrderStatus.PENDING,
            Address = "Москва",
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        var controller = CreateController(db, executor.Id);
        var result = await controller.GetIncomingOrder();

        result.Should().BeOfType<OkObjectResult>();
        var ok = (OkObjectResult)result;
        ok.Value.Should().NotBeNull();
    }
}
