using Amazon.S3;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using RoadHelp.Application.Interfaces;
using RoadHelp.Application.Services;
using RoadHelp.Domain.Services;
using RoadHelp.Infrastructure.Data;
using RoadHelp.Infrastructure.Payment;
using RoadHelp.Infrastructure.Services;
using RoadHelp.Api.Data;
using RoadHelp.Api.Hubs;
using RoadHelp.Api.Services;
using StackExchange.Redis;
using System.Text;

namespace RoadHelp.Api;

public class Startup
{
    public IConfiguration Configuration { get; }

    public Startup(IConfiguration configuration)
    {
        Configuration = configuration;
    }

    public void ConfigureServices(IServiceCollection services)
    {
        services.AddControllers();

        var allowedOrigins = Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? new[] { "http://localhost:3000" };

        services.AddCors(options =>
        {
            options.AddPolicy("FrontendCors", policy =>
            {
                policy.WithOrigins(allowedOrigins)
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials();
            });
        });

        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(
                Configuration.GetConnectionString("DefaultConnection"),
                npgsql => npgsql.MigrationsAssembly("RoadHelp.Api")));

        services.AddSingleton<IConnectionMultiplexer>(sp =>
            ConnectionMultiplexer.Connect(Configuration["Redis:ConnectionString"] ?? "localhost:6379"));

        var jwtSecret = Configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("Jwt:Secret must be configured");

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = Configuration["Jwt:Issuer"] ?? "RoadHelp",
                    ValidAudience = Configuration["Jwt:Audience"] ?? "RoadHelpFront",
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
                };

                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var path = context.HttpContext.Request.Path;
                        if (!path.StartsWithSegments("/ws"))
                            return Task.CompletedTask;

                        var accessToken = context.Request.Query["access_token"];
                        if (string.IsNullOrEmpty(accessToken))
                        {
                            var authHeader = context.Request.Headers.Authorization.ToString();
                            if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                                accessToken = authHeader["Bearer ".Length..].Trim();
                        }

                        if (!string.IsNullOrEmpty(accessToken))
                            context.Token = accessToken;

                        return Task.CompletedTask;
                    }
                };
            });

        services.AddAuthorization();

        var awsOptions = Configuration.GetAWSOptions();
        services.AddDefaultAWSOptions(awsOptions);
        services.AddAWSService<IAmazonS3>();

        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IOtpService, OtpService>();
        services.AddScoped<IRefreshTokenStore, RefreshTokenStore>();
        services.AddScoped<IPaymentProvider, MockPaymentProvider>();
        services.AddSingleton<IS3Service, S3Service>();
        services.AddScoped<OrderFsm>();
        services.AddScoped<MatchingService>();
        services.AddSingleton<DemoOrderSimulator>();

        services.AddSignalR();

        services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo { Title = "RoadHelp API", Version = "v1" });
            var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
            var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
            if (File.Exists(xmlPath)) c.IncludeXmlComments(xmlPath);

            c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Description = "JWT Authorization header using the Bearer scheme.",
                Name = "Authorization",
                In = ParameterLocation.Header,
                Type = SecuritySchemeType.ApiKey,
                Scheme = "Bearer"
            });
            c.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
                    },
                    Array.Empty<string>()
                }
            });
        });
    }

    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
        try
        {
            using var scope = app.ApplicationServices.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.Database.Migrate();
            if (env.IsDevelopment())
                DemoDataSeeder.SeedAsync(db).GetAwaiter().GetResult();
        }
        catch (InvalidOperationException)
        {
            // InMemory provider used in tests
        }

        if (env.IsDevelopment())
        {
            app.UseDeveloperExceptionPage();
            app.UseSwagger();
            app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "RoadHelp API v1"));
        }

        app.UseRouting();
        app.UseCors("FrontendCors");
        app.UseAuthentication();
        app.UseAuthorization();

        app.UseEndpoints(endpoints =>
        {
            endpoints.MapControllers();
            endpoints.MapHub<OrdersHub>("/ws/orders/tracking");
            endpoints.MapHub<ExecutorsHub>("/ws/executor/incoming");
            endpoints.MapHub<OperatorsHub>("/ws/operator/dashboard");
        });
    }
}
