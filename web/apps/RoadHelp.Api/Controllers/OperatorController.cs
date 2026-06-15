using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoadHelp.Application.Dtos;
using RoadHelp.Domain.Enums;
using RoadHelp.Infrastructure.Data;

namespace RoadHelp.Api.Controllers;

[ApiController]
[Route("api/operator")]
[Authorize(Roles = "ADMIN,OPERATOR")]
public class OperatorController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public OperatorController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet("metrics")]
    public async Task<IActionResult> GetMetrics()
    {
        var since = DateTime.UtcNow.AddHours(-24);
        var activeOrders = await _db.Orders.CountAsync(o =>
            o.Status != OrderStatus.COMPLETED &&
            o.Status != OrderStatus.CANCELLED);

        var completed24h = await _db.Orders.CountAsync(o =>
            o.Status == OrderStatus.COMPLETED && o.CompletedAt >= since);

        var cancelled24h = await _db.Orders.CountAsync(o =>
            o.Status == OrderStatus.CANCELLED && o.CreatedAt >= since);

        var total24h = completed24h + cancelled24h;
        var cancelRate = total24h > 0 ? (double)cancelled24h / total24h : 0;

        var disputesOpen = await _db.Orders.CountAsync(o => o.Status == OrderStatus.DISPUTED);

        var points = await _db.Orders
            .Where(o => o.CreatedAt >= DateTime.UtcNow.AddHours(-24))
            .GroupBy(o => o.CreatedAt.Hour)
            .Select(g => new { hour = g.Key.ToString("00") + ":00", count = g.Count() })
            .ToListAsync();

        var alerts = new List<object>();
        if (cancelRate > 0.2)
        {
            alerts.Add(new { kind = "cancel_rate", message = $"Cancel rate {cancelRate:P0} exceeds threshold" });
        }
        if (disputesOpen > 0)
        {
            alerts.Add(new { kind = "disputes", message = $"{disputesOpen} open dispute(s)" });
        }

        return Ok(new
        {
            active_orders = activeOrders,
            completed_24h = completed24h,
            cancelled_24h = cancelled24h,
            cancel_rate = cancelRate,
            avg_eta_min = 15,
            disputes_open = disputesOpen,
            points,
            alerts
        });
    }

    [HttpGet("active-orders")]
    public async Task<IActionResult> GetActiveOrders()
    {
        var orders = await _db.Orders
            .Include(o => o.User)
            .Include(o => o.Executor)
            .Where(o => o.Status != OrderStatus.COMPLETED && o.Status != OrderStatus.CANCELLED)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new
            {
                id = o.Id,
                service_type = o.ServiceType.ToString(),
                status = o.Status.ToString(),
                address = o.Address,
                lat = o.Lat,
                lng = o.Lng,
                user_name = o.User.FirstName,
                executor_name = o.Executor != null ? o.Executor.FirstName : null,
                created_at = o.CreatedAt,
                estimated_price = o.EstimatedPrice
            })
            .ToListAsync();

        return Ok(orders);
    }

    [HttpGet("disputes")]
    public async Task<IActionResult> GetDisputes()
    {
        var disputes = await _db.Orders
            .Where(o => o.Status == OrderStatus.DISPUTED)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new
            {
                id = o.Id,
                service_type = o.ServiceType.ToString(),
                address = o.Address,
                cancel_reason = o.CancelReason,
                final_price = o.FinalPrice,
                estimated_price = o.EstimatedPrice,
                created_at = o.CreatedAt
            })
            .ToListAsync();

        return Ok(disputes);
    }

    [HttpPatch("disputes/{id:guid}")]
    public async Task<IActionResult> ResolveDispute(Guid id, [FromBody] DisputeResolutionDto dto)
    {
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == id);
        if (order == null) return NotFound();

        if (order.Status != OrderStatus.DISPUTED)
            return BadRequest("Order is not in disputed status");

        var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);

        if (dto.Resolution.Equals("reject", StringComparison.OrdinalIgnoreCase))
        {
            order.Status = OrderStatus.CANCELLED;
            order.CancelReason = dto.Note ?? "Dispute rejected by operator";
        }
        else
        {
            order.Status = OrderStatus.COMPLETED;
            order.CompletedAt = DateTime.UtcNow;
        }

        _db.StatusChangeLogs.Add(new Domain.Entities.StatusChangeLog
        {
            TargetType = StatusChangeTargetType.order,
            TargetId = order.Id,
            OldStatus = OrderStatus.DISPUTED.ToString(),
            NewStatus = order.Status.ToString(),
            Reason = dto.Note ?? dto.Resolution,
            ChangedById = userId
        });

        await _db.SaveChangesAsync();
        return Ok(new { id = order.Id, status = order.Status.ToString() });
    }
}
