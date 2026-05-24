using System;
using System.Threading.Tasks;
using StackExchange.Redis;

namespace RoadHelp.Api.Services;

public sealed class OtpRateLimitException : Exception
{
    public OtpRateLimitException(string message) : base(message) { }
}

public class OtpService
{
    private readonly IConnectionMultiplexer _redis;
    
    public OtpService(IConnectionMultiplexer redis)
    {
        _redis = redis;
    }

    public async Task<string> GenerateAndSendOtpAsync(string phone, string purpose)
    {
        var db = _redis.GetDatabase();
        var key = $"otp:{purpose}:{phone}";
        var attemptsKey = $"otp_attempts:{purpose}:{phone}";
        
        // Block if too many attempts
        var attempts = await db.StringGetAsync(attemptsKey);
        if (attempts.HasValue && (int)attempts >= 5)
        {
            throw new OtpRateLimitException("Слишком много запросов кода. Попробуйте снова через 10 минут.");
        }

        // Generate OTP (fixed to 1234 for dev if not production, but let's do random)
        var otp = new Random().Next(1000, 9999).ToString();
        
        // Save to Redis (5 mins TTL)
        await db.StringSetAsync(key, otp, TimeSpan.FromMinutes(5));
        
        // Increment attempts (10 min TTL for attempts block)
        await db.StringIncrementAsync(attemptsKey);
        await db.KeyExpireAsync(attemptsKey, TimeSpan.FromMinutes(10));

        // TODO: Send SMS via SmsProvider
        Console.WriteLine($"[SmsService Mock] Sent OTP {otp} to {phone}");

        return otp;
    }

    public async Task<bool> VerifyOtpAsync(string phone, string otp, string purpose)
    {
        var db = _redis.GetDatabase();
        var key = $"otp:{purpose}:{phone}";
        
        var storedOtp = await db.StringGetAsync(key);
        if (!storedOtp.HasValue) return false;

        if (storedOtp.ToString() == otp)
        {
            await db.KeyDeleteAsync(key); // clear after use
            await db.KeyDeleteAsync($"otp_attempts:{purpose}:{phone}");
            return true;
        }

        return false;
    }
}