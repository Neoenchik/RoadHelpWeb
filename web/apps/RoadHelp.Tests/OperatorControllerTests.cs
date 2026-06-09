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

public class OperatorControllerTests
{
    [Fact]
    public async Task GetMetrics_ShouldReturnCounts()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase("OpTest_" + Guid.NewGuid())
            .Options;
        await using var db = new ApplicationDbContext(options);

        db.Orders.Add(new Order
        {
            User = new User { Phone = "+79070000001" },
            ServiceType = ServiceType.tow,
            Status = OrderStatus.PENDING,
            Lat = 1, Lng = 1, Address = "A"
        });
        await db.SaveChangesAsync();

        var config = new ConfigurationBuilder().Build();
        var controller = new OperatorController(db);
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
                            System.Security.Claims.ClaimTypes.Role, "OPERATOR")
                    }))
            }
        };

        var result = await controller.GetMetrics();
        result.Should().BeOfType<OkObjectResult>();
    }
}
