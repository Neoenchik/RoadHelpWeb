using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoadHelp.Application.Dtos;
using RoadHelp.Domain.Entities;
using RoadHelp.Infrastructure.Data;

namespace RoadHelp.Api.Controllers;

[ApiController]
[Route("api/push")]
[Authorize]
public class PushController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public PushController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe([FromBody] PushSubscribeDto dto)
    {
        var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);

        var existing = await _db.PushSubscriptions
            .FirstOrDefaultAsync(p => p.UserId == userId && p.Endpoint == dto.Endpoint);

        if (existing != null)
        {
            existing.P256dh = dto.Keys.P256dh;
            existing.Auth = dto.Keys.Auth;
        }
        else
        {
            _db.PushSubscriptions.Add(new PushSubscription
            {
                UserId = userId,
                Endpoint = dto.Endpoint,
                P256dh = dto.Keys.P256dh,
                Auth = dto.Keys.Auth
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { subscribed = true });
    }
}
