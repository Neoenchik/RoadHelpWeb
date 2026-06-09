using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoadHelp.Infrastructure.Data;
using RoadHelp.Application.Dtos;
using RoadHelp.Domain.Enums;
using RoadHelp.Domain.Services;
using RoadHelp.Application.Interfaces;
using RoadHelp.Application.Services;

using RoadHelp.Api.Hubs;
using Microsoft.AspNetCore.SignalR;
using StackExchange.Redis;
using RoadHelp.Domain.Entities;

namespace RoadHelp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Route("api/executor")]
[Authorize(Roles = "EXECUTOR")]
public class ExecutorsController : ControllerBase
{
    private static readonly string[] DefaultServiceTypes = { "tow", "tire", "fuel", "lockout", "battery" };

    private readonly ApplicationDbContext _db;
    private readonly IS3Service _s3;
    private readonly OrderFsm _fsm;
    private readonly IHubContext<OrdersHub> _ordersHub;
    private readonly IConnectionMultiplexer _redis;

    public ExecutorsController(
        ApplicationDbContext db,
        IS3Service s3,
        OrderFsm fsm,
        IHubContext<OrdersHub> ordersHub,
        IConnectionMultiplexer redis)
    {
        _db = db;
        _s3 = s3;
        _fsm = fsm;
        _ordersHub = ordersHub;
        _redis = redis;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString))
            return Unauthorized("Invalid token");

        var userId = Guid.Parse(userIdString);
        var profile = await _db.ExecutorProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null)
        {
            profile = new RoadHelp.Domain.Entities.ExecutorProfile
            {
                UserId = userId,
                ServiceTypes = DefaultServiceTypes.ToList(),
            };
            _db.ExecutorProfiles.Add(profile);
            await _db.SaveChangesAsync();
        }
        else if (profile.ServiceTypes.Count == 0)
        {
            profile.ServiceTypes = DefaultServiceTypes.ToList();
            await _db.SaveChangesAsync();
        }

        return Ok(new
        {
            online_status = profile.OnlineStatus.ToString(),
            verification_status = profile.VerificationStatus.ToString(),
            rating = profile.Rating,
            completed_count = profile.CompletedCount,
            service_types = profile.ServiceTypes,
            vehicle_make = profile.VehicleMake,
            vehicle_plate = profile.VehiclePlate
        });
    }

    [HttpPatch("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateExecutorMeDto dto)
    {
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString))
            return Unauthorized("Invalid token");

        var userId = Guid.Parse(userIdString);
        var profile = await _db.ExecutorProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null) return NotFound();

        if (dto.ServiceTypes != null)
            profile.ServiceTypes = dto.ServiceTypes;

        profile.VehicleMake = dto.VehicleMake;
        profile.VehiclePlate = dto.VehiclePlate;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            service_types = profile.ServiceTypes,
            vehicle_make = profile.VehicleMake,
            vehicle_plate = profile.VehiclePlate,
            rating = profile.Rating,
            completed_count = profile.CompletedCount,
            verification_status = profile.VerificationStatus.ToString(),
            online_status = profile.OnlineStatus.ToString()
        });
    }

    [HttpPatch("me/status")]
    public async Task<IActionResult> UpdateStatus([FromBody] UpdateExecutorOnlineStatusDto dto)
    {
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString))
            return Unauthorized("Invalid token");

        var userId = Guid.Parse(userIdString);
        var profile = await _db.ExecutorProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null) return NotFound();

        if (!Enum.TryParse<ExecutorOnlineStatus>(dto.Status, out var status))
            return BadRequest("Invalid status");

        profile.OnlineStatus = status;
        await _db.SaveChangesAsync();
        return Ok(new { online_status = profile.OnlineStatus.ToString() });
    }

    [HttpPatch("me/location")]
    public async Task<IActionResult> UpdateLocation([FromBody] LocationUpdateDto dto)
    {
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString))
            return Unauthorized("Invalid token");

        var userId = Guid.Parse(userIdString);
        var profile = await _db.ExecutorProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null) return NotFound();

        profile.Lat = dto.Lat;
        profile.Lng = dto.Lng;
        profile.LocationUpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { lat = profile.Lat, lng = profile.Lng });
    }

    [HttpGet("orders/incoming")]
    public async Task<IActionResult> GetIncomingOrder()
    {
        var userId = GetUserId();
        var profile = await _db.ExecutorProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null || profile.OnlineStatus != ExecutorOnlineStatus.ONLINE)
            return Ok(null);

        var serviceTypes = profile.ServiceTypes.Count > 0 ? profile.ServiceTypes : DefaultServiceTypes.ToList();
        var serviceTypeEnums = serviceTypes
            .Select(s => Enum.TryParse<ServiceType>(s, true, out var t) ? t : (ServiceType?)null)
            .Where(t => t.HasValue)
            .Select(t => t!.Value)
            .ToList();
        if (serviceTypeEnums.Count == 0)
            serviceTypeEnums = DefaultServiceTypes.Select(s => Enum.Parse<ServiceType>(s)).ToList();

        var skipped = await GetSkippedOrderIdsAsync(userId);

        var matched = await _db.Orders
            .Where(o => o.Status == OrderStatus.MATCHED && o.ExecutorId == userId)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        if (matched != null)
            return Ok(MapIncomingOrder(matched));

        var pending = await _db.Orders
            .Where(o => o.Status == OrderStatus.PENDING && o.ExecutorId == null && !skipped.Contains(o.Id))
            .Where(o => serviceTypeEnums.Contains(o.ServiceType))
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        if (pending == null)
            return Ok(null);

        return Ok(MapIncomingOrder(pending));
    }

    [HttpGet("orders/{id:guid}")]
    public async Task<IActionResult> GetOrder(Guid id)
    {
        var userId = GetUserId();
        var order = await _db.Orders
            .Include(o => o.User)
            .FirstOrDefaultAsync(o => o.Id == id && o.ExecutorId == userId);

        if (order == null)
            return NotFound();

        return Ok(MapExecutorOrder(order));
    }

    [HttpGet("orders/history")]
    public async Task<IActionResult> GetHistory()
    {
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString))
            return Unauthorized("Invalid token");

        var userId = Guid.Parse(userIdString);
        var items = await _db.Orders
            .Where(o => o.ExecutorId == userId && o.Status == OrderStatus.COMPLETED)
            .OrderByDescending(o => o.CreatedAt)
            .Take(50)
            .Select(o => new
            {
                id = o.Id,
                service_type = o.ServiceType.ToString(),
                created_at = o.CreatedAt,
                address = o.Address,
                estimated_price = o.EstimatedPrice,
                final_price = o.FinalPrice
            })
            .ToListAsync();

        return Ok(new { items });
    }

    /// <summary>
    /// Загрузка документов исполнителя в S3 (приватно). Возвращает предподписанные URL для проверки загрузки.
    /// Принимает список файлов (картинки или PDF), проверяет размер и тип, сохраняет ключи в профиле исполнителя.
    /// </summary>
    /// <param name="files">Список файлов для загрузки (image/* или application/pdf)</param>
    /// <returns>Список предподписанных URL</returns>
    [HttpPost("me/documents")]
    public async Task<IActionResult> UploadDocuments(List<IFormFile> files)
    {
        if (files == null || files.Count == 0) return BadRequest("Files are empty");

        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString))
            return Unauthorized("Invalid token");

        var userId = Guid.Parse(userIdString);
        var profile = await _db.ExecutorProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null) return NotFound();

        var uploadedKeys = new List<string>();

        foreach (var file in files)
        {
            if (file.Length > 10 * 1024 * 1024) return StatusCode(413, $"File {file.FileName} exceeds 10MB");
            if (!file.ContentType.StartsWith("image/") && file.ContentType != "application/pdf")
                return BadRequest($"Invalid file type for {file.FileName}");

            using var stream = file.OpenReadStream();
            var ext = Path.GetExtension(file.FileName);
            var key = $"documents/{userId}/{Guid.NewGuid()}{ext}";

            // Upload as private
            await _s3.UploadAsync(key, stream, file.ContentType, isPublic: false);
            profile.DocumentsUrl.Add(key);
            uploadedKeys.Add(key);
        }

        await _db.SaveChangesAsync();

        // Give them pre-signed URLs to verify
        var urls = uploadedKeys.Select(k => _s3.GetPresignedUrl(k)).ToList();
        return Ok(new { urls });
    }

    [HttpGet("orders/active")]
    public async Task<IActionResult> GetActiveOrder()
    {
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var userId = Guid.Parse(userIdString!);
        
        var order = await _db.Orders.FirstOrDefaultAsync(o => 
            o.ExecutorId == userId && 
            (o.Status == OrderStatus.ACCEPTED || o.Status == OrderStatus.EN_ROUTE || o.Status == OrderStatus.ARRIVED || o.Status == OrderStatus.IN_PROGRESS));
            
        if (order == null) return Ok(null);
        return Ok(new
        {
            id = order.Id,
            status = order.Status.ToString(),
            address = order.Address,
            lat = order.Lat,
            lng = order.Lng,
            service_type = order.ServiceType.ToString().ToLower(),
            user_phone = order.User.Phone,
            estimated_price = order.EstimatedPrice
        });
    }

    [HttpPost("orders/{id:guid}/accept")]
    public async Task<IActionResult> AcceptOrder(Guid id)
    {
        var userId = GetUserId();

        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == id);
        if (order == null)
            return NotFound();

        var logs = new List<StatusChangeLog>();

        if (order.Status == OrderStatus.PENDING && order.ExecutorId == null)
        {
            order.ExecutorId = userId;
            order.MatchedAt = DateTime.UtcNow;
            logs.Add(_fsm.Transition(order, OrderStatus.MATCHED, userId, "Executor claimed"));
            logs.Add(_fsm.Transition(order, OrderStatus.ACCEPTED, userId, "Executor accepted"));
            order.AcceptedAt = DateTime.UtcNow;
        }
        else if (order.Status == OrderStatus.MATCHED && (order.ExecutorId == userId || order.ExecutorId == null))
        {
            order.ExecutorId = userId;
            logs.Add(_fsm.Transition(order, OrderStatus.ACCEPTED, userId, "Executor accepted"));
            order.AcceptedAt = DateTime.UtcNow;
        }
        else
        {
            return BadRequest($"Cannot accept order in status {order.Status}");
        }

        _db.StatusChangeLogs.AddRange(logs);
        await _db.SaveChangesAsync();

        await BroadcastOrderUpdated(order);
        return Ok(MapExecutorOrder(order));
    }

    [HttpPost("orders/{id:guid}/decline")]
    public async Task<IActionResult> DeclineOrder(Guid id)
    {
        var userId = GetUserId();
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == id);
        if (order == null)
            return NotFound();

        if (order.Status == OrderStatus.PENDING && order.ExecutorId == null)
        {
            await SkipOrderAsync(userId, id);
            return Ok(new { success = true });
        }

        if (order.Status != OrderStatus.MATCHED || order.ExecutorId != userId)
            return BadRequest("Cannot decline this order");

        order.ExecutorId = null;
        var log = _fsm.Transition(order, OrderStatus.PENDING, userId, "Executor declined");
        _db.StatusChangeLogs.Add(log);
        await _db.SaveChangesAsync();

        await BroadcastOrderUpdated(order);
        return Ok(new { success = true });
    }

    [HttpPost("orders/{id:guid}/en-route")]
    public async Task<IActionResult> EnRouteOrder(Guid id)
    {
        var userId = GetUserId();
        var order = await RequireExecutorOrder(id, userId);
        if (order == null)
            return NotFound();

        if (order.Status != OrderStatus.ACCEPTED)
            return BadRequest($"Cannot start route from status {order.Status}");

        var log = _fsm.Transition(order, OrderStatus.EN_ROUTE, userId, "Executor en route");
        _db.StatusChangeLogs.Add(log);
        await _db.SaveChangesAsync();

        await BroadcastOrderUpdated(order);
        return Ok(MapExecutorOrder(order));
    }

    [HttpPost("orders/{id:guid}/arrive")]
    public async Task<IActionResult> ArriveOrder(Guid id)
    {
        var userId = GetUserId();
        var order = await RequireExecutorOrder(id, userId);
        if (order == null)
            return NotFound();

        var logs = new List<StatusChangeLog>();

        if (order.Status == OrderStatus.ACCEPTED)
        {
            logs.Add(_fsm.Transition(order, OrderStatus.EN_ROUTE, userId, "Executor en route"));
        }

        if (order.Status == OrderStatus.EN_ROUTE)
        {
            logs.Add(_fsm.Transition(order, OrderStatus.ARRIVED, userId, "Executor arrived"));
            order.ArrivedAt = DateTime.UtcNow;
        }
        else if (order.Status != OrderStatus.ARRIVED)
        {
            return BadRequest($"Cannot arrive from status {order.Status}");
        }

        _db.StatusChangeLogs.AddRange(logs);
        await _db.SaveChangesAsync();

        await BroadcastOrderUpdated(order);
        return Ok(MapExecutorOrder(order));
    }

    [HttpPost("orders/{id:guid}/start")]
    public async Task<IActionResult> StartOrder(Guid id)
    {
        var userId = GetUserId();
        var order = await RequireExecutorOrder(id, userId);
        if (order == null)
            return NotFound();

        if (order.Status != OrderStatus.ARRIVED)
            return BadRequest($"Cannot start work from status {order.Status}");

        var log = _fsm.Transition(order, OrderStatus.IN_PROGRESS, userId, "Work started");
        _db.StatusChangeLogs.Add(log);
        await _db.SaveChangesAsync();

        await BroadcastOrderUpdated(order);
        return Ok(MapExecutorOrder(order));
    }

    [HttpPost("orders/{id:guid}/complete")]
    public async Task<IActionResult> CompleteOrder(Guid id)
    {
        var userId = GetUserId();
        var order = await RequireExecutorOrder(id, userId);
        if (order == null)
            return NotFound();

        var logs = new List<StatusChangeLog>();

        if (order.Status == OrderStatus.ARRIVED)
        {
            logs.Add(_fsm.Transition(order, OrderStatus.IN_PROGRESS, userId, "Work started"));
        }

        if (order.Status == OrderStatus.IN_PROGRESS)
        {
            logs.Add(_fsm.Transition(order, OrderStatus.AWAITING_CONFIRMATION, userId, "Awaiting client confirmation"));
        }
        else
        {
            return BadRequest($"Cannot complete from status {order.Status}");
        }

        _db.StatusChangeLogs.AddRange(logs);
        await _db.SaveChangesAsync();

        await BroadcastOrderUpdated(order);
        return Ok(MapExecutorOrder(order));
    }

    [HttpGet("earnings")]
    public async Task<IActionResult> GetEarnings([FromQuery] string range = "week")
    {
        var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        var since = range switch
        {
            "day" => DateTime.UtcNow.AddDays(-1),
            "month" => DateTime.UtcNow.AddDays(-30),
            _ => DateTime.UtcNow.AddDays(-7)
        };

        var orders = await _db.Orders
            .Where(o => o.ExecutorId == userId && o.Status == OrderStatus.COMPLETED && o.CompletedAt >= since)
            .ToListAsync();

        var total = orders.Sum(o => o.FinalPrice ?? o.EstimatedPrice ?? 0);
        var points = orders
            .GroupBy(o => o.CompletedAt!.Value.Date)
            .Select(g => new
            {
                date = g.Key.ToString("yyyy-MM-dd"),
                amount = g.Sum(o => o.FinalPrice ?? o.EstimatedPrice ?? 0).ToString("F0"),
                orders = g.Count()
            })
            .OrderBy(p => p.date)
            .ToList();

        return Ok(new
        {
            total = total.ToString("F0"),
            completed_orders = orders.Count,
            points
        });
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);

    private async Task<RoadHelp.Domain.Entities.Order?> RequireExecutorOrder(Guid orderId, Guid executorId) =>
        await _db.Orders.FirstOrDefaultAsync(o => o.Id == orderId && o.ExecutorId == executorId);

    private async Task BroadcastOrderUpdated(RoadHelp.Domain.Entities.Order order) =>
        await _ordersHub.Clients.Group($"order:{order.Id}").SendAsync("OrderUpdated", new
        {
            id = order.Id,
            status = order.Status.ToString(),
            executor_id = order.ExecutorId,
        });

    private static object MapIncomingOrder(RoadHelp.Domain.Entities.Order order) => new
    {
        id = order.Id,
        service_type = order.ServiceType.ToString().ToLower(),
        address = order.Address,
        lat = order.Lat,
        lng = order.Lng,
        estimated_price = order.EstimatedPrice,
        description = order.Description,
        status = order.Status.ToString(),
    };

    private static object MapExecutorOrder(RoadHelp.Domain.Entities.Order order) => new
    {
        id = order.Id,
        service_type = order.ServiceType.ToString().ToLower(),
        status = order.Status.ToString(),
        address = order.Address,
        lat = order.Lat,
        lng = order.Lng,
        description = order.Description,
        estimated_price = order.EstimatedPrice,
        user_phone = order.User?.Phone,
    };

    private async Task<HashSet<Guid>> GetSkippedOrderIdsAsync(Guid executorId)
    {
        var db = _redis.GetDatabase();
        var members = await db.SetMembersAsync($"executor:{executorId}:skipped");
        return members
            .Select(m => Guid.TryParse(m.ToString(), out var id) ? id : Guid.Empty)
            .Where(id => id != Guid.Empty)
            .ToHashSet();
    }

    private async Task SkipOrderAsync(Guid executorId, Guid orderId)
    {
        var db = _redis.GetDatabase();
        await db.SetAddAsync($"executor:{executorId}:skipped", orderId.ToString());
        await db.KeyExpireAsync($"executor:{executorId}:skipped", TimeSpan.FromHours(24));
    }
}