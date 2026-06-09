using System.Threading.Tasks;

namespace RoadHelp.Application.Interfaces;

public interface IOtpService
{
    Task<string> GenerateAndSendOtpAsync(string phone, string purpose);
    Task<bool> VerifyOtpAsync(string phone, string otp, string purpose);
}
