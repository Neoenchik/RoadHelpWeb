using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using RoadHelp.Api.Hubs;
using RoadHelp.Api.Services;
using RoadHelp.Infrastructure.Data;
using RoadHelp.Application.Dtos;
using RoadHelp.Domain.Entities;
using RoadHelp.Domain.Enums;
using RoadHelp.Domain.Services;
using RoadHelp.Application.Interfaces;
using RoadHelp.Application.Services;

namespace RoadHelp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Route("api/orders")]
[Authorize(Roles = "USER")]
public class OrdersUserController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly OrderFsm _fsm;
    private readonly IHubContext<OrdersHub> _ordersHub;
    private readonly IHubContext<ExecutorsHub> _executorsHub;
    private readonly DemoOrderSimulator _demoSimulator;

    public OrdersUserController(
        ApplicationDbContext db,
        OrderFsm fsm,
        IHubContext<OrdersHub> ordersHub,
        IHubContext<ExecutorsHub> executorsHub,
        DemoOrderSimulator demoSimulator)
    {
        _db = db;
        _fsm = fsm;
        _ordersHub = ordersHub;
        _executorsHub = executorsHub;
        _demoSimulator = demoSimulator;
    }

    /// <summary>
    /// Создание нового заказа на выезд/ремонт пользователем (клиентом). Заказ попадет в статус PENDING.
    /// </summary>
    /// <param name="dto">Координаты, адрес, описание и тип услуги</param>
    /// <returns>ID созданного заказа</returns>
    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
    {
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString))
            return Unauthorized("Invalid token");

        var userId = Guid.Parse(userIdString);
        
        Enum.TryParse<ServiceType>(dto.ServiceType, out var serviceType);

        var order = new Order
        {
            UserId = userId,
            ServiceType = serviceType,
            Lat = dto.Lat,
            Lng = dto.Lng,
            Address = dto.Address,
            Description = dto.Description,
            Status = OrderStatus.PENDING,
            CreatedAt = DateTime.UtcNow
        };

        // Pricing logic mock
        order.EstimatedPrice = 1500; // Base price

        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        await _executorsHub.Clients.All.SendAsync("IncomingOrder", new
        {
            type = "incoming",
            order = new
            {
                id = order.Id,
                service_type = order.ServiceType.ToString().ToLower(),
                address = order.Address,
                lat = order.Lat,
                lng = order.Lng,
                estimated_price = order.EstimatedPrice?.ToString(),
                description = order.Description
            },
            deadline_at = DateTime.UtcNow.AddMinutes(1).ToString("O")
        });

        return Ok(new { id = order.Id, orderId = order.Id });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetOrder(Guid id)
    {
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString))
            return Unauthorized("Invalid token");

        var userId = Guid.Parse(userIdString);

var order = await _db.Orders
             .Include(o => o.Executor).ThenInclude(e => e!.ExecutorProfile)
             .FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);

        if (order == null)
            return NotFound("Order not found");

        return Ok(new
        {
            id = order.Id,
            user_id = order.UserId,
            executor_id = order.ExecutorId,
            service_type = order.ServiceType.ToString().ToLower(),
            status = order.Status.ToString(),
            lat = order.Lat,
            lng = order.Lng,
            address = order.Address,
            description = order.Description,
            estimated_price = order.EstimatedPrice,
            final_price = (decimal?)null,
            cancel_reason = order.CancelReason,
            created_at = order.CreatedAt,
            matched_at = order.MatchedAt,
            accepted_at = order.AcceptedAt,
            arrived_at = order.ArrivedAt,
            completed_at = order.CompletedAt,
            executor = order.Executor == null ? null : new
            {
                id = order.Executor.Id,
                first_name = order.Executor.FirstName,
                last_name = order.Executor.LastName,
                avatar_url = order.Executor.AvatarUrl,
                rating = order.Executor.ExecutorProfile?.Rating ?? 0,
                completed_count = order.Executor.ExecutorProfile?.CompletedCount ?? 0,
                vehicle_make = order.Executor.ExecutorProfile?.VehicleMake,
                vehicle_plate = order.Executor.ExecutorProfile?.VehiclePlate,
                lat = order.Executor.ExecutorProfile?.Lat,
                lng = order.Executor.ExecutorProfile?.Lng,
            }
        });
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActiveOrder()
    {
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString))
            return Unauthorized("Invalid token");

        var userId = Guid.Parse(userIdString);

var order = await _db.Orders
             .Include(o => o.Executor).ThenInclude(e => e!.ExecutorProfile)
             .FirstOrDefaultAsync(o => o.UserId == userId &&
                (o.Status == OrderStatus.PENDING || 
                 o.Status == OrderStatus.MATCHED || 
                 o.Status == OrderStatus.ACCEPTED || 
                 o.Status == OrderStatus.EN_ROUTE || 
                 o.Status == OrderStatus.ARRIVED || 
                 o.Status == OrderStatus.IN_PROGRESS || 
                 o.Status == OrderStatus.AWAITING_CONFIRMATION));

        if (order == null)
            return Ok((object?)null);

        return Ok(new
        {
            id = order.Id,
            user_id = order.UserId,
            executor_id = order.ExecutorId,
            service_type = order.ServiceType.ToString().ToLower(),
            status = order.Status.ToString(),
            lat = order.Lat,
            lng = order.Lng,
            address = order.Address,
            description = order.Description,
            estimated_price = order.EstimatedPrice,
            final_price = (decimal?)null,
            cancel_reason = order.CancelReason,
            created_at = order.CreatedAt,
            matched_at = order.MatchedAt,
            accepted_at = order.AcceptedAt,
            arrived_at = order.ArrivedAt,
            completed_at = order.CompletedAt,
            executor = order.Executor == null ? null : new
            {
                id = order.Executor.Id,
                first_name = order.Executor.FirstName,
                last_name = order.Executor.LastName,
                avatar_url = order.Executor.AvatarUrl,
                rating = order.Executor?.ExecutorProfile?.Rating ?? 0,
                completed_count = order.Executor?.ExecutorProfile?.CompletedCount ?? 0,
                vehicle_make = order.Executor?.ExecutorProfile?.VehicleMake,
                vehicle_plate = order.Executor?.ExecutorProfile?.VehiclePlate,
                lat = order.Executor?.ExecutorProfile?.Lat,
                lng = order.Executor?.ExecutorProfile?.Lng,
            }
        });
    }

    [HttpGet("{id:guid}/executors")]
    public async Task<IActionResult> GetOrderExecutors(Guid id)
    {
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString))
            return Unauthorized("Invalid token");

        var userId = Guid.Parse(userIdString);

        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);
        if (order == null)
            return NotFound("Order not found");

        if (order.Status != OrderStatus.PENDING && order.Status != OrderStatus.MATCHED)
            return Ok(new object[0]);

        // Get verified online executors supporting this service type
        var executors = await _db.ExecutorProfiles
            .Include(ep => ep.User)
            .Where(ep => ep.OnlineStatus == ExecutorOnlineStatus.ONLINE && 
                         ep.ServiceTypes.Contains(order.ServiceType.ToString()) &&
                         ep.Lat.HasValue && ep.Lng.HasValue)
            .Take(10)
            .ToListAsync();

        return Ok(executors.Select(ep => new
        {
            id = ep.User.Id,
            first_name = ep.User.FirstName,
            last_name = ep.User.LastName,
            avatar_url = ep.User.AvatarUrl,
            rating = ep.Rating,
            completed_count = ep.CompletedCount,
            vehicle_make = ep.VehicleMake,
            vehicle_plate = ep.VehiclePlate,
            lat = ep.Lat,
            lng = ep.Lng,
        }));
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> CancelOrder(Guid id, [FromBody] CancelOrderDto dto)
    {
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var userId = Guid.Parse(userIdString!);
        
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);
        if (order == null) return NotFound("Order not found");

        var fsmLog = _fsm.Transition(order, OrderStatus.CANCELLED, userId, dto.Reason);
        order.CancelReason = dto.Reason;
        _db.StatusChangeLogs.Add(fsmLog);
        
        await _db.SaveChangesAsync();
        await _ordersHub.Clients.Group($"order:{order.Id}").SendAsync("OrderUpdated", new { id = order.Id, status = order.Status.ToString() });

        return Ok(new { success = true });
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> SelectExecutor(Guid id, [FromBody] SelectExecutorDto dto)
    {
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var userId = Guid.Parse(userIdString!);
        
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);
        if (order == null) return NotFound("Order not found");

        order.ExecutorId = dto.ExecutorId;
        var fsmLog = _fsm.Transition(order, OrderStatus.MATCHED, userId, "Executor selected");
        _db.StatusChangeLogs.Add(fsmLog);
        
        await _db.SaveChangesAsync();
        await _ordersHub.Clients.Group($"order:{order.Id}").SendAsync("OrderUpdated", new { id = order.Id, status = order.Status.ToString(), executor_id = order.ExecutorId });

        _demoSimulator.ScheduleDemoFlow(order.Id, dto.ExecutorId);

        return Ok(new { success = true });
    }

    [HttpPost("{id:guid}/confirm")]
    public async Task<IActionResult> ConfirmOrder(Guid id)
    {
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var userId = Guid.Parse(userIdString!);
        
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);
        if (order == null) return NotFound("Order not found");

        var fsmLog = _fsm.Transition(order, OrderStatus.COMPLETED, userId, "User confirmed");
        order.CompletedAt = DateTime.UtcNow;
        _db.StatusChangeLogs.Add(fsmLog);
        
        await _db.SaveChangesAsync();
        await _ordersHub.Clients.Group($"order:{order.Id}").SendAsync("OrderUpdated", new { id = order.Id, status = order.Status.ToString() });

        return Ok(new { success = true });
    }

    [HttpPost("{id:guid}/dispute")]
    public async Task<IActionResult> DisputeOrder(Guid id, [FromBody] CancelOrderDto dto)
    {
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var userId = Guid.Parse(userIdString!);
        
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);
        if (order == null) return NotFound("Order not found");

        var fsmLog = _fsm.Transition(order, OrderStatus.DISPUTED, userId, dto.Reason);
        _db.StatusChangeLogs.Add(fsmLog);
        
        await _db.SaveChangesAsync();
        await _ordersHub.Clients.Group($"order:{order.Id}").SendAsync("OrderUpdated", new { id = order.Id, status = order.Status.ToString() });

        return Ok(new { success = true });
    }

    [HttpPost("{id:guid}/review")]
    public async Task<IActionResult> ReviewOrder(Guid id, [FromBody] ReviewOrderDto dto)
    {
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var userId = Guid.Parse(userIdString!);
        
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);
        if (order == null) return NotFound("Order not found");

        var review = new Review
        {
            OrderId = id,
            FromUserId = userId,
            ToUserId = order.ExecutorId.Value,
            Score = dto.Score,
            Comment = dto.Comment
        };
        _db.Reviews.Add(review);
        await _db.SaveChangesAsync();

        return Ok(new { success = true });
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory()
    {
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var userId = Guid.Parse(userIdString!);
        
        var orders = await _db.Orders
            .Where(o => o.UserId == userId && (o.Status == OrderStatus.COMPLETED || o.Status == OrderStatus.CANCELLED))
            .OrderByDescending(o => o.CreatedAt)
            .Take(50)
            .Select(o => new
            {
                id = o.Id,
                service_type = o.ServiceType.ToString().ToLower(),
                status = o.Status.ToString(),
                lat = o.Lat,
                lng = o.Lng,
                address = o.Address,
                created_at = o.CreatedAt,
                price = o.FinalPrice ?? o.EstimatedPrice
            })
            .ToListAsync();

        return Ok(new { items = orders });
    }
}