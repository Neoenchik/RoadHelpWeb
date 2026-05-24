using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using RoadHelp.Api.Hubs;
using RoadHelp.Api.Data;
using RoadHelp.Api.Dtos;
using RoadHelp.Api.Models;
using RoadHelp.Api.Enums;
using RoadHelp.Api.Services;

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

    public OrdersUserController(ApplicationDbContext db, OrderFsm fsm, IHubContext<OrdersHub> ordersHub)
    {
        _db = db;
        _fsm = fsm;
        _ordersHub = ordersHub;
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

        // TODO: Enqueue matching worker (Redis Queue)
        
        return Ok(new { id = order.Id, orderId = order.Id });
    }
}