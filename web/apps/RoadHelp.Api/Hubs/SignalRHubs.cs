using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RoadHelp.Infrastructure.Data;

namespace RoadHelp.Api.Hubs;

[Authorize]
public class OperatorsHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        if (Context.User?.IsInRole("OPERATOR") == true || Context.User?.IsInRole("ADMIN") == true)
            await Groups.AddToGroupAsync(Context.ConnectionId, "operators");

        await base.OnConnectedAsync();
    }
}

[Authorize]
public class OrdersHub : Hub
{
    private readonly IServiceScopeFactory _scopeFactory;

    public OrdersHub(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    public async Task SubscribeToOrder(string orderId)
    {
        if (!Guid.TryParse(orderId, out var orderGuid))
            throw new HubException("Invalid order id");

        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim))
            throw new HubException("Unauthorized");

        var userId = Guid.Parse(userIdClaim);
        var isOperator = Context.User?.IsInRole("OPERATOR") == true || Context.User?.IsInRole("ADMIN") == true;

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var order = await db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == orderGuid);
        if (order == null)
            throw new HubException("Order not found");

        var allowed = isOperator || order.UserId == userId || order.ExecutorId == userId;
        if (!allowed)
            throw new HubException("Forbidden");

        await Groups.AddToGroupAsync(Context.ConnectionId, $"order:{orderId}");
    }
}

[Authorize(Roles = "EXECUTOR")]
public class ExecutorsHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var executorId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(executorId))
            await Groups.AddToGroupAsync(Context.ConnectionId, $"executor:{executorId}");

        await base.OnConnectedAsync();
    }
}
