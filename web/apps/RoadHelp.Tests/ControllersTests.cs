using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using RoadHelp.Api.Controllers;
using RoadHelp.Api.Data;
using RoadHelp.Api.Dtos;
using RoadHelp.Api.Enums;
using RoadHelp.Api.Models;
using RoadHelp.Api.Services;
using Xunit;

namespace RoadHelp.Tests;

public class OrdersUserControllerTests
{
    private readonly ApplicationDbContext _db;
    private readonly OrdersUserController _controller;
    private readonly User _testUser;

    public OrdersUserControllerTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: "OrdersTestDb_" + Guid.NewGuid())
            .Options;
        _db = new ApplicationDbContext(options);

        var fsm = new OrderFsm();
        _controller = new OrdersUserController(_db, fsm, null!);

        _testUser = new User
        {
            Phone = "+79991234567",
            Role = Role.USER,
            FirstName = "Test",
            LastName = "User"
        };
        _db.Users.Add(_testUser);
        _db.SaveChanges();

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, _testUser.Id.ToString()),
            new Claim(ClaimTypes.Role, Role.USER.ToString())
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);
        var httpContext = new DefaultHttpContext { User = principal };
        _controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
    }

    [Fact]
    public async Task CreateOrder_ValidDto_ShouldCreateOrder()
    {
        // Arrange
        var dto = new CreateOrderDto
        {
            Lat = 55.7558,
            Lng = 37.6176,
            Address = "Москва, ул. Ленина, 1",
            ServiceType = "tow",
            Description = "Эвакуатор нужен"
        };

        // Act
        var result = await _controller.CreateOrder(dto);

        // Assert
        var okResult = result as OkObjectResult;
        okResult.Should().NotBeNull();

        var order = await _db.Orders.FirstOrDefaultAsync(o => o.UserId == _testUser.Id);
        order.Should().NotBeNull();
        order!.ServiceType.Should().Be(ServiceType.tow);
        order.Address.Should().Be("Москва, ул. Ленина, 1");
        order.Status.Should().Be(OrderStatus.PENDING);
    }

    [Fact]
    public async Task CreateOrder_InvalidToken_ShouldReturnUnauthorized()
    {
        // Arrange
        var controller = new OrdersUserController(_db, new OrderFsm(), null!);
        var httpContext = new DefaultHttpContext { User = new ClaimsPrincipal() };
        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        var dto = new CreateOrderDto
        {
            Lat = 55.7558,
            Lng = 37.6176,
            Address = "Москва",
            ServiceType = "tow"
        };

        // Act
        var result = await controller.CreateOrder(dto);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }
}

public class UsersControllerTests
{
    private readonly ApplicationDbContext _db;
    private readonly Mock<IS3Service> _s3Mock;
    private readonly IConfiguration _config;
    private readonly UsersController _controller;
    private readonly User _testUser;
    private readonly Guid _userId;

    public UsersControllerTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: "UsersTestDb_" + Guid.NewGuid())
            .Options;
        _db = new ApplicationDbContext(options);

        _s3Mock = new Mock<IS3Service>();
        _config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = "test_secret_key_for_users_tests_12345678",
                ["Jwt:Issuer"] = "RoadHelp.Api",
                ["Jwt:Audience"] = "RoadHelp.Clients"
            })
            .Build();

        var jwtService = new JwtService(_config);
        _controller = new UsersController(_db, _s3Mock.Object, jwtService);

        _testUser = new User
        {
            Phone = "+79991234568",
            Role = Role.USER,
            FirstName = "Test",
            LastName = "User"
        };
        _db.Users.Add(_testUser);
        _db.SaveChanges();

        _userId = _testUser.Id;

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, _testUser.Id.ToString()),
            new Claim(ClaimTypes.Role, Role.USER.ToString())
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);
        var httpContext = new DefaultHttpContext { User = principal };
        _controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
    }

    [Fact]
    public async Task UpdateMe_ChangeRoleToExecutor_ShouldCreateProfile()
    {
        // Arrange
        var dto = new UpdateUserMeDto
        {
            FirstName = "Updated",
            LastName = "Name",
            Role = "EXECUTOR"
        };

        // Act
        var result = await _controller.UpdateMe(dto);

        // Assert
        var okResult = result as OkObjectResult;
        okResult.Should().NotBeNull();

        // Query fresh user from database using same context
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == _userId);
        user!.Role.Should().Be(Role.EXECUTOR);
        var profile = await _db.ExecutorProfiles.FirstOrDefaultAsync(p => p.UserId == _userId);
        profile.Should().NotBeNull();
    }

    [Fact]
    public async Task UpdateMe_InvalidToken_ShouldReturnUnauthorized()
    {
        // Arrange
        var controller = new UsersController(_db, _s3Mock.Object, new JwtService(_config));
        var httpContext = new DefaultHttpContext { User = new ClaimsPrincipal() };
        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        var dto = new UpdateUserMeDto { FirstName = "Test" };

        // Act
        var result = await controller.UpdateMe(dto);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task UpdateMe_UserNotFound_ShouldReturnNotFound()
    {
        // Arrange
        var controller = new UsersController(_db, _s3Mock.Object, new JwtService(_config));
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);
        var httpContext = new DefaultHttpContext { User = principal };
        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        var dto = new UpdateUserMeDto { FirstName = "Test" };

        // Act
        var result = await controller.UpdateMe(dto);

        // Assert
        result.Should().BeOfType<NotFoundResult>();
    }
}