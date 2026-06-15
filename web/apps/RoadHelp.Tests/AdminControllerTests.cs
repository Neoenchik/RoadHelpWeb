using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RoadHelp.Api.Controllers;
using RoadHelp.Domain.Entities;
using RoadHelp.Domain.Enums;
using RoadHelp.Infrastructure.Data;
using Xunit;

namespace RoadHelp.Tests;

public class AdminControllerTests
{
    private static AdminController CreateController(ApplicationDbContext db)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["App:BaseUrl"] = "http://localhost:3000" })
            .Build();
        var controller = new AdminController(db, config);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext
            {
                User = new System.Security.Claims.ClaimsPrincipal(
                    new System.Security.Claims.ClaimsIdentity(new[]
                    {
                        new System.Security.Claims.Claim(
                            System.Security.Claims.ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
                        new System.Security.Claims.Claim(
                            System.Security.Claims.ClaimTypes.Role, "ADMIN")
                    }))
            }
        };
        return controller;
    }

    [Fact]
    public async Task GetDashboard_ShouldReturnAggregates()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase("AdminDash_" + Guid.NewGuid())
            .Options;
        await using var db = new ApplicationDbContext(options);

        var user = new User { Phone = "+79070000001", FirstName = "U", Role = Role.USER };
        db.Users.Add(user);
        db.ExecutorProfiles.Add(new ExecutorProfile
        {
            User = new User { Phone = "+79070000002", FirstName = "E", Role = Role.EXECUTOR },
            VerificationStatus = ExecutorVerificationStatus.PENDING,
            OnlineStatus = ExecutorOnlineStatus.ONLINE
        });
        db.Orders.Add(new Order
        {
            User = user,
            ServiceType = ServiceType.tow,
            Status = OrderStatus.PENDING,
            Lat = 1, Lng = 1, Address = "A",
            EstimatedPrice = 1000
        });
        await db.SaveChangesAsync();

        var controller = CreateController(db);
        var result = await controller.GetDashboard();

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().NotBeNull();
    }

    [Fact]
    public async Task GetOrder_ShouldIncludeStatusLog()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase("AdminOrder_" + Guid.NewGuid())
            .Options;
        await using var db = new ApplicationDbContext(options);

        var order = new Order
        {
            User = new User { Phone = "+79070000003", FirstName = "C", Role = Role.USER },
            ServiceType = ServiceType.tow,
            Status = OrderStatus.COMPLETED,
            Lat = 55, Lng = 37, Address = "Moscow",
            EstimatedPrice = 2000,
            FinalPrice = 2500
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync();

        db.StatusChangeLogs.Add(new StatusChangeLog
        {
            TargetType = StatusChangeTargetType.order,
            TargetId = order.Id,
            OldStatus = "PENDING",
            NewStatus = "COMPLETED",
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var controller = CreateController(db);
        var result = await controller.GetOrder(order.Id);

        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task RevokeInvite_ShouldRemoveUnusedInvite()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase("AdminInvite_" + Guid.NewGuid())
            .Options;
        await using var db = new ApplicationDbContext(options);

        var invite = new Invite
        {
            Email = "test@example.com",
            Role = InviteRole.OPERATOR,
            Token = "abc",
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };
        db.Invites.Add(invite);
        await db.SaveChangesAsync();

        var controller = CreateController(db);
        var result = await controller.RevokeInvite(invite.Id);

        result.Should().BeOfType<OkObjectResult>();
        (await db.Invites.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Broadcast_EmptyMessage_ShouldReturnBadRequest()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase("AdminBc_" + Guid.NewGuid())
            .Options;
        await using var db = new ApplicationDbContext(options);

        var controller = CreateController(db);
        var result = await controller.Broadcast(new RoadHelp.Application.Dtos.BroadcastDto("Test", "   "));

        result.Should().BeOfType<BadRequestObjectResult>();
    }
}
