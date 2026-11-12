using FundiGrid.Api.Data;
using FundiGrid.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace FundiGrid.Api.Services;

/// <summary>
/// Re-seeds the web admin account on every boot, matching the Node backend:
/// the configured email owns an admin row whose password is reset to the
/// configured value.
/// </summary>
public sealed class AdminSeeder : IHostedService
{
    private readonly IServiceProvider _services;
    private readonly IConfiguration _config;
    private readonly ILogger<AdminSeeder> _logger;

    public AdminSeeder(IServiceProvider services, IConfiguration config, ILogger<AdminSeeder> logger)
    {
        _services = services;
        _config = config;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = _services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FundiGridDbContext>();

            var name = (_config["ADMIN_NAME"] ?? "FundiGrid Admin").Trim();
            var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var firstName = parts.Length > 0 ? parts[0] : "Admin";
            var lastName = parts.Length > 1 ? string.Join(' ', parts.Skip(1)) : "";
            var email = (_config["ADMIN_EMAIL"] ?? "admin@ufundi.ug").Trim().ToLowerInvariant();
            var password = _config["ADMIN_PASSWORD"] ?? "password123";

            var admin = await db.Users.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
            if (admin is null)
            {
                admin = new User { Id = Guid.NewGuid().ToString(), Email = email };
                db.Users.Add(admin);
            }

            admin.FirstName = firstName;
            admin.LastName = lastName;
            admin.Email = email;
            admin.Password = BCrypt.Net.BCrypt.HashPassword(password, 10);
            admin.Role = "admin";
            admin.PhoneVerified = true;
            admin.OnboardingComplete = true;
            admin.Status = "active";

            await db.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Admin user ready: {Email}", email);
        }
        catch (Exception ex)
        {
            // A missing/unreachable database must not take the API down before
            // it can serve health checks.
            _logger.LogError(ex, "Admin creation failed");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
