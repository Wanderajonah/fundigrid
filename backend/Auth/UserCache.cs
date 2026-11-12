using FundiGrid.Api.Data;
using FundiGrid.Api.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace FundiGrid.Api.Auth;

/// <summary>
/// The Node backend re-read the signed-in user on every request and cached it
/// for 60 seconds. The same cache keeps the admin console's parallel fetches
/// from multiplying database round-trips; routes that change a user invalidate
/// the entry.
/// </summary>
public sealed class UserCache
{
    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(1);
    private readonly IMemoryCache _cache;
    private readonly FundiGridDbContext _db;

    public UserCache(IMemoryCache cache, FundiGridDbContext db)
    {
        _cache = cache;
        _db = db;
    }

    public async Task<User?> FindAsync(string id, CancellationToken ct = default)
    {
        var key = $"user:{id}";
        if (_cache.TryGetValue<User>(key, out var cached) && cached is not null)
        {
            return cached;
        }

        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null)
        {
            _cache.Remove(key);
            return null;
        }

        _cache.Set(key, user, Ttl);
        return user;
    }

    public void Invalidate(string? id)
    {
        if (!string.IsNullOrEmpty(id)) _cache.Remove($"user:{id}");
    }
}
