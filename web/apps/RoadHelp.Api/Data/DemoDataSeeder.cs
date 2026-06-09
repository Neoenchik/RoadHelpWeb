using Microsoft.EntityFrameworkCore;
using RoadHelp.Domain.Entities;
using RoadHelp.Domain.Enums;
using RoadHelp.Infrastructure.Data;

namespace RoadHelp.Api.Data;

/// <summary>
/// Демо-данные для локальной разработки. OTP для всех телефонов: 1234.
/// </summary>
public static class DemoDataSeeder
{
    private static readonly string[] AllServices = { "tow", "tire", "fuel", "lockout", "battery" };

    private record DemoUser(string Phone, string FirstName, string LastName, Role Role, double? Lat = null, double? Lng = null, string? Vehicle = null, string? Plate = null);

    private static readonly DemoUser[] DemoUsers =
    [
        new("+79000000001", "Админ", "Демо", Role.ADMIN),
        new("+79000000002", "Оператор", "Демо", Role.OPERATOR),
        new("+79000000003", "Клиент", "Демо", Role.USER),
        new("+79000000004", "Иван", "Мастер", Role.EXECUTOR, 55.7558, 37.6173, "ГАЗель Next", "А123BC77"),
        new("+79000000005", "Сергей", "Эвакuator", Role.EXECUTOR, 55.7512, 37.6184, "Ford Transit", "В456DE77"),
    ];

    public static async Task SeedAsync(ApplicationDbContext db)
    {
        User? client = null;
        User? executor1 = null;

        foreach (var demo in DemoUsers)
        {
            var user = await db.Users
                .Include(u => u.ExecutorProfile)
                .FirstOrDefaultAsync(u => u.Phone == demo.Phone);

            if (user == null)
            {
                user = new User
                {
                    Phone = demo.Phone,
                    FirstName = demo.FirstName,
                    LastName = demo.LastName,
                    Role = demo.Role,
                };
                if (demo.Role == Role.EXECUTOR && demo.Lat.HasValue && demo.Lng.HasValue)
                    user.ExecutorProfile = CreateExecutorProfile(demo.Lat.Value, demo.Lng.Value, demo.Vehicle!, demo.Plate!);
                db.Users.Add(user);
            }
            else
            {
                user.FirstName ??= demo.FirstName;
                user.LastName ??= demo.LastName;
                user.Role = demo.Role;

                if (demo.Role == Role.EXECUTOR)
                {
                    user.ExecutorProfile ??= CreateExecutorProfile(
                        demo.Lat ?? 55.7558, demo.Lng ?? 37.6173, demo.Vehicle ?? "Ford Transit", demo.Plate ?? "A000AA77");
                    var profile = user.ExecutorProfile;
                    profile.OnlineStatus = ExecutorOnlineStatus.ONLINE;
                    profile.VerificationStatus = ExecutorVerificationStatus.VERIFIED;
                    if (profile.ServiceTypes.Count == 0)
                        profile.ServiceTypes = AllServices.ToList();
                    profile.Lat ??= demo.Lat ?? 55.7558;
                    profile.Lng ??= demo.Lng ?? 37.6173;
                }
            }

            if (demo.Phone == "+79000000003") client = user;
            if (demo.Phone == "+79000000004") executor1 = user;
        }

        await db.SaveChangesAsync();

        if (client != null && !await db.PaymentMethods.AnyAsync(p => p.UserId == client.Id))
        {
            db.PaymentMethods.Add(new PaymentMethod
            {
                UserId = client.Id,
                Type = PaymentMethodType.card,
                Last4 = "4242",
                Brand = "Visa",
                IsDefault = true,
                ProviderToken = "mock_demo_card",
            });
            await db.SaveChangesAsync();
        }

        if (client != null && executor1 != null &&
            !await db.Orders.AnyAsync(o => o.UserId == client.Id && o.Description == "Демо-заказ для истории"))
        {
            db.Orders.Add(new Order
            {
                UserId = client.Id,
                ExecutorId = executor1.Id,
                ServiceType = ServiceType.tow,
                Status = OrderStatus.COMPLETED,
                Lat = 55.7558,
                Lng = 37.6173,
                Address = "Москва, ул. Тверская, 1",
                Description = "Демо-заказ для истории",
                EstimatedPrice = 1500,
                FinalPrice = 1500,
                CreatedAt = DateTime.UtcNow.AddDays(-1),
                MatchedAt = DateTime.UtcNow.AddDays(-1).AddMinutes(2),
                AcceptedAt = DateTime.UtcNow.AddDays(-1).AddMinutes(5),
                ArrivedAt = DateTime.UtcNow.AddDays(-1).AddMinutes(25),
                CompletedAt = DateTime.UtcNow.AddDays(-1).AddMinutes(45),
            });
            await db.SaveChangesAsync();
        }
    }

    private static ExecutorProfile CreateExecutorProfile(
        double lat, double lng, string vehicleMake, string vehiclePlate) => new()
    {
        OnlineStatus = ExecutorOnlineStatus.ONLINE,
        VerificationStatus = ExecutorVerificationStatus.VERIFIED,
        ServiceTypes = AllServices.ToList(),
        VehicleMake = vehicleMake,
        VehiclePlate = vehiclePlate,
        Rating = 4.8,
        CompletedCount = 127,
        Lat = lat,
        Lng = lng,
        LocationUpdatedAt = DateTime.UtcNow,
    };
}
