using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using RoadHelp.Api.Controllers;
using RoadHelp.Application.Dtos;
using RoadHelp.Application.Interfaces;
using RoadHelp.Domain.Entities;
using RoadHelp.Domain.Enums;
using RoadHelp.Infrastructure.Data;
using RoadHelp.Infrastructure.Services;
using StackExchange.Redis;
using Xunit;

namespace RoadHelp.Tests;

public class AuthControllerTests
{
    private readonly ApplicationDbContext _db;
    private readonly Mock<IConnectionMultiplexer> _redisMock;
    private readonly Mock<IDatabase> _dbMock;
    private readonly IConfiguration _config;
    private readonly RefreshTokenStore _refreshTokenStore;

    public AuthControllerTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: "AuthTestDb_" + Guid.NewGuid())
            .Options;
        _db = new ApplicationDbContext(options);

        _dbMock = new Mock<IDatabase>();
        _redisMock = new Mock<IConnectionMultiplexer>();
        _redisMock.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(_dbMock.Object);
        _refreshTokenStore = new RefreshTokenStore(_redisMock.Object);

        _config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = "test_secret_key_for_auth_tests_12345678",
                ["Jwt:Issuer"] = "RoadHelp.Api",
                ["Jwt:Audience"] = "RoadHelp.Clients"
            })
            .Build();
    }

    private AuthController CreateController()
    {
        var controller = new AuthController(
            _db,
            new OtpService(_redisMock.Object),
            new JwtService(_config),
            _refreshTokenStore);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
        return controller;
    }

    [Fact]
    public async Task VerifyOtp_NewUserWithExecutorRole_ShouldCreateUserAndProfile()
    {
        var storedOtp = "1234";
        _dbMock.Setup(db => db.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
               .ReturnsAsync(new RedisValue(storedOtp));
        _dbMock.Setup(db => db.StringSetAsync(It.IsAny<RedisKey>(), It.IsAny<RedisValue>(), It.IsAny<TimeSpan?>(), It.IsAny<bool>(), It.IsAny<When>(), It.IsAny<CommandFlags>()))
               .ReturnsAsync(true);

        var controller = CreateController();
        var dto = new VerifyOtpDto
        {
            Phone = "+79991234567",
            Otp = storedOtp,
            Purpose = "register",
            Role = "EXECUTOR"
        };

        var result = await controller.VerifyOtp(dto);

        var okResult = result as OkObjectResult;
        okResult.Should().NotBeNull();

        var user = await _db.Users.Include(u => u.ExecutorProfile).FirstOrDefaultAsync(u => u.Phone == dto.Phone);
        user.Should().NotBeNull();
        user!.Role.Should().Be(Domain.Enums.Role.EXECUTOR);
        user.ExecutorProfile.Should().NotBeNull();
    }

    [Fact]
    public async Task VerifyOtp_NewUserWithInvalidRole_ShouldDefaultToUser()
    {
        var storedOtp = "1234";
        _dbMock.Setup(db => db.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
               .ReturnsAsync(new RedisValue(storedOtp));
        _dbMock.Setup(db => db.StringSetAsync(It.IsAny<RedisKey>(), It.IsAny<RedisValue>(), It.IsAny<TimeSpan?>(), It.IsAny<bool>(), It.IsAny<When>(), It.IsAny<CommandFlags>()))
               .ReturnsAsync(true);

        var controller = CreateController();
        var dto = new VerifyOtpDto
        {
            Phone = "+79991234568",
            Otp = storedOtp,
            Purpose = "register",
            Role = "INVALID_ROLE"
        };

        await controller.VerifyOtp(dto);

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Phone == dto.Phone);
        user.Should().NotBeNull();
        user!.Role.Should().Be(Domain.Enums.Role.USER);
        user.ExecutorProfile.Should().BeNull();
    }

    [Fact]
    public async Task VerifyOtp_ExistingUser_ShouldReturnToken()
    {
        var existingUser = new User
        {
            Phone = "+79991234569",
            Role = Domain.Enums.Role.USER,
            FirstName = "Test"
        };
        _db.Users.Add(existingUser);
        await _db.SaveChangesAsync();

        var storedOtp = "5678";
        _dbMock.Setup(db => db.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
               .ReturnsAsync(new RedisValue(storedOtp));
        _dbMock.Setup(db => db.StringSetAsync(It.IsAny<RedisKey>(), It.IsAny<RedisValue>(), It.IsAny<TimeSpan?>(), It.IsAny<bool>(), It.IsAny<When>(), It.IsAny<CommandFlags>()))
               .ReturnsAsync(true);

        var controller = CreateController();
        var dto = new VerifyOtpDto
        {
            Phone = existingUser.Phone,
            Otp = storedOtp,
            Purpose = "login"
        };

        var result = await controller.VerifyOtp(dto);
        var okResult = result as OkObjectResult;
        okResult.Should().NotBeNull();
    }

    [Fact]
    public async Task VerifyOtp_InvalidOtp_ShouldReturnBadRequest()
    {
        _dbMock.Setup(db => db.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
               .ReturnsAsync(new RedisValue("9999"));

        var controller = CreateController();
        var dto = new VerifyOtpDto
        {
            Phone = "+79991234570",
            Otp = "1111",
            Purpose = "login"
        };

        var result = await controller.VerifyOtp(dto);
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task VerifyOtp_MissingRequiredFields_ShouldReturnBadRequest()
    {
        var controller = CreateController();
        var dto = new VerifyOtpDto();

        var result = await controller.VerifyOtp(dto);
        result.Should().BeOfType<BadRequestObjectResult>();
    }
}
