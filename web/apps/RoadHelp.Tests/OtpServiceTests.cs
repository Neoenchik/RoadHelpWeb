using System;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using RoadHelp.Api.Services;
using StackExchange.Redis;
using Xunit;

namespace RoadHelp.Tests;

public class OtpServiceTests
{
    private readonly Mock<IConnectionMultiplexer> _redisMock;
    private readonly Mock<IDatabase> _dbMock;
    private readonly OtpService _otpService;

    public OtpServiceTests()
    {
        _dbMock = new Mock<IDatabase>();
        _redisMock = new Mock<IConnectionMultiplexer>();
        _redisMock.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(_dbMock.Object);
        
        _otpService = new OtpService(_redisMock.Object);
    }

    [Fact]
    public async Task VerifyOtpAsync_CorrectOtp_ShouldReturnTrueAndClearKey()
    {
        // Arrange
        var phone = "+79991234567";
        var purpose = "login";
        var goodOtp = "4321";
        
        // Mock redis to return our OTP as stored
        _dbMock.Setup(db => db.StringGetAsync($"otp:{purpose}:{phone}", CommandFlags.None))
               .ReturnsAsync(new RedisValue(goodOtp));

        // Act
        var result = await _otpService.VerifyOtpAsync(phone, goodOtp, purpose);

        // Assert
        result.Should().BeTrue();
        _dbMock.Verify(db => db.KeyDeleteAsync($"otp:{purpose}:{phone}", CommandFlags.None), Times.Once);
    }

    [Fact]
    public async Task VerifyOtpAsync_IncorrectOtp_ShouldReturnFalseAndNotClearKey()
    {
        // Arrange
        var phone = "+79991234567";
        var purpose = "login";
        var storedOtp = "4321";
        var badOtp = "9999";
        
        _dbMock.Setup(db => db.StringGetAsync($"otp:{purpose}:{phone}", CommandFlags.None))
               .ReturnsAsync(new RedisValue(storedOtp));

        // Act
        var result = await _otpService.VerifyOtpAsync(phone, badOtp, purpose);

        // Assert
        result.Should().BeFalse();
        _dbMock.Verify(db => db.KeyDeleteAsync(It.IsAny<RedisKey>(), CommandFlags.None), Times.Never);
    }
}
