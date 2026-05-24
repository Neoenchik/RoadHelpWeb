using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using RoadHelp.Api.Enums;
using RoadHelp.Api.Models;
using RoadHelp.Api.Services;

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

        var user = new User
        {
            Id = Guid.NewGuid(),
            Role = Role.EXECUTOR,
            Phone = "+79990001122"
        };

        var service = new JwtService(cfg);
        var token = service.GenerateAccessToken(user);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        jwt.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Sub)?.Value
            .Should().Be(user.Id.ToString());
        jwt.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value
            .Should().Be(user.Id.ToString());
        jwt.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value
            .Should().Be(Role.EXECUTOR.ToString());
    }
}
