using FundiGrid.Api.Data;
using FundiGrid.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace FundiGrid.Api.Services;

/// <summary>
/// Ensures the web admin account exists. Credentials live in the database:
/// ADMIN_EMAIL/ADMIN_PASSWORD only bootstrap a brand-new database, and never
/// overwrite an existing admin's password unless ADMIN_RESET_PASSWORD=true is
/// set explicitly.
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
            var email = (_config["ADMIN_EMAIL"] ?? "").Trim().ToLowerInvariant();
            var bootstrapPassword = _config["ADMIN_PASSWORD"];
            var resetPassword = string.Equals(
                _config["ADMIN_RESET_PASSWORD"], "true", StringComparison.OrdinalIgnoreCase);

            // With no ADMIN_EMAIL configured, fall back to the existing admin
            // row so boot never creates a duplicate account.
            var admin = string.IsNullOrEmpty(email)
                ? await db.Users
                    .Where(u => u.Role == "admin")
                    .OrderBy(u => u.CreatedAt)
                    .FirstOrDefaultAsync(cancellationToken)
                : await db.Users.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);

            if (admin is null)
            {
                if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(bootstrapPassword))
                {
                    _logger.LogWarning(
                        "No admin account found and ADMIN_EMAIL/ADMIN_PASSWORD are not both set; skipping admin seed");
                    return;
                }

                admin = new User
                {
                    Id = Guid.NewGuid().ToString(),
                    Email = email,
                    Password = BCrypt.Net.BCrypt.HashPassword(bootstrapPassword, 10),
                };
                db.Users.Add(admin);
                _logger.LogInformation("Admin user created: {Email}", email);
            }
            else if (resetPassword && !string.IsNullOrEmpty(bootstrapPassword))
            {
                admin.Password = BCrypt.Net.BCrypt.HashPassword(bootstrapPassword, 10);
                _logger.LogWarning("Admin password reset from ADMIN_PASSWORD (ADMIN_RESET_PASSWORD=true)");
            }

            admin.FirstName = firstName;
            admin.LastName = lastName;
            admin.Role = "admin";
            admin.PhoneVerified = true;
            admin.OnboardingComplete = true;
            admin.Status = "active";

            await db.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Admin user ready: {Email}", admin.Email);
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
