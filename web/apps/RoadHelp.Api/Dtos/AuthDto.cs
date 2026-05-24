using System.ComponentModel.DataAnnotations;

namespace RoadHelp.Api.Dtos;

/// <summary>
/// DTO для запроса OTP по номеру телефона.
/// </summary>
public class RequestOtpDto
{
    /// <summary>Номер телефона в международном формате</summary>
    [Required]
    public string Phone { get; set; } = string.Empty;
    /// <summary>Цель запроса: "login" или "register"</summary>
    [Required]
    public string Purpose { get; set; } = "login"; // "login" or "register"
}

/// <summary>
/// DTO для проверки OTP и получения токенов.
/// </summary>
public class VerifyOtpDto
{
    /// <summary>Номер телефона</summary>
    [Required]
    public string Phone { get; set; } = string.Empty;
    /// <summary>Код OTP, присланный пользователю</summary>
    [Required]
    public string Otp { get; set; } = string.Empty;
    /// <summary>Цель: "login" или "register"</summary>
    [Required]
    public string Purpose { get; set; } = "login";
    /// <summary>Роль, на которую регистрируется пользователь (опционально)</summary>
    public string? Role { get; set; } = "USER";
}

/// <summary>
/// DTO ответа аутентификации: access и refresh токены.
/// </summary>
public class AuthResponseDto
{
    /// <summary>JWT access token</summary>
    public string AccessToken { get; set; } = string.Empty;
    /// <summary>Refresh token для получения нового access token</summary>
    public string RefreshToken { get; set; } = string.Empty;
}