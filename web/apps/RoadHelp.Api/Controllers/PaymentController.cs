using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoadHelp.Infrastructure.Data;
using RoadHelp.Domain.Enums;
using RoadHelp.Application.Interfaces;
using RoadHelp.Domain.Entities;
using RoadHelp.Domain.Services;
using RoadHelp.Application.Interfaces;
using RoadHelp.Application.Services;

namespace RoadHelp.Api.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class PaymentController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IPaymentProvider _payment;
    private readonly OrderFsm _fsm;

    public PaymentController(ApplicationDbContext db, IPaymentProvider payment, OrderFsm fsm)
    {
        _db = db;
        _payment = payment;
        _fsm = fsm;
    }

    /// <summary>
    /// Провести оплату по заказу. Берёт дефолтную карту пользователя и пытается списать сумму.
    /// При успешной оплате переводит заказ в статус COMPLETED и сохраняет транзакцию.
    /// </summary>
    /// <param name="id">ID заказа</param>
    /// <returns>Статус операции оплаты</returns>
    [HttpPost("{id}/pay")]
    public async Task<IActionResult> PayOrder(Guid id)
    {
        var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);
        if (order == null) return NotFound();

        if (order.Status != OrderStatus.AWAITING_CONFIRMATION && order.Status != OrderStatus.COMPLETED)
        {
            return BadRequest("Order is not awaiting confirmation");
        }
        
        if (order.Status == OrderStatus.COMPLETED)
        {
            return Ok(new { message = "Already paid" }); // Idempotency
        }

        var defaultCard = await _db.PaymentMethods.FirstOrDefaultAsync(p => p.UserId == userId && p.IsDefault);
        if (defaultCard == null) return BadRequest("No default payment method");

        var amount = order.FinalPrice ?? order.EstimatedPrice ?? 0;
        
        // Use OrderId as idempotency key
        var success = await _payment.ChargeAsync(defaultCard.ProviderToken, amount, order.Id.ToString());
        
        if (!success) return StatusCode(402, "Payment failed");

        order.TransactionId = $"tx_{Guid.NewGuid()}"; // From provider
        
        // Transition state
        var log = _fsm.Transition(order, OrderStatus.COMPLETED, userId, "Paid successfully");
        _db.StatusChangeLogs.Add(log);
        
        order.CompletedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Payment successful", orderId = order.Id });
    }
}