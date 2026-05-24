using System;
using System.Threading.Tasks;
using StackExchange.Redis;

namespace RoadHelp.Api.Services;

// Fix B7: Atomic locks using Redis Lua or SETNX for matching
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
        var offerKey = $"offer:{orderId}"; // assuming this stores current executor_id offered

        // 1. Acquire Distributed Lock for the Order (SETNX)
        var lockAcquired = await db.StringSetAsync(lockKey, executorId.ToString(), TimeSpan.FromSeconds(10), When.NotExists);
        if (!lockAcquired) return false; // Somebody else is modifying it right now

        try
        {
            // 2. Validate it's still assigned to this executor
            var currentExecutor = await db.StringGetAsync(offerKey);
            if (currentExecutor != executorId.ToString()) return false;

            // 3. Clear from queue/offer list
            await db.KeyDeleteAsync(offerKey);
            
            // ... Logic to update Postgres DB would go here typically (Order.Status = ACCEPTED, Order.ExecutorId = executorId)
            
            return true;
        }
        finally
        {
            // 4. Release Lock safely
            // Use Lua script to safely delete only if we own the lock
            var lua = @"
                if redis.call('get', KEYS[1]) == ARGV[1] then
                    return redis.call('del', KEYS[1])
                else
                    return 0
                end";
            await db.ScriptEvaluateAsync(lua, new RedisKey[] { lockKey }, new RedisValue[] { executorId.ToString() });
        }
    }
}