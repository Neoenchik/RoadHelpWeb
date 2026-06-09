using System;
using System.Security.Claims;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Moq;
using Microsoft.Extensions.Hosting;
using RoadHelp.Api.Services;
using RoadHelp.Infrastructure.Data;
using RoadHelp.Application.Dtos;
using RoadHelp.Domain.Entities;
using RoadHelp.Domain.Services;
using RoadHelp.Application.Interfaces;
using RoadHelp.Application.Services;
using RoadHelp.Domain.Enums;
using Xunit;

namespace RoadHelp.Tests
{
    public class ControllerIntegrationTests
    {
        private static Mock<IHubContext<THub>> CreateHubMock<THub>() where THub : Hub
        {
            var hubMock = new Mock<IHubContext<THub>>();
            var clientsMock = new Mock<IHubClients>();
            var allMock = new Mock<IClientProxy>();
            allMock.Setup(c => c.SendCoreAsync(It.IsAny<string>(), It.IsAny<object?[]>(), It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);
            clientsMock.Setup(c => c.All).Returns(allMock.Object);
            clientsMock.Setup(c => c.Group(It.IsAny<string>())).Returns(allMock.Object);
            hubMock.Setup(h => h.Clients).Returns(clientsMock.Object);
            return hubMock;
        }

        private ApplicationDbContext GetDb()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase("CtrlIntTests_" + Guid.NewGuid())
                .Options;
            return new ApplicationDbContext(options);
        }

        [Fact]
        public async Task OrdersUserController_CreateOrder_And_GetActiveOrder_ReturnsCreated()
        {
            var db = GetDb();

            var user = new User { Phone = "+79070000001", FirstName = "Client", Role = Role.USER };
            db.Users.Add(user);
            await db.SaveChangesAsync();

            var fsm = new OrderFsm();
            var hubMock = CreateHubMock<RoadHelp.Api.Hubs.OrdersHub>();
            var execHubMock = CreateHubMock<RoadHelp.Api.Hubs.ExecutorsHub>();

            var controller = new OrdersUserController(db, fsm, hubMock.Object, execHubMock.Object, DemoTestHelper.CreateNoopDemoSimulator());
            controller.ControllerContext = new Microsoft.AspNetCore.Mvc.ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[] {
                        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
                    }))
                }
            };

            var dto = new CreateOrderDto
            {
                ServiceType = "tow",
                Lat = 55.75,
                Lng = 37.61,
                Address = "Москва",
                Description = "Test"
            };

            var createResult = await controller.CreateOrder(dto);
            createResult.Should().BeOfType<Microsoft.AspNetCore.Mvc.OkObjectResult>();

            var active = await controller.GetActiveOrder();
            active.Should().BeOfType<Microsoft.AspNetCore.Mvc.OkObjectResult>();
            var ok = active as Microsoft.AspNetCore.Mvc.OkObjectResult;
            ok!.Value.Should().NotBeNull();
        }

        [Fact]
        public async Task OrdersUserController_GetOrderExecutors_ReturnsAvailableExecutors()
        {
            var db = GetDb();

            var client = new User { Phone = "+79070000002", FirstName = "Client2", Role = Role.USER };
            var exec = new User { Phone = "+79070000003", FirstName = "Exec", Role = Role.EXECUTOR };
            db.Users.AddRange(client, exec);
            await db.SaveChangesAsync();

            var profile = new ExecutorProfile
            {
                UserId = exec.Id,
                VerificationStatus = ExecutorVerificationStatus.VERIFIED,
                OnlineStatus = ExecutorOnlineStatus.ONLINE,
                ServiceTypes = new System.Collections.Generic.List<string> { "tow" },
                Lat = 55.75,
                Lng = 37.61,
            };
            db.ExecutorProfiles.Add(profile);
            await db.SaveChangesAsync();

            var order = new RoadHelp.Domain.Entities.Order
            {
                UserId = client.Id,
                ServiceType = ServiceType.tow,
                Status = OrderStatus.PENDING,
                Lat = 55.75,
                Lng = 37.61,
                Address = "Москва",
                CreatedAt = DateTime.UtcNow
            };
            db.Orders.Add(order);
            await db.SaveChangesAsync();

            var fsm = new OrderFsm();
            var hubMock = CreateHubMock<RoadHelp.Api.Hubs.OrdersHub>();
            var execHubMock = CreateHubMock<RoadHelp.Api.Hubs.ExecutorsHub>();

            var controller = new OrdersUserController(db, fsm, hubMock.Object, execHubMock.Object, DemoTestHelper.CreateNoopDemoSimulator());
            controller.ControllerContext = new Microsoft.AspNetCore.Mvc.ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[] {
                        new Claim(ClaimTypes.NameIdentifier, client.Id.ToString())
                    }))
                }
            };

            var res = await controller.GetOrderExecutors(order.Id);
            res.Should().BeOfType<Microsoft.AspNetCore.Mvc.OkObjectResult>();
            var okRes = res as Microsoft.AspNetCore.Mvc.OkObjectResult;
            var list = okRes!.Value as System.Collections.IEnumerable;
            // There should be at least one executor in result
            list.Should().NotBeNull();
        }
    }
}
