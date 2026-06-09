using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RoadHelp.Infrastructure.Data;
using RoadHelp.Domain.Entities;
using RoadHelp.Domain.Enums;
using RoadHelp.Application.Interfaces;

namespace RoadHelp.Api.Controllers;

public class BotAuthRequest
{
    public long TelegramId { get; set; }
    public string? Phone { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Role { get; set; }
}

[ApiController]
[Route("api/bot/auth")]
public class BotAuthController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IJwtService _jwtService;
    private readonly IConfiguration _config;

    public BotAuthController(ApplicationDbContext db, IJwtService jwtService, IConfiguration config)
    {
        _db = db;
        _jwtService = jwtService;
        _config = config;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] BotAuthRequest req, [FromHeader(Name = "X-Bot-Secret")] string botSecret, CancellationToken cancellationToken)
    {
        var expectedSecret = _config["BotConfig:Secret"] ?? "super_secret_bot_key_dev";
        if (botSecret != expectedSecret)
            return Unauthorized(new { error = "Invalid bot secret" });

        if (req.TelegramId == 0)
            return BadRequest(new { error = "TelegramId is required" });

        // 1. Try to find by Telegram ID
        var user = await _db.Users
            .Include(u => u.ExecutorProfile)
            .FirstOrDefaultAsync(u => u.TelegramId == req.TelegramId, cancellationToken);

        // 2. If not found but phone is provided, try to find by phone and link
        if (user == null && !string.IsNullOrWhiteSpace(req.Phone))
        {
            user = await _db.Users
                .Include(u => u.ExecutorProfile)
                .FirstOrDefaultAsync(u => u.Phone == req.Phone, cancellationToken);

            if (user != null)
            {
                user.TelegramId = req.TelegramId;
                await _db.SaveChangesAsync(cancellationToken);
            }
        }

        // 3. If still not found, create a new user
        if (user == null)
        {
            // Security constraint: Do not allow mapping to roles like operator/admin blindly
            var assignedRole = Role.USER;
            if (req.Role?.ToUpper() == "EXECUTOR")
            {
                assignedRole = Role.EXECUTOR;
            }

            user = new User
            {
                TelegramId = req.TelegramId,
                Phone = req.Phone,
                FirstName = string.IsNullOrWhiteSpace(req.FirstName) ? "Telegram User" : req.FirstName,
                LastName = req.LastName,
                Role = assignedRole
            };

            if (assignedRole == Role.EXECUTOR)
            {
                user.ExecutorProfile = new ExecutorProfile { User = user };
            }

            _db.Users.Add(user);
            await _db.SaveChangesAsync(cancellationToken);
        }

        var accessToken = _jwtService.GenerateAccessToken(user.Id, user.Role.ToString());

        return Ok(new
        {
            access_token = accessToken,
            user = new
            {
                id = user.Id,
                telegram_id = user.TelegramId,
                phone = user.Phone,
                first_name = user.FirstName,
                role = user.Role.ToString()
            }
        });
    }
}

