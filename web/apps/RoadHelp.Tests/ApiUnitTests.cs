using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using RoadHelp.Infrastructure.Data;
using RoadHelp.Domain.Entities;
using Xunit;

namespace RoadHelp.Tests;

public class ApiUnitTests
{
    private ApplicationDbContext GetDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase("UnitTests_" + Guid.NewGuid())
            .Options;
        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task User_Creation_Works()
    {
        var db = GetDbContext();
        var user = new User 
        { 
            Phone = "+79991234567", 
            FirstName = "Тест", 
            LastName = "Пользователь",
            Role = RoadHelp.Domain.Enums.Role.USER
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var retrievedUser = await db.Users.FirstOrDefaultAsync(u => u.Phone == "+79991234567");
        retrievedUser.Should().NotBeNull();
        retrievedUser!.FirstName.Should().Be("Тест");
    }

    [Fact]
    public async Task ExecutorProfile_Creation_Works()
    {
        var db = GetDbContext();
        
        var executor = new User 
        { 
            Phone = "+79991234568", 
            FirstName = "Алексей", 
            LastName = "Иванов", 
            Role = RoadHelp.Domain.Enums.Role.EXECUTOR 
        };
        db.Users.Add(executor);
        await db.SaveChangesAsync();

        var profile = new ExecutorProfile
        {
            UserId = executor.Id,
            VerificationStatus = RoadHelp.Domain.Enums.ExecutorVerificationStatus.PENDING,
            OnlineStatus = RoadHelp.Domain.Enums.ExecutorOnlineStatus.OFFLINE,
            ServiceTypes = new List<string> { "tow", "fuel" }
        };
        db.ExecutorProfiles.Add(profile);
        await db.SaveChangesAsync();

        var retrievedProfile = await db.ExecutorProfiles
            .Include(ep => ep.User)
            .FirstOrDefaultAsync(ep => ep.UserId == executor.Id);
        
        retrievedProfile.Should().NotBeNull();
        retrievedProfile!.ServiceTypes.Should().Contain("tow");
    }

    [Fact]
    public async Task Order_Creation_Works()
    {
        var db = GetDbContext();
        
        var user = new User 
        { 
            Phone = "+79991234567", 
            FirstName = "Иван", 
            Role = RoadHelp.Domain.Enums.Role.USER
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var order = new RoadHelp.Domain.Entities.Order
        {
            UserId = user.Id,
            ServiceType = RoadHelp.Domain.Enums.ServiceType.tow,
            Status = RoadHelp.Domain.Enums.OrderStatus.PENDING,
            Lat = 55.7558,
            Lng = 37.6176,
            Address = "Москва, ул. Ленина, 1",
            Description = "Эвакуатор нужен",
            CreatedAt = DateTime.UtcNow
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync();

        var retrievedOrder = await db.Orders.FirstOrDefaultAsync(o => o.UserId == user.Id);
        retrievedOrder.Should().NotBeNull();
        retrievedOrder!.Status.Should().Be(RoadHelp.Domain.Enums.OrderStatus.PENDING);
    }

    [Fact]
    public async Task Order_With_Executor_Works()
    {
        var db = GetDbContext();
        
        var user = new User 
        { 
            Phone = "+79991234567", 
            FirstName = "Иван", 
            Role = RoadHelp.Domain.Enums.Role.USER
        };
        var executor = new User 
        { 
            Phone = "+79991234568", 
            FirstName = "Алексей", 
            Role = RoadHelp.Domain.Enums.Role.EXECUTOR 
        };
        db.Users.AddRange(user, executor);
        await db.SaveChangesAsync();

        var order = new RoadHelp.Domain.Entities.Order
        {
            UserId = user.Id,
            ExecutorId = executor.Id,
            ServiceType = RoadHelp.Domain.Enums.ServiceType.tow,
            Status = RoadHelp.Domain.Enums.OrderStatus.ACCEPTED,
            Lat = 55.7558,
            Lng = 37.6176,
            Address = "Москва",
            CreatedAt = DateTime.UtcNow
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync();

        var retrievedOrder = await db.Orders
            .Include(o => o.User)
            .Include(o => o.Executor)
            .FirstOrDefaultAsync(o => o.Id == order.Id);
        
        retrievedOrder.Should().NotBeNull();
        retrievedOrder!.Executor.Should().NotBeNull();
        retrievedOrder.Executor!.FirstName.Should().Be("Алексей");
    }
}