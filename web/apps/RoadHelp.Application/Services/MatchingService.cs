using StackExchange.Redis;

namespace RoadHelp.Application.Services;

public class MatchingService
{
    private readonly IConnectionMultiplexer _redis;

    public MatchingService(IConnectionMultiplexer redis)
    {
        _redis = redis;
    }

    public async Task<bool> AcceptOfferAtomicAsync(Guid orderId, Guid executorId)
    {
        var db = _redis.GetDatabase();
        var lockKey = $"match:{orderId}:lock";
        var offerKey = $"offer:{orderId}";

        var lockAcquired = await db.StringSetAsync(lockKey, executorId.ToString(), TimeSpan.FromSeconds(10), When.NotExists);
        if (!lockAcquired) return false;

        try
        {
            var currentExecutor = await db.StringGetAsync(offerKey);
            if (currentExecutor != executorId.ToString()) return false;
            await db.KeyDeleteAsync(offerKey);
            return true;
        }
        finally
        {
            const string lua = @"
                if redis.call('get', KEYS[1]) == ARGV[1] then
                    return redis.call('del', KEYS[1])
                else
                    return 0
                end";
            await db.ScriptEvaluateAsync(lua, new RedisKey[] { lockKey }, new RedisValue[] { executorId.ToString() });
        }
    }
}
