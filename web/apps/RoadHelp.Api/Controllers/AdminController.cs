using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoadHelp.Application.Dtos;
using RoadHelp.Domain.Entities;
using RoadHelp.Domain.Enums;
using RoadHelp.Infrastructure.Data;

namespace RoadHelp.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "ADMIN,OPERATOR")]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _config;

    public AdminController(ApplicationDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    [HttpGet("executors")]
    public async Task<IActionResult> GetExecutors(
        [FromQuery] string? verification_status = null,
        [FromQuery] string? q = null)
    {
        var query = _db.ExecutorProfiles
            .Include(ep => ep.User)
            .AsQueryable();

        if (!string.IsNullOrEmpty(verification_status) &&
            Enum.TryParse<ExecutorVerificationStatus>(verification_status, out var vs))
        {
            query = query.Where(ep => ep.VerificationStatus == vs);
        }

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.ToLower();
            query = query.Where(ep =>
                ep.User.FirstName.ToLower().Contains(term) ||
                (ep.User.LastName != null && ep.User.LastName.ToLower().Contains(term)) ||
                (ep.User.Phone != null && ep.User.Phone.Contains(term)));
        }

        var items = await query
            .OrderByDescending(ep => ep.Rating)
            .Select(ep => new
            {
                user_id = ep.UserId,
                first_name = ep.User.FirstName,
                last_name = ep.User.LastName,
                phone = ep.User.Phone,
                online_status = ep.OnlineStatus.ToString(),
                verification_status = ep.VerificationStatus.ToString(),
                rating = ep.Rating,
                completed_count = ep.CompletedCount,
                service_types = ep.ServiceTypes,
                vehicle_make = ep.VehicleMake,
                vehicle_plate = ep.VehiclePlate,
                created_at = ep.User.CreatedAt
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("executors/{id:guid}")]
    public async Task<IActionResult> GetExecutor(Guid id)
    {
        var ep = await _db.ExecutorProfiles
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == id);

        if (ep == null) return NotFound();

        return Ok(new
        {
            user_id = ep.UserId,
            first_name = ep.User.FirstName,
            last_name = ep.User.LastName,
            phone = ep.User.Phone,
            email = ep.User.Email,
            online_status = ep.OnlineStatus.ToString(),
            verification_status = ep.VerificationStatus.ToString(),
            rating = ep.Rating,
            completed_count = ep.CompletedCount,
            decline_count = ep.DeclineCount,
            service_types = ep.ServiceTypes,
            vehicle_make = ep.VehicleMake,
            vehicle_plate = ep.VehiclePlate,
            documents_url = ep.DocumentsUrl,
            created_at = ep.User.CreatedAt
        });
    }

    [HttpPatch("executors/{id:guid}/status")]
    public async Task<IActionResult> UpdateExecutorStatus(Guid id, [FromBody] UpdateExecutorStatusDto dto)
    {
        var profile = await _db.ExecutorProfiles.FirstOrDefaultAsync(ep => ep.UserId == id);
        if (profile == null) return NotFound();

        if (!Enum.TryParse<ExecutorVerificationStatus>(dto.VerificationStatus, out var status))
            return BadRequest("Invalid verification_status");

        profile.VerificationStatus = status;
        await _db.SaveChangesAsync();

        return Ok(new { verification_status = profile.VerificationStatus.ToString() });
    }

    [HttpPatch("executors/{id:guid}/verify")]
    public async Task<IActionResult> VerifyExecutor(Guid id)
    {
        var profile = await _db.ExecutorProfiles.FirstOrDefaultAsync(ep => ep.UserId == id);
        if (profile == null) return NotFound();
        profile.VerificationStatus = ExecutorVerificationStatus.VERIFIED;
        await _db.SaveChangesAsync();
        return Ok(new { verification_status = profile.VerificationStatus.ToString() });
    }

    [HttpPatch("executors/{id:guid}/suspend")]
    public async Task<IActionResult> SuspendExecutor(Guid id)
    {
        var profile = await _db.ExecutorProfiles.FirstOrDefaultAsync(ep => ep.UserId == id);
        if (profile == null) return NotFound();
        profile.VerificationStatus = ExecutorVerificationStatus.SUSPENDED;
        await _db.SaveChangesAsync();
        return Ok(new { verification_status = profile.VerificationStatus.ToString() });
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] string? q = null, [FromQuery] string? role = null)
    {
        var query = _db.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.ToLower();
            query = query.Where(u =>
                u.FirstName.ToLower().Contains(term) ||
                (u.LastName != null && u.LastName.ToLower().Contains(term)) ||
                (u.Phone != null && u.Phone.Contains(term)) ||
                (u.Email != null && u.Email.ToLower().Contains(term)));
        }

        if (!string.IsNullOrEmpty(role) && Enum.TryParse<Role>(role, out var r))
        {
            query = query.Where(u => u.Role == r);
        }

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new
            {
                id = u.Id,
                first_name = u.FirstName,
                last_name = u.LastName,
                phone = u.Phone,
                email = u.Email,
                role = u.Role.ToString(),
                created_at = u.CreatedAt
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpPatch("users/{id:guid}")]
    public async Task<IActionResult> UpdateUserRole(Guid id, [FromBody] UpdateUserRoleDto dto)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        if (!Enum.TryParse<Role>(dto.Role, out var role))
            return BadRequest("Invalid role");

        user.Role = role;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { id = user.Id, role = user.Role.ToString() });
    }

    [HttpGet("invites")]
    public async Task<IActionResult> GetInvites()
    {
        var baseUrl = _config["App:BaseUrl"] ?? "http://localhost:3000";
        var invites = await _db.Invites
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => new
            {
                id = i.Id,
                email = i.Email,
                role = i.Role.ToString(),
                invite_url = $"{baseUrl}/auth/invite?token={i.Token}",
                expires_at = i.ExpiresAt,
                used_at = i.UsedAt,
                created_at = i.CreatedAt
            })
            .ToListAsync();

        return Ok(invites);
    }

    [HttpPost("invites")]
    public async Task<IActionResult> CreateInvite([FromBody] CreateInviteDto dto)
    {
        if (!Enum.TryParse<InviteRole>(dto.Role, out var role))
            return BadRequest("Invalid role");

        var token = Convert.ToBase64String(Guid.NewGuid().ToByteArray())
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');

        var invite = new Invite
        {
            Email = dto.Email,
            Role = role,
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _db.Invites.Add(invite);
        await _db.SaveChangesAsync();

        var baseUrl = _config["App:BaseUrl"] ?? "http://localhost:3000";
        return Ok(new
        {
            id = invite.Id,
            email = invite.Email,
            role = invite.Role.ToString(),
            invite_url = $"{baseUrl}/auth/invite?token={token}",
            expires_at = invite.ExpiresAt,
            used_at = (DateTime?)null,
            created_at = invite.CreatedAt
        });
    }

    [HttpGet("orders")]
    public async Task<IActionResult> GetOrders(
        [FromQuery] string? status = null,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        var query = _db.Orders
            .Include(o => o.User)
            .Include(o => o.Executor)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<OrderStatus>(status, out var orderStatus))
            query = query.Where(o => o.Status == orderStatus);

        if (from.HasValue)
            query = query.Where(o => o.CreatedAt >= from.Value);

        if (to.HasValue)
            query = query.Where(o => o.CreatedAt <= to.Value);

        var items = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(o => new
            {
                id = o.Id,
                user_id = o.UserId,
                executor_id = o.ExecutorId,
                service_type = o.ServiceType.ToString(),
                status = o.Status.ToString(),
                address = o.Address,
                estimated_price = o.EstimatedPrice,
                final_price = o.FinalPrice,
                created_at = o.CreatedAt,
                completed_at = o.CompletedAt
            })
            .ToListAsync();

        var total = await query.CountAsync();
        return Ok(new { items, total, page, limit });
    }

    [HttpPost("broadcast")]
    public async Task<IActionResult> Broadcast([FromBody] BroadcastDto dto)
    {
        return Ok(new { sent = await _db.Users.CountAsync(), message = dto.Message });
    }
}
