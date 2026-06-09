using RoadHelp.Application.Interfaces;
using StackExchange.Redis;

namespace RoadHelp.Infrastructure.Services;

public class RefreshTokenStore : IRefreshTokenStore
{
    private readonly IConnectionMultiplexer _redis;

    public RefreshTokenStore(IConnectionMultiplexer redis)
    {
        _redis = redis;
    }

    public async Task StoreAsync(string refreshToken, Guid userId, TimeSpan ttl)
    {
        var db = _redis.GetDatabase();
        await db.StringSetAsync($"refresh:{refreshToken}", userId.ToString(), ttl);
    }

    public async Task<Guid?> ValidateAsync(string refreshToken)
    {
        var db = _redis.GetDatabase();
        var value = await db.StringGetAsync($"refresh:{refreshToken}");
        if (!value.HasValue) return null;
        return Guid.TryParse(value.ToString(), out var userId) ? userId : null;
    }

    public async Task RevokeAsync(string refreshToken)
    {
        var db = _redis.GetDatabase();
        await db.KeyDeleteAsync($"refresh:{refreshToken}");
    }
}
