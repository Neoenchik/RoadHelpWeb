using System.ComponentModel.DataAnnotations;

namespace RoadHelp.Application.Dtos;

public class RequestOtpDto
{
    [Required]
    public string Phone { get; set; } = string.Empty;
    [Required]
    public string Purpose { get; set; } = "login";
}

public class VerifyOtpDto
{
    [Required]
    public string Phone { get; set; } = string.Empty;
    [Required]
    public string Otp { get; set; } = string.Empty;
    [Required]
    public string Purpose { get; set; } = "login";
    public string? Role { get; set; } = "USER";
}

public class AuthResponseDto
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
}

public class RedeemInviteDto
{
    [Required]
    public string Token { get; set; } = string.Empty;
}
