using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;

namespace RoadHelp.Api.Hubs;

[Authorize]
public class OperatorsHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        // Add to operator group if role matches
        if (Context.User?.IsInRole("OPERATOR") == true || Context.User?.IsInRole("ADMIN") == true)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, "operators");
        }
        await base.OnConnectedAsync();
    }
}

[Authorize]
public class OrdersHub : Hub
{
    public async Task SubscribeToOrder(string orderId)
    {
        // TODO: Ensure user is owner or assigned executor of the order
        await Groups.AddToGroupAsync(Context.ConnectionId, $"order:{orderId}");
    }
}

[Authorize(Roles = "EXECUTOR")]
public class ExecutorsHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var executorId = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(executorId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"executor:{executorId}");
        }
        await base.OnConnectedAsync();
    }
}