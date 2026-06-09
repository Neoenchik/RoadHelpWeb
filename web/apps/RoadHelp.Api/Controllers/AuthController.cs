using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoadHelp.Application.Dtos;
using RoadHelp.Application.Interfaces;
using RoadHelp.Domain.Entities;
using RoadHelp.Domain.Enums;
using RoadHelp.Infrastructure.Data;
using RoadHelp.Infrastructure.Services;
using RoadHelp.Api.Data;

namespace RoadHelp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IOtpService _otpService;
    private readonly IJwtService _jwtService;
    private readonly IRefreshTokenStore _refreshTokenStore;

    public AuthController(
        ApplicationDbContext db,
        IOtpService otpService,
        IJwtService jwtService,
        IRefreshTokenStore refreshTokenStore)
    {
        _db = db;
        _otpService = otpService;
        _jwtService = jwtService;
        _refreshTokenStore = refreshTokenStore;
    }

    [HttpPost("send-otp")]
    public async Task<IActionResult> SendOtp([FromBody] RequestOtpDto dto)
    {
        try
        {
            await _otpService.GenerateAndSendOtpAsync(dto.Phone, dto.Purpose);
            return Ok(new { message = "OTP sent" });
        }
        catch (OtpRateLimitException ex)
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new { message = ex.Message });
        }
    }

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

            user = new User { Phone = dto.Phone, Role = role };
            if (role == Role.EXECUTOR)
            {
                user.ExecutorProfile = new ExecutorProfile
                {
                    User = user,
                    ServiceTypes = new List<string> { "tow", "tire", "fuel", "lockout", "battery" },
                    VerificationStatus = ExecutorVerificationStatus.VERIFIED,
                    Lat = 55.7558,
                    Lng = 37.6173,
                    Rating = 5.0,
                    LocationUpdatedAt = DateTime.UtcNow,
                };
            }

            _db.Users.Add(user);
            await _db.SaveChangesAsync();
        }

        if (user.Role == Role.USER)
            await PaymentMethodsController.EnsureDemoCardAsync(_db, user.Id);

        return Ok(await IssueTokensAsync(user));
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> RefreshToken()
    {
        var refreshToken = Request.Cookies["refresh_token"];
        if (string.IsNullOrEmpty(refreshToken))
            return Unauthorized();

        var userId = await _refreshTokenStore.ValidateAsync(refreshToken);
        if (userId == null) return Unauthorized();

        var user = await _db.Users
            .Include(u => u.ExecutorProfile)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return Unauthorized();

        await _refreshTokenStore.RevokeAsync(refreshToken);
        return Ok(await IssueTokensAsync(user, includeRefreshInBody: false));
    }

    [HttpPost("redeem-invite")]
    [Authorize]
    public async Task<IActionResult> RedeemInvite([FromBody] RedeemInviteDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Token))
            return BadRequest("Token is required");

        var invite = await _db.Invites.FirstOrDefaultAsync(i => i.Token == dto.Token);
        if (invite == null || invite.UsedAt != null || invite.ExpiresAt < DateTime.UtcNow)
            return BadRequest("Invalid or expired invite");

        var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return Unauthorized();

        user.Role = invite.Role switch
        {
            InviteRole.ADMIN => Role.ADMIN,
            InviteRole.OPERATOR => Role.OPERATOR,
            _ => user.Role,
        };
        user.UpdatedAt = DateTime.UtcNow;
        invite.UsedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(await IssueTokensAsync(user));
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var refreshToken = Request.Cookies["refresh_token"];
        if (!string.IsNullOrEmpty(refreshToken))
            await _refreshTokenStore.RevokeAsync(refreshToken);

        Response.Cookies.Delete("refresh_token");
        return Ok(new { message = "Logged out" });
    }

    private async Task<object> IssueTokensAsync(User user, bool includeRefreshInBody = true)
    {
        var accessToken = _jwtService.GenerateAccessToken(user.Id, user.Role.ToString());
        var refreshToken = _jwtService.GenerateRefreshToken();

        await _refreshTokenStore.StoreAsync(refreshToken, user.Id, TimeSpan.FromDays(30));

        Response.Cookies.Append("refresh_token", refreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = false,
            SameSite = SameSiteMode.Lax,
            Expires = DateTime.UtcNow.AddDays(30)
        });

        var response = new Dictionary<string, object>
        {
            ["access_token"] = accessToken,
            ["user"] = new
            {
                id = user.Id,
                phone = user.Phone,
                email = user.Email,
                first_name = user.FirstName,
                last_name = user.LastName,
                avatar_url = user.AvatarUrl,
                role = user.Role.ToString()
            }
        };

        if (includeRefreshInBody)
            response["refresh_token"] = refreshToken;

        return response;
    }
}
