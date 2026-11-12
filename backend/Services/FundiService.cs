using FundiGrid.Api.Contracts;
using FundiGrid.Api.Data;
using FundiGrid.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace FundiGrid.Api.Services;

/// <summary>Fundi directory: verified-only listing with distance/category/area filters.</summary>
public sealed class FundiService
{
    private readonly FundiGridDbContext _db;

    public FundiService(FundiGridDbContext db)
    {
        _db = db;
    }

    public static string[] NormaliseSkills(User user, FundiProfile? profile)
    {
        var values = (user.Skills ?? Array.Empty<string>())
            .Concat(profile?.Skills ?? Array.Empty<string>())
            .Select(s => (s ?? "").Trim())
            .Where(s => s.Length > 0);
        return values.Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
    }

    public static bool HasCoords(Location? loc)
    {
        if (loc is null) return false;
        if (!double.IsFinite(loc.Lat) || !double.IsFinite(loc.Lng)) return false;
        if (loc.Lat == 0 && loc.Lng == 0) return false;
        return Math.Abs(loc.Lat) <= 90 && Math.Abs(loc.Lng) <= 180;
    }

    public static double DistanceKm(Location a, Location b)
    {
        static double ToRad(double d) => d * Math.PI / 180;
        var dLat = ToRad(b.Lat - a.Lat);
        var dLng = ToRad(b.Lng - a.Lng);
        var h = Math.Pow(Math.Sin(dLat / 2), 2)
            + Math.Cos(ToRad(a.Lat)) * Math.Cos(ToRad(b.Lat)) * Math.Pow(Math.Sin(dLng / 2), 2);
        return 2 * 6371 * Math.Asin(Math.Min(1, Math.Sqrt(h)));
    }

    public static bool MatchesCategory(string[] skills, string? category)
    {
        var wanted = (category ?? "").Trim().ToLowerInvariant();
        if (wanted.Length == 0) return true;
        return skills.Any(s => (s ?? "").Trim().ToLowerInvariant() == wanted);
    }

    public static bool MatchesArea(User fundi, string? area)
    {
        var parts = (area ?? "").Split(',')
            .Select(p => p.Trim().ToLowerInvariant())
            .Where(p => p.Length > 0)
            .ToArray();
        if (parts.Length == 0) return true;

        var fields = new[] { fundi.LocationLabel, fundi.Address, fundi.District }
            .Select(f => (f ?? "").ToLowerInvariant());
        return fields.Any(field => parts.Any(part => field.Contains(part)));
    }

    public static FundiResponse ToFundi(User user, FundiProfile? profile, bool includePortfolio = false)
    {
        var skills = NormaliseSkills(user, profile);
        var portfolio = (user.PortfolioImages ?? Array.Empty<string>())
            .Concat(profile?.PortfolioImages ?? Array.Empty<string>())
            .Distinct()
            .ToArray();

        return new FundiResponse
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Name = user.FullName,
            Role = user.Role,
            Skills = skills,
            Location = user.Location,
            LocationLabel = user.LocationLabel,
            Address = user.Address,
            District = user.District,
            Country = user.Country,
            Experience = user.Experience,
            Bio = user.Bio,
            ProfilePhoto = user.ProfilePhoto,
            Status = user.Status,
            ServiceRadius = user.ServiceRadius,
            AvailableDays = user.AvailableDays,
            AvailableStartTime = user.AvailableStartTime,
            AvailableEndTime = user.AvailableEndTime,
            OnboardingComplete = user.OnboardingComplete,
            CreatedAt = user.CreatedAt,
            PortfolioImages = includePortfolio ? portfolio : null,
            Rating = profile?.Rating ?? 0,
            ReviewCount = profile?.JobsCompleted ?? 0,
            Verified = profile?.Verified ?? false,
            VerificationStatus = profile?.VerificationStatus ?? "unverified",
            IsAvailable = profile?.IsAvailable ?? true,
        };
    }

    public async Task<List<FundiResponse>> ListFundisAsync(
        string? lat, string? lng, string? radius, string? category, string? area,
        CancellationToken ct = default)
    {
        var users = await _db.Users.AsNoTracking()
            .Where(u => u.Role == "fundi" && u.Status == "active")
            .ToListAsync(ct);
        var profiles = await _db.FundiProfiles.AsNoTracking().ToListAsync(ct);
        var byUser = profiles.ToDictionary(p => p.UserId);

        var rows = users
            .Select(u => ToFundi(u, byUser.GetValueOrDefault(u.Id)))
            .Where(f => f.Verified)
            .ToList();

        if (!string.IsNullOrEmpty(category))
        {
            rows = rows.Where(f => MatchesCategory(f.Skills, category)).ToList();
        }

        if (!string.IsNullOrEmpty(area))
        {
            rows = rows.Where(f => MatchesArea(users.First(u => u.Id == f.Id), area)).ToList();
        }

        var hasOrigin = !string.IsNullOrWhiteSpace(lat) && !string.IsNullOrWhiteSpace(lng);
        if (hasOrigin)
        {
            var origin = new Location
            {
                Lat = double.TryParse(lat, out var parsedLat) ? parsedLat : double.NaN,
                Lng = double.TryParse(lng, out var parsedLng) ? parsedLng : double.NaN,
            };
            var maxKm = double.TryParse(radius, out var parsedRadius) && parsedRadius > 0 ? parsedRadius : 10;

            if (double.IsFinite(origin.Lat) && double.IsFinite(origin.Lng))
            {
                rows = rows
                    .Where(f => HasCoords(f.Location))
                    .Select(f =>
                    {
                        var km = DistanceKm(origin, f.Location);
                        var ownRadius = f.ServiceRadius;
                        var willing = !double.IsFinite(ownRadius) || ownRadius <= 0 || km <= ownRadius;
                        f.DistanceKm = Math.Round(km * 10, MidpointRounding.AwayFromZero) / 10;
                        return (Fundi: f, Willing: willing);
                    })
                    .Where(x => x.Willing && x.Fundi.DistanceKm <= maxKm)
                    .OrderBy(x => x.Fundi.DistanceKm)
                    .Select(x => x.Fundi)
                    .ToList();
            }
        }
        else
        {
            rows = rows.OrderByDescending(f => f.Rating).ToList();
        }

        return rows;
    }

    public async Task<FundiResponse?> GetFundiAsync(string id, CancellationToken ct = default)
    {
        var user = await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id && u.Role == "fundi", ct);
        if (user is null) return null;

        var profile = await _db.FundiProfiles.AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == id, ct);

        return ToFundi(user, profile, includePortfolio: true);
    }
}

public sealed class FundiResponse
{
    public string Id { get; set; } = "";
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string Name { get; set; } = "";
    public string Role { get; set; } = "";
    public string[] Skills { get; set; } = Array.Empty<string>();
    public Location Location { get; set; } = Location.Zero;
    public string LocationLabel { get; set; } = "";
    public string Address { get; set; } = "";
    public string District { get; set; } = "";
    public string Country { get; set; } = "";
    public double Experience { get; set; }
    public string Bio { get; set; } = "";
    public string ProfilePhoto { get; set; } = "";
    public string Status { get; set; } = "";
    public double ServiceRadius { get; set; }
    public string[] AvailableDays { get; set; } = Array.Empty<string>();
    public string AvailableStartTime { get; set; } = "";
    public string AvailableEndTime { get; set; } = "";
    public bool OnboardingComplete { get; set; }
    public DateTime CreatedAt { get; set; }
    public string[]? PortfolioImages { get; set; }
    public double Rating { get; set; }
    public double ReviewCount { get; set; }
    public bool Verified { get; set; }
    public string VerificationStatus { get; set; } = "";
    public bool IsAvailable { get; set; }
    public double? DistanceKm { get; set; }
    public string? Phone { get; set; }
}
