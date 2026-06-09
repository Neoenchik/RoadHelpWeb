using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using RoadHelp.Api.Hubs;
using RoadHelp.Domain.Entities;
using RoadHelp.Domain.Enums;
using RoadHelp.Domain.Services;
using RoadHelp.Infrastructure.Data;

namespace RoadHelp.Api.Services;

/// <summary>
/// Автоматический сценарий исполнителя Сергея (+79000000005) после выбора клиентом.
/// Только Development.
/// </summary>
public class DemoOrderSimulator
{
    public const string DemoExecutorPhone = "+79000000005";

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHostEnvironment _env;

    public DemoOrderSimulator(IServiceScopeFactory scopeFactory, IHostEnvironment env)
    {
        _scopeFactory = scopeFactory;
        _env = env;
    }

    public void ScheduleDemoFlow(Guid orderId, Guid executorId)
    {
        if (!_env.IsDevelopment())
            return;

        _ = Task.Run(() => RunDemoFlowAsync(orderId, executorId));
    }

    private async Task RunDemoFlowAsync(Guid orderId, Guid executorId)
    {
        try
        {
            await using var checkScope = _scopeFactory.CreateAsyncScope();
            var checkDb = checkScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var isDemoExecutor = await checkDb.Users
                .AnyAsync(u => u.Id == executorId && u.Phone == DemoExecutorPhone);
            if (!isDemoExecutor)
                return;

            if (!await WaitAndIsActive(orderId, TimeSpan.FromSeconds(5)))
                return;
            if (!await AcceptAsync(orderId, executorId))
                return;

            if (!await WaitAndIsActive(orderId, TimeSpan.FromSeconds(8)))
                return;
            if (!await TransitionAsync(orderId, executorId, OrderStatus.EN_ROUTE, "Исполнитель в пути"))
                return;

            if (!await WaitAndIsActive(orderId, TimeSpan.FromSeconds(8)))
                return;
            if (!await ArriveAsync(orderId, executorId))
                return;

            if (!await WaitAndIsActive(orderId, TimeSpan.FromSeconds(6)))
                return;
            if (!await TransitionAsync(orderId, executorId, OrderStatus.IN_PROGRESS, "Работа начата"))
                return;

            if (!await WaitAndIsActive(orderId, TimeSpan.FromSeconds(10)))
                return;
            await TransitionAsync(orderId, executorId, OrderStatus.AWAITING_CONFIRMATION, "Ожидает подтверждения клиента");
        }
        catch
        {
            // игнорируем сбои фонового сценария
        }
    }

    private async Task<bool> WaitAndIsActive(Guid orderId, TimeSpan delay)
    {
        await Task.Delay(delay);
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var order = await db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == orderId);
        return order != null
               && order.Status != OrderStatus.CANCELLED
               && order.Status != OrderStatus.COMPLETED
               && order.Status != OrderStatus.DISPUTED;
    }

    private async Task<bool> AcceptAsync(Guid orderId, Guid executorId)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var fsm = scope.ServiceProvider.GetRequiredService<OrderFsm>();
        var ordersHub = scope.ServiceProvider.GetRequiredService<IHubContext<OrdersHub>>();

        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == orderId);
        if (order == null || order.ExecutorId != executorId)
            return false;

        if (order.Status != OrderStatus.MATCHED)
            return order.Status is OrderStatus.ACCEPTED or OrderStatus.EN_ROUTE
                or OrderStatus.ARRIVED or OrderStatus.IN_PROGRESS or OrderStatus.AWAITING_CONFIRMATION;

        var log = fsm.Transition(order, OrderStatus.ACCEPTED, executorId, "Исполнитель принял заказ");
        order.AcceptedAt = DateTime.UtcNow;
        db.StatusChangeLogs.Add(log);
        await db.SaveChangesAsync();
        await BroadcastAsync(ordersHub, order);
        return true;
    }

    private async Task<bool> ArriveAsync(Guid orderId, Guid executorId)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var fsm = scope.ServiceProvider.GetRequiredService<OrderFsm>();
        var ordersHub = scope.ServiceProvider.GetRequiredService<IHubContext<OrdersHub>>();

        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == orderId && o.ExecutorId == executorId);
        if (order == null)
            return false;

        if (order.Status == OrderStatus.EN_ROUTE)
        {
            var log = fsm.Transition(order, OrderStatus.ARRIVED, executorId, "Исполнитель на месте");
            order.ArrivedAt = DateTime.UtcNow;
            db.StatusChangeLogs.Add(log);
            await db.SaveChangesAsync();
            await BroadcastAsync(ordersHub, order);
        }

        return order.Status == OrderStatus.ARRIVED;
    }

    private async Task<bool> TransitionAsync(Guid orderId, Guid executorId, OrderStatus target, string reason)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var fsm = scope.ServiceProvider.GetRequiredService<OrderFsm>();
        var ordersHub = scope.ServiceProvider.GetRequiredService<IHubContext<OrdersHub>>();

        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == orderId && o.ExecutorId == executorId);
        if (order == null || order.Status == target)
            return order != null;

        if (order.Status == OrderStatus.CANCELLED || order.Status == OrderStatus.COMPLETED)
            return false;

        var log = fsm.Transition(order, target, executorId, reason);
        db.StatusChangeLogs.Add(log);
        await db.SaveChangesAsync();
        await BroadcastAsync(ordersHub, order);
        return true;
    }

    private static Task BroadcastAsync(IHubContext<OrdersHub> hub, Order order) =>
        hub.Clients.Group($"order:{order.Id}").SendAsync("OrderUpdated", new
        {
            id = order.Id,
            status = order.Status.ToString(),
            executor_id = order.ExecutorId,
        });
}
