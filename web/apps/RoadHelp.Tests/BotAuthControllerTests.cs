using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Moq;
using RoadHelp.Api;
using RoadHelp.Infrastructure.Data;
using StackExchange.Redis;
using Xunit;

namespace RoadHelp.Tests;

public class BotAuthControllerTests : IClassFixture<WebApplicationFactory<Startup>>
{
    private readonly WebApplicationFactory<Startup> _factory;

    public BotAuthControllerTests(WebApplicationFactory<Startup> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Jwt:Secret"] = "test_secret_key_for_integration_tests_1234567890",
                    ["Jwt:Issuer"] = "RoadHelp",
                    ["Jwt:Audience"] = "RoadHelpFront",
                    ["BotConfig:Secret"] = "super_secret_bot_key_dev",
                    ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Database=test;Username=test;Password=test",
                    ["Redis:ConnectionString"] = "localhost:6379"
                });
            });

            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
                if (descriptor != null) services.Remove(descriptor);

                services.AddDbContext<ApplicationDbContext>(options =>
                    options.UseInMemoryDatabase("TestDb_BotAuth"));

                var redisDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IConnectionMultiplexer));
                if (redisDescriptor != null) services.Remove(redisDescriptor);

                var redisMock = new Mock<IConnectionMultiplexer>();
                var dbMock = new Mock<IDatabase>();
                redisMock.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(dbMock.Object);
                services.AddSingleton(redisMock.Object);
            });
        });
    }

    [Fact]
    public async Task Login_ShouldCreateNewUser_WhenTelegramIdIsNew_AndSecretIsValid()
    {
        var client = _factory.CreateClient();
        var request = new { TelegramId = 123456789L, FirstName = "Test Bot User", Role = "USER" };

        var reqMessage = new HttpRequestMessage(HttpMethod.Post, "/api/bot/auth/login");
        reqMessage.Headers.Add("X-Bot-Secret", "super_secret_bot_key_dev");
        reqMessage.Content = JsonContent.Create(request);

        var response = await client.SendAsync(reqMessage);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadFromJsonAsync<BotAuthResponse>();

        content.Should().NotBeNull();
        content!.access_token.Should().NotBeNullOrEmpty();
        content.user.telegram_id.Should().Be(123456789);
        content.user.first_name.Should().Be("Test Bot User");
    }

    [Fact]
    public async Task Login_ShouldDenyAccess_WhenSecretIsInvalid()
    {
        var client = _factory.CreateClient();
        var request = new { TelegramId = 123L };

        var reqMessage = new HttpRequestMessage(HttpMethod.Post, "/api/bot/auth/login");
        reqMessage.Headers.Add("X-Bot-Secret", "INVALID_SECRET");
        reqMessage.Content = JsonContent.Create(request);

        var response = await client.SendAsync(reqMessage);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_ShouldDefaultToUserRole_EvenIfAdminRequested()
    {
        var client = _factory.CreateClient();
        var request = new { TelegramId = 987654L, Role = "ADMIN" };

        var reqMessage = new HttpRequestMessage(HttpMethod.Post, "/api/bot/auth/login");
        reqMessage.Headers.Add("X-Bot-Secret", "super_secret_bot_key_dev");
        reqMessage.Content = JsonContent.Create(request);

        var response = await client.SendAsync(reqMessage);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadFromJsonAsync<BotAuthResponse>();
        content!.user.role.Should().Be("USER");
    }

    private class BotAuthResponse
    {
        public string access_token { get; set; } = string.Empty;
        public UserResponse user { get; set; } = new();
    }

    private class UserResponse
    {
        public Guid id { get; set; }
        public long telegram_id { get; set; }
        public string first_name { get; set; } = string.Empty;
        public string role { get; set; } = string.Empty;
    }
}
