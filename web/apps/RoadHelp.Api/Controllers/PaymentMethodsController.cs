using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoadHelp.Domain.Entities;
using RoadHelp.Domain.Enums;
using RoadHelp.Infrastructure.Data;

namespace RoadHelp.Api.Controllers;

[ApiController]
[Route("api/users/me/payment-methods")]
[Authorize(Roles = "USER")]
public class PaymentMethodsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public PaymentMethodsController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var userId = GetUserId();
        await EnsureDemoCardAsync(userId);

        var methods = await _db.PaymentMethods
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.IsDefault)
            .ThenByDescending(p => p.CreatedAt)
            .Select(p => new
            {
                id = p.Id,
                type = p.Type.ToString(),
                last4 = p.Last4,
                brand = p.Brand,
                is_default = p.IsDefault,
            })
            .ToListAsync();

        return Ok(methods);
    }

    [HttpPost]
    public async Task<IActionResult> AddDemoCard()
    {
        var userId = GetUserId();
        var existing = await _db.PaymentMethods.AnyAsync(p => p.UserId == userId);
        if (existing)
            return BadRequest("Карта уже добавлена");

        var card = await CreateDemoCardAsync(userId);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            id = card.Id,
            type = card.Type.ToString(),
            last4 = card.Last4,
            brand = card.Brand,
            is_default = card.IsDefault,
        });
    }

    internal static async Task EnsureDemoCardAsync(ApplicationDbContext db, Guid userId)
    {
        if (!await db.PaymentMethods.AnyAsync(p => p.UserId == userId))
        {
            db.PaymentMethods.Add(await CreateDemoCardEntity(userId));
            await db.SaveChangesAsync();
        }
    }

    private async Task EnsureDemoCardAsync(Guid userId) =>
        await EnsureDemoCardAsync(_db, userId);

    private async Task<PaymentMethod> CreateDemoCardAsync(Guid userId)
    {
        var card = await CreateDemoCardEntity(userId);
        _db.PaymentMethods.Add(card);
        return card;
    }

    private static Task<PaymentMethod> CreateDemoCardEntity(Guid userId) =>
        Task.FromResult(new PaymentMethod
        {
            UserId = userId,
            Type = PaymentMethodType.card,
            Last4 = "4242",
            Brand = "Visa",
            IsDefault = true,
            ProviderToken = $"mock_{userId:N}",
        });

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
}
