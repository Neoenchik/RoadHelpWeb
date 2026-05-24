using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoadHelp.Api.Data;
using RoadHelp.Api.Dtos;
using RoadHelp.Api.Models;
using RoadHelp.Api.Enums;
using RoadHelp.Api.Services;

namespace RoadHelp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly OtpService _otpService;
    private readonly JwtService _jwtService;

    public AuthController(ApplicationDbContext db, OtpService otpService, JwtService jwtService)
    {
        _db = db;
        _otpService = otpService;
        _jwtService = jwtService;
    }

    /// <summary>
    /// Отправка OTP кода для аутентификации (вход или регистрация).
    /// </summary>
    /// <param name="dto">Телефон и цель (например: register, login)</param>
    /// <returns>Статус отправки кода</returns>
    [HttpPost("send-otp")]
    public async Task<IActionResult> SendOtp([FromBody] RequestOtpDto dto)
    {
        try
        {
            await _otpService.GenerateAndSendOtpAsync(dto.Phone, dto.Purpose);
            // OTP logic (mock) sends sms
            return Ok(new { message = "OTP sent" });
        }
        catch (OtpRateLimitException ex)
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Подтверждение OTP кода. Возвращает JWT токен и устанавливает HttpOnly cookie с Refresh токеном.
    /// Если цель register и пользователя нет - в БД будет создана новая учетная запись выбранной роли.
    /// </summary>
    /// <param name="dto">Номер телефона, OTP код и желаемая роль</param>
    /// <returns>Access и Refresh токены</returns>
    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Phone) || string.IsNullOrWhiteSpace(dto.Otp) || string.IsNullOrWhiteSpace(dto.Purpose))
            return BadRequest("Phone, Otp and Purpose are required");

        var isValid = await _otpService.VerifyOtpAsync(dto.Phone, dto.Otp, dto.Purpose);
        if (!isValid) return BadRequest("Invalid or expired OTP");

        var user = await _db.Users
            .Include(u => u.ExecutorProfile)
            .FirstOrDefaultAsync(u => u.Phone == dto.Phone);

        if (user == null)
        {
            if (!Enum.TryParse<Role>(dto.Role, out var role))
                role = Role.USER;
            user = new User
            {
                Phone = dto.Phone,
                Role = role
            };

            if (role == Role.EXECUTOR)
            {
                user.ExecutorProfile = new ExecutorProfile { User = user };
            }

            _db.Users.Add(user);
            await _db.SaveChangesAsync();
        }

        var accessToken = _jwtService.GenerateAccessToken(user);
        var refreshToken = _jwtService.GenerateRefreshToken();
        
        // Add refresh token to HttpOnly cookie
        Response.Cookies.Append("refresh_token", refreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true, // Ensure HTTPS in prod
            SameSite = SameSiteMode.Lax,
            Expires = DateTime.UtcNow.AddDays(30)
        });

        return Ok(new
        {
            access_token = accessToken,
            refresh_token = refreshToken,
            user = new
            {
                id = user.Id,
                phone = user.Phone,
                email = user.Email,
                first_name = user.FirstName,
                last_name = user.LastName,
                avatar_url = user.AvatarUrl,
                role = user.Role.ToString()
            },
            accessToken,
            refreshToken
        });
    }
}