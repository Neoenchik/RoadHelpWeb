using Microsoft.EntityFrameworkCore;
using RoadHelp.Api.Models;

namespace RoadHelp.Api.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<ExecutorProfile> ExecutorProfiles { get; set; } = null!;
    public DbSet<Order> Orders { get; set; } = null!;
    public DbSet<PaymentMethod> PaymentMethods { get; set; } = null!;
    public DbSet<PushSubscription> PushSubscriptions { get; set; } = null!;
    public DbSet<Review> Reviews { get; set; } = null!;
    public DbSet<StatusChangeLog> StatusChangeLogs { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Setup relationships
        modelBuilder.Entity<User>()
            .HasOne(u => u.ExecutorProfile)
            .WithOne(e => e.User)
            .HasForeignKey<ExecutorProfile>(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Order>()
            .HasOne(o => o.User)
            .WithMany(u => u.OrdersAsUser)
            .HasForeignKey(o => o.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Order>()
            .HasOne(o => o.Executor)
            .WithMany(u => u.OrdersAsExecutor)
            .HasForeignKey(o => o.ExecutorId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Review>()
            .HasOne(r => r.Order)
            .WithMany(o => o.Reviews)
            .HasForeignKey(r => r.OrderId)
            .OnDelete(DeleteBehavior.Cascade);
            
        modelBuilder.Entity<PaymentMethod>()
            .HasOne(p => p.User)
            .WithMany(u => u.PaymentMethods)
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
            
        modelBuilder.Entity<PushSubscription>()
            .HasOne(p => p.User)
            .WithMany(u => u.PushSubscriptions)
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
            
        // Setup Enum mappings to strings for Postgres compatibility
        modelBuilder.HasPostgresEnum<RoadHelp.Api.Enums.Role>("user_role");
        modelBuilder.HasPostgresEnum<RoadHelp.Api.Enums.ServiceType>("service_type");
        modelBuilder.HasPostgresEnum<RoadHelp.Api.Enums.OrderStatus>("order_status");
        modelBuilder.HasPostgresEnum<RoadHelp.Api.Enums.ExecutorOnlineStatus>("executor_online_status");
        modelBuilder.HasPostgresEnum<RoadHelp.Api.Enums.ExecutorVerificationStatus>("executor_verification_status");
        modelBuilder.HasPostgresEnum<RoadHelp.Api.Enums.PaymentMethodType>("payment_method_type");
        modelBuilder.HasPostgresEnum<RoadHelp.Api.Enums.StatusChangeTargetType>("status_change_target_type");
        modelBuilder.HasPostgresEnum<RoadHelp.Api.Enums.InviteRole>("invite_role");
    }
}