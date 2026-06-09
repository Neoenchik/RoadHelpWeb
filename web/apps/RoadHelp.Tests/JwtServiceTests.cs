using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Moq;
using RoadHelp.Application.Interfaces;
using RoadHelp.Domain.Enums;
using RoadHelp.Infrastructure.Services;
using StackExchange.Redis;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Xunit;

namespace RoadHelp.Tests;

public class JwtServiceTests
{
    [Fact]
    public void GenerateAccessToken_ShouldContainSubNameIdentifierAndRoleClaims()
    {
        var cfg = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = "super_secret_key_for_tests_only_1234567890",
                ["Jwt:Issuer"] = "RoadHelp.Api",
                ["Jwt:Audience"] = "RoadHelp.Clients"
            })
            .Build();

        var userId = Guid.NewGuid();
        var service = new JwtService(cfg);
        var token = service.GenerateAccessToken(userId, Domain.Enums.Role.EXECUTOR.ToString());

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        jwt.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Sub)?.Value
            .Should().Be(userId.ToString());
        jwt.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value
            .Should().Be(userId.ToString());
        jwt.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value
            .Should().Be(Domain.Enums.Role.EXECUTOR.ToString());
    }
}
