using System.Text.Json;
using FundiGrid.Api.Data;
using FundiGrid.Api.Entities;

namespace FundiGrid.Api.Services;

/// <summary>Append-only audit trail. A failed write must never break the action.</summary>
public sealed class AuditService
{
    private readonly FundiGridDbContext _db;
    private readonly ILogger<AuditService> _logger;

    public AuditService(FundiGridDbContext db, ILogger<AuditService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task RecordAsync(
        HttpContext? http,
        User? actor,
        string action,
        string category,
        string entityType = "",
        string entityId = "",
        string summary = "",
        object? meta = null,
        string? actorName = null,
        string? actorRole = null,
        CancellationToken ct = default)
    {
        try
        {
            var (ip, userAgent) = RequestMeta(http);
            var name = actor is not null ? NameOf(actor) : (actorName ?? "");

            _db.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid().ToString(),
                ActorId = actor?.Id,
                ActorName = name,
                ActorRole = actor?.Role.ToLowerInvariant() ?? (actorRole ?? ""),
                Action = action,
                Category = category,
                EntityType = entityType,
                EntityId = entityId,
                Summary = summary,
                IpAddress = ip,
                UserAgent = userAgent,
                Meta = meta is null ? JsonSerializer.SerializeToDocument(new { }) : JsonSerializer.SerializeToDocument(meta),
                CreatedAt = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[audit] failed to record {Action}", action);
        }
    }

    public static string NameOf(User user)
    {
        var full = $"{user.FirstName} {user.LastName}".Trim();
        return !string.IsNullOrEmpty(full) ? full : (user.Email ?? user.Phone ?? "");
    }

    private static (string Ip, string UserAgent) RequestMeta(HttpContext? http)
    {
        if (http is null) return ("", "");
        var forwarded = http.Request.Headers["X-Forwarded-For"].ToString();
        var ip = !string.IsNullOrEmpty(forwarded)
            ? forwarded.Split(',')[0]
            : http.Connection.RemoteIpAddress?.ToString() ?? "";
        var agent = http.Request.Headers.UserAgent.ToString();
        if (agent.Length > 250) agent = agent[..250];
        return (ip.Trim(), agent);
    }
}
