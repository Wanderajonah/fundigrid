using System.Text.Json;
using FundiGrid.Api.Auth;
using FundiGrid.Api.Contracts;
using FundiGrid.Api.Data;
using FundiGrid.Api.Entities;
using FundiGrid.Api.Exceptions;
using FundiGrid.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace FundiGrid.Api.Controllers;

[ApiController]
[Route("api/users")]
public sealed class UsersController : ControllerBase
{
    private readonly FundiGridDbContext _db;
    private readonly UserMapping _mapping;
    private readonly UserCache _cache;

    public UsersController(FundiGridDbContext db, UserMapping mapping, UserCache cache)
    {
        _db = db;
        _mapping = mapping;
        _cache = cache;
    }

    [HttpGet("profile")]
    [Protect]
    public async Task<IActionResult> Profile(CancellationToken ct)
    {
        var user = await _db.Users.AsNoTracking().FirstAsync(u => u.Id == HttpContext.CurrentUser().Id, ct);
        return Ok(new
        {
            success = true,
            hasPassword = !string.IsNullOrEmpty(user.Password),
            passwordWeak = PasswordPolicy.IsWeak(user.Password),
            user = await _mapping.ToResponseAsync(user, ct),
        });
    }

    [HttpPut("update")]
    [Protect]
    public async Task<IActionResult> Update(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] JsonElement body,
        CancellationToken ct)
    {
        var current = HttpContext.CurrentUser();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == current.Id, ct)
            ?? throw ApiException.NotFound("User not found");

        var touchedDocs = false;
        var touchedReferees = false;

        if (TryGet(body, "firstName", out var v)) user.FirstName = AsString(v);
        if (TryGet(body, "lastName", out v)) user.LastName = AsString(v);
        if (TryGet(body, "gender", out v)) user.Gender = AsString(v);
        if (TryGet(body, "email", out v)) user.Email = AsString(v);
        if (TryGet(body, "phone", out v)) user.Phone = AsString(v);
        if (TryGet(body, "profilePhoto", out v)) user.ProfilePhoto = AsString(v);
        if (TryGet(body, "coverPhoto", out v)) user.CoverPhoto = AsString(v);
        if (TryGet(body, "bio", out v)) user.Bio = AsString(v);
        if (TryGet(body, "locationLabel", out v)) user.LocationLabel = AsString(v);
        if (TryGet(body, "address", out v)) user.Address = AsString(v);
        if (TryGet(body, "district", out v)) user.District = AsString(v);
        if (TryGet(body, "country", out v)) user.Country = AsString(v);
        if (TryGet(body, "availableStartTime", out v)) user.AvailableStartTime = AsString(v);
        if (TryGet(body, "availableEndTime", out v)) user.AvailableEndTime = AsString(v);
        if (TryGet(body, "role", out v)) user.Role = AsString(v);
        if (TryGet(body, "onboardingComplete", out v)) user.OnboardingComplete = AsBool(v);

        if (TryGet(body, "experience", out v)) user.Experience = AsNumber(v, "experience");
        if (TryGet(body, "searchRadiusKm", out v)) user.SearchRadiusKm = AsNumber(v, "searchRadiusKm");
        if (TryGet(body, "serviceRadius", out v)) user.ServiceRadius = AsNumber(v, "serviceRadius");

        if (TryGet(body, "isOnline", out v))
        {
            user.IsOnline = v.ValueKind is JsonValueKind.True
                || (v.ValueKind == JsonValueKind.String && v.GetString() == "true")
                || (v.ValueKind == JsonValueKind.Number && v.GetDouble() == 1);
        }

        if (TryGet(body, "skills", out v)) user.Skills = AsStringArray(v, "skills");
        if (TryGet(body, "availableDays", out v)) user.AvailableDays = AsStringArray(v, "availableDays");

        if (TryGet(body, "location", out v))
        {
            var location = JsonSerializer.Deserialize<Location>(v.GetRawText(), JsonOptions)
                ?? throw ApiException.BadRequest("location must be an object");
            user.Location = location;
        }

        if (TryGet(body, "portfolioImages", out v))
        {
            if (user.Role != "fundi") throw new ApiException(403, "Only fundis can add work photos.");
            if (v.ValueKind != JsonValueKind.Array) throw ApiException.BadRequest("portfolioImages must be an array.");
            var images = v.EnumerateArray()
                .Select(e => e.ValueKind == JsonValueKind.String ? e.GetString() ?? "" : "")
                .ToArray();
            if (images.Any(s => !s.StartsWith("data:image")))
                throw ApiException.BadRequest("Work photos must be image data.");
            if (images.Length > 6) throw ApiException.BadRequest("You can keep up to 6 work photos.");
            if (images.Any(s => s.Length > 1_500_000))
                throw ApiException.BadRequest("A photo is too large. Pick a smaller image.");
            user.PortfolioImages = images;
        }

        if (TryGet(body, "verificationDocs", out v))
        {
            if (user.Role != "fundi") throw new ApiException(403, "Only fundis can upload verification documents.");
            if (v.ValueKind != JsonValueKind.Array) throw ApiException.BadRequest("verificationDocs must be an array.");
            var docs = v.EnumerateArray()
                .Select(e => e.ValueKind == JsonValueKind.String ? e.GetString() ?? "" : "")
                .ToArray();
            if (docs.Any(s => !s.StartsWith("data:image")))
                throw ApiException.BadRequest("Documents must be image data.");
            if (docs.Length > 6) throw ApiException.BadRequest("You can upload up to 6 documents.");
            if (docs.Any(s => s.Length > 2_500_000))
                throw ApiException.BadRequest("A document is too large. Photograph it smaller.");
            user.VerificationDocs = docs;
            touchedDocs = true;
        }

        if (TryGet(body, "referees", out v))
        {
            if (v.ValueKind != JsonValueKind.Array) throw ApiException.BadRequest("referees must be an array.");
            var entries = v.EnumerateArray().ToArray();
            if (entries.Length > 5) throw ApiException.BadRequest("You can keep up to 5 referees.");

            var cleaned = entries.Select(e => new
            {
                name = AsString(Get(e, "name")).Trim(),
                phone = AsString(Get(e, "phone")).Trim(),
                relationship = AsString(Get(e, "relationship")).Trim(),
            }).ToArray();

            if (cleaned.Any(r => string.IsNullOrEmpty(r.name) || string.IsNullOrEmpty(r.phone)))
                throw ApiException.BadRequest("Each referee needs a name and phone number.");

            user.Referees = JsonSerializer.SerializeToDocument(cleaned);
            touchedReferees = true;
        }

        await _db.SaveChangesAsync(ct);
        _cache.Invalidate(user.Id);

        if (touchedDocs || touchedReferees)
        {
            await RequestVerificationAsync(user, touchedDocs, ct);
        }

        return Ok(new { success = true, user = await _mapping.ToResponseAsync(user, ct) });
    }

    [HttpPut("location")]
    [Protect]
    public async Task<IActionResult> UpdateLocation(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] JsonElement body,
        CancellationToken ct)
    {
        var lat = GetNumber(body, "lat");
        var lng = GetNumber(body, "lng");
        if (lat is null || lng is null || double.IsNaN(lat.Value) || double.IsNaN(lng.Value))
        {
            throw ApiException.BadRequest("lat and lng must be numbers");
        }

        var current = HttpContext.CurrentUser();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == current.Id, ct)
            ?? throw ApiException.NotFound("User not found");

        user.Location = new Location { Lat = lat.Value, Lng = lng.Value };
        if (TryGet(body, "address", out var address))
        {
            user.LocationLabel = AsString(address);
        }

        await _db.SaveChangesAsync(ct);
        _cache.Invalidate(user.Id);

        return Ok(new { success = true, user = await _mapping.ToResponseAsync(user, ct) });
    }

    [HttpGet("notifications")]
    [Protect]
    public async Task<IActionResult> Notifications(CancellationToken ct)
    {
        var userId = HttpContext.CurrentUser().Id;
        var rows = await _db.Notifications.AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync(ct);

        return Ok(new
        {
            success = true,
            notifications = rows.Select(n => new
            {
                id = n.Id,
                userId = n.UserId,
                type = n.Type,
                title = n.Title,
                body = n.Body,
                data = n.Data,
                read = n.Read,
                createdAt = n.CreatedAt,
                updatedAt = n.UpdatedAt,
            }),
        });
    }

    [HttpGet("notifications/unread-count")]
    [Protect]
    public async Task<IActionResult> UnreadCount(CancellationToken ct)
    {
        var userId = HttpContext.CurrentUser().Id;
        var count = await _db.Notifications.AsNoTracking()
            .CountAsync(n => n.UserId == userId && !n.Read, ct);
        return Ok(new { success = true, count });
    }

    private async Task RequestVerificationAsync(User user, bool clearNote, CancellationToken ct)
    {
        var existing = await _db.FundiProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id, ct);
        var requestedAt = DateTime.UtcNow;

        if (existing is null)
        {
            _db.FundiProfiles.Add(new FundiProfile
            {
                Id = Guid.NewGuid().ToString(),
                UserId = user.Id,
                Skills = user.Skills,
                VerificationStatus = "pending",
                RequestedAt = requestedAt,
            });
            await _db.SaveChangesAsync(ct);
            return;
        }

        if (existing.VerificationStatus == "verified") return;

        existing.VerificationStatus = "pending";
        existing.Verified = false;
        if (clearNote) existing.VerificationNotes = "";
        existing.RequestedAt = requestedAt;
        existing.ReviewedAt = null;
        await _db.SaveChangesAsync(ct);
    }

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private static bool TryGet(JsonElement body, string name, out JsonElement value)
    {
        if (body.ValueKind == JsonValueKind.Object && body.TryGetProperty(name, out value))
        {
            return true;
        }
        value = default;
        return false;
    }

    private static JsonElement Get(JsonElement element, string name)
    {
        return element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var v) ? v : default;
    }

    private static string AsString(JsonElement value)
    {
        return value.ValueKind switch
        {
            JsonValueKind.String => value.GetString() ?? "",
            JsonValueKind.Null => "",
            JsonValueKind.Undefined => "",
            _ => value.ToString(),
        };
    }

    private static bool AsBool(JsonElement value)
    {
        return value.ValueKind switch
        {
            JsonValueKind.True => true,
            JsonValueKind.String => string.Equals(value.GetString(), "true", StringComparison.OrdinalIgnoreCase),
            JsonValueKind.Number => value.GetDouble() != 0,
            _ => false,
        };
    }

    private static double AsNumber(JsonElement value, string field)
    {
        if (value.ValueKind == JsonValueKind.Number) return value.GetDouble();
        if (value.ValueKind == JsonValueKind.String
            && double.TryParse(value.GetString(), out var parsed)) return parsed;
        throw ApiException.BadRequest($"{field} must be a number");
    }

    private static double? GetNumber(JsonElement body, string name)
    {
        if (!TryGet(body, name, out var value)) return null;
        if (value.ValueKind == JsonValueKind.Number) return value.GetDouble();
        if (value.ValueKind == JsonValueKind.String && double.TryParse(value.GetString(), out var parsed)) return parsed;
        return double.NaN;
    }

    private static string[] AsStringArray(JsonElement value, string field)
    {
        if (value.ValueKind != JsonValueKind.Array) throw ApiException.BadRequest($"{field} must be an array.");
        return value.EnumerateArray()
            .Select(e => e.ValueKind == JsonValueKind.String ? e.GetString() ?? "" : e.ToString())
            .ToArray();
    }
}
