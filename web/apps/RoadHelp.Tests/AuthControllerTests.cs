using System;
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
using RoadHelp.Api.Models;
using RoadHelp.Api.Services;
using StackExchange.Redis;
using Xunit;

namespace RoadHelp.Tests;

public class AuthControllerTests
{
    private readonly ApplicationDbContext _db;
    private readonly Mock<IConnectionMultiplexer> _redisMock;
    private readonly Mock<IDatabase> _dbMock;
    private readonly IConfiguration _config;

    public AuthControllerTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: "AuthTestDb_" + Guid.NewGuid())
            .Options;
        _db = new ApplicationDbContext(options);

        _dbMock = new Mock<IDatabase>();
        _redisMock = new Mock<IConnectionMultiplexer>();
        _redisMock.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(_dbMock.Object);

        _config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = "test_secret_key_for_auth_tests_12345678",
                ["Jwt:Issuer"] = "RoadHelp.Api",
                ["Jwt:Audience"] = "RoadHelp.Clients"
            })
            .Build();
    }

    [Fact]
    public async Task VerifyOtp_NewUserWithExecutorRole_ShouldCreateUserAndProfile()
    {
        // Arrange
        var otpService = new OtpService(_redisMock.Object);
        var jwtService = new JwtService(_config);

        var storedOtp = "1234";
        _dbMock.Setup(db => db.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
               .ReturnsAsync(new RedisValue(storedOtp));

        var controller = new AuthController(_db, otpService, jwtService);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };

        var dto = new VerifyOtpDto
        {
            Phone = "+79991234567",
            Otp = storedOtp,
            Purpose = "register",
            Role = "EXECUTOR"
        };

        // Act
        var result = await controller.VerifyOtp(dto);

        // Assert
        var okResult = result as OkObjectResult;
        okResult.Should().NotBeNull();

        var user = await _db.Users.Include(u => u.ExecutorProfile).FirstOrDefaultAsync(u => u.Phone == dto.Phone);
        user.Should().NotBeNull();
        user!.Role.Should().Be(RoadHelp.Api.Enums.Role.EXECUTOR);
        user.ExecutorProfile.Should().NotBeNull();
    }

    [Fact]
    public async Task VerifyOtp_NewUserWithInvalidRole_ShouldDefaultToUser()
    {
        // Arrange
        var otpService = new OtpService(_redisMock.Object);
        var jwtService = new JwtService(_config);

        var storedOtp = "1234";
        _dbMock.Setup(db => db.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
               .ReturnsAsync(new RedisValue(storedOtp));

        var controller = new AuthController(_db, otpService, jwtService);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
        var dto = new VerifyOtpDto
        {
            Phone = "+79991234568",
            Otp = storedOtp,
            Purpose = "register",
            Role = "INVALID_ROLE"
        };

        // Act
        var result = await controller.VerifyOtp(dto);

        // Assert
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Phone == dto.Phone);
        user.Should().NotBeNull();
        user!.Role.Should().Be(RoadHelp.Api.Enums.Role.USER);
        user.ExecutorProfile.Should().BeNull();
    }

    [Fact]
    public async Task VerifyOtp_ExistingUser_ShouldReturnToken()
    {
        // Arrange
        var existingUser = new User
        {
            Phone = "+79991234569",
            Role = RoadHelp.Api.Enums.Role.USER,
            FirstName = "Test"
        };
        _db.Users.Add(existingUser);
        await _db.SaveChangesAsync();

        var otpService = new OtpService(_redisMock.Object);
        var jwtService = new JwtService(_config);

        var storedOtp = "5678";
        _dbMock.Setup(db => db.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
               .ReturnsAsync(new RedisValue(storedOtp));

        var controller = new AuthController(_db, otpService, jwtService);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
        var dto = new VerifyOtpDto
        {
            Phone = existingUser.Phone,
            Otp = storedOtp,
            Purpose = "login"
        };

        // Act
        var result = await controller.VerifyOtp(dto);

        // Assert
        var okResult = result as OkObjectResult;
        okResult.Should().NotBeNull();
    }

    [Fact]
    public async Task VerifyOtp_InvalidOtp_ShouldReturnBadRequest()
    {
        // Arrange
        var otpService = new OtpService(_redisMock.Object);
        var jwtService = new JwtService(_config);

        _dbMock.Setup(db => db.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
               .ReturnsAsync(new RedisValue("9999"));

        var controller = new AuthController(_db, otpService, jwtService);
        var dto = new VerifyOtpDto
        {
            Phone = "+79991234570",
            Otp = "1111",
            Purpose = "login"
        };

        // Act
        var result = await controller.VerifyOtp(dto);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task VerifyOtp_MissingRequiredFields_ShouldReturnBadRequest()
    {
        // Arrange
        var otpService = new OtpService(_redisMock.Object);
        var jwtService = new JwtService(_config);
        var controller = new AuthController(_db, otpService, jwtService);
        var dto = new VerifyOtpDto(); // Empty DTO

        // Act
        var result = await controller.VerifyOtp(dto);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }
}