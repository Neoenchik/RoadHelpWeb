using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using RoadHelp.Api.Controllers;
using RoadHelp.Application.Interfaces;
using RoadHelp.Domain.Entities;
using RoadHelp.Domain.Enums;
using RoadHelp.Domain.Services;
using RoadHelp.Infrastructure.Data;
using RoadHelp.Infrastructure.Payment;
using Xunit;

namespace RoadHelp.Tests;

public class PaymentControllerTests
{
    [Fact]
    public async Task PayOrder_WithDefaultCard_ShouldCompleteOrder()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase("PayTest_" + Guid.NewGuid())
            .Options;
        await using var db = new ApplicationDbContext(options);

        var user = new User { Phone = "+79071111111", Role = Role.USER };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        db.PaymentMethods.Add(new PaymentMethod
        {
            UserId = user.Id,
            Type = PaymentMethodType.card,
            Last4 = "4242",
            IsDefault = true,
            ProviderToken = "tok_test"
        });

        var order = new Order
        {
            UserId = user.Id,
            ServiceType = ServiceType.tow,
            Status = OrderStatus.AWAITING_CONFIRMATION,
            Lat = 55.75,
            Lng = 37.61,
            Address = "Test",
            FinalPrice = 1500
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync();

        var controller = new PaymentController(db, new MockPaymentProvider(), new OrderFsm());
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext
            {
                User = new System.Security.Claims.ClaimsPrincipal(
                    new System.Security.Claims.ClaimsIdentity(new[]
                    {
                        new System.Security.Claims.Claim(
                            System.Security.Claims.ClaimTypes.NameIdentifier, user.Id.ToString())
                    }))
            }
        };

        var result = await controller.PayOrder(order.Id);
        result.Should().BeOfType<OkObjectResult>();

        var updated = await db.Orders.FindAsync(order.Id);
        updated!.Status.Should().Be(OrderStatus.COMPLETED);
    }
}
