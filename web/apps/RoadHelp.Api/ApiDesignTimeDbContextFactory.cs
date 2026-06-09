using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using RoadHelp.Infrastructure.Data;

namespace RoadHelp.Api;

public class ApiDesignTimeDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        optionsBuilder.UseNpgsql(
            Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? "Host=localhost;Database=roadhelp;Username=road;Password=road",
            npgsql => npgsql.MigrationsAssembly("RoadHelp.Api"));
        return new ApplicationDbContext(optionsBuilder.Options);
    }
}
