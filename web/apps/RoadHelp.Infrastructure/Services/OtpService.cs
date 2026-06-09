using RoadHelp.Application.Interfaces;
using StackExchange.Redis;

namespace RoadHelp.Infrastructure.Services;

public sealed class OtpRateLimitException : Exception
{
    public OtpRateLimitException(string message) : base(message) { }
}

public class OtpService : IOtpService
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

        var attempts = await db.StringGetAsync(attemptsKey);
        if (attempts.HasValue && (int)attempts >= 5)
        {
            throw new OtpRateLimitException("Too many OTP requests. Try again in 10 minutes.");
        }

        var otp = Environment.GetEnvironmentVariable("OTP_DEV_CODE") ?? "1234";

        await db.StringSetAsync(key, otp, TimeSpan.FromMinutes(5));
        await db.StringIncrementAsync(attemptsKey);
        await db.KeyExpireAsync(attemptsKey, TimeSpan.FromMinutes(10));

        Console.WriteLine($"[SmsService Mock] Sent OTP to {phone}");
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
            await db.KeyDeleteAsync(key);
            await db.KeyDeleteAsync($"otp_attempts:{purpose}:{phone}");
            return true;
        }

        return false;
    }
}
