using System.Globalization;
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
using Npgsql;

namespace FundiGrid.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Protect("admin")]
public sealed class AdminController : ControllerBase
{
    private static readonly CultureInfo EnGb = CultureInfo.GetCultureInfo("en-GB");
    private static readonly string[] VerificationStatuses = { "pending", "verified", "rejected", "unverified" };

    private readonly FundiGridDbContext _db;
    private readonly AuditService _audit;
    private readonly UserCache _cache;

    public AdminController(FundiGridDbContext db, AuditService audit, UserCache cache)
    {
        _db = db;
        _audit = audit;
        _cache = cache;
    }

    // ── Requests ─────────────────────────────────────────────────────────

    [HttpGet("requests")]
    public async Task<IActionResult> Requests(CancellationToken ct)
    {
        var rows = await _db.Bookings.AsNoTracking()
            .OrderByDescending(b => b.CreatedAt)
            .Take(200)
            .ToListAsync(ct);

        var clientIds = rows.Select(r => r.ClientId).Where(id => !string.IsNullOrEmpty(id)).Distinct().ToArray();
        var clients = await _db.Users.AsNoTracking()
            .Where(u => clientIds.Contains(u.Id))
            .Select(u => new { u.Id, u.FirstName, u.LastName, u.Phone })
            .ToDictionaryAsync(u => u.Id, ct);

        return Ok(new
        {
            success = true,
            requests = rows.Select(row =>
            {
                var client = clients.GetValueOrDefault(row.ClientId);
                var response = BookingResponse.From(row);
                return new
                {
                    response.Id,
                    response.ClientId,
                    response.FundiId,
                    response.FundiName,
                    response.ScheduledFor,
                    response.Category,
                    response.Description,
                    response.Address,
                    response.Location,
                    response.Status,
                    response.CancelledBy,
                    response.CancellationReason,
                    response.DisputeReason,
                    response.NotifiedFundis,
                    response.ExpiresAt,
                    response.AcceptedAt,
                    response.OnTheWayAt,
                    response.ArrivedAt,
                    response.StartedAt,
                    response.CompletedAt,
                    response.ClientCompleted,
                    response.FundiCompleted,
                    response.ClientCompletedAt,
                    response.FundiCompletedAt,
                    response.CancelledAt,
                    response.FundiLocation,
                    response.Images,
                    response.EstimatedDuration,
                    response.ActualDuration,
                    response.Estimate,
                    response.ProposedPrice,
                    response.ProposedBy,
                    response.ClientPriceAgreed,
                    response.FundiPriceAgreed,
                    response.AgreedPrice,
                    response.PriceAgreed,
                    response.PaymentStatus,
                    response.EscrowHeldAt,
                    response.EscrowReleasedAt,
                    response.EscrowAmount,
                    response.ClientFee,
                    response.CreatedAt,
                    response.UpdatedAt,
                    clientName = client is null ? "Client" : (NameOf(client.FirstName, client.LastName) is { Length: > 0 } n ? n : "Client"),
                    clientPhone = client?.Phone ?? "",
                };
            }),
        });
    }

    [HttpGet("requests/{id}")]
    public async Task<IActionResult> GetRequest(string id, CancellationToken ct)
    {
        var booking = await _db.Bookings.AsNoTracking().FirstOrDefaultAsync(b => b.Id == id, ct);
        if (booking is null) throw ApiException.NotFound("Request not found");

        var client = await _db.Users.AsNoTracking()
            .Where(u => u.Id == booking.ClientId)
            .Select(u => new { u.FirstName, u.LastName, u.Phone })
            .FirstOrDefaultAsync(ct);

        var response = BookingResponse.From(booking);
        return Ok(new
        {
            success = true,
            booking = new
            {
                response.Id,
                response.ClientId,
                response.FundiId,
                response.FundiName,
                response.ScheduledFor,
                response.Category,
                response.Description,
                response.Address,
                response.Location,
                response.Status,
                response.CancelledBy,
                response.CancellationReason,
                response.DisputeReason,
                response.NotifiedFundis,
                response.ExpiresAt,
                response.AcceptedAt,
                response.OnTheWayAt,
                response.ArrivedAt,
                response.StartedAt,
                response.CompletedAt,
                response.ClientCompleted,
                response.FundiCompleted,
                response.ClientCompletedAt,
                response.FundiCompletedAt,
                response.CancelledAt,
                response.FundiLocation,
                response.Images,
                response.EstimatedDuration,
                response.ActualDuration,
                response.Estimate,
                response.ProposedPrice,
                response.ProposedBy,
                response.ClientPriceAgreed,
                response.FundiPriceAgreed,
                response.AgreedPrice,
                response.PriceAgreed,
                response.PaymentStatus,
                response.EscrowHeldAt,
                response.EscrowReleasedAt,
                response.EscrowAmount,
                response.ClientFee,
                response.CreatedAt,
                response.UpdatedAt,
                clientName = client is null ? "Client" : (NameOf(client.FirstName, client.LastName) is { Length: > 0 } n ? n : "Client"),
                clientPhone = client?.Phone ?? "",
            },
            estimate = booking.Estimate,
        });
    }

    // ── Users ────────────────────────────────────────────────────────────

    [HttpGet("users")]
    public async Task<IActionResult> Users(CancellationToken ct)
    {
        var rows = await _db.Users.AsNoTracking()
            .OrderByDescending(u => u.CreatedAt)
            .Take(500)
            .ToListAsync(ct);
        return Ok(new { success = true, users = rows.Select(ToAdminUser) });
    }

    [HttpPost("users")]
    public async Task<IActionResult> CreateUser(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] JsonElement body,
        CancellationToken ct)
    {
        var firstName = (Str(body, "firstName") ?? "").Trim();
        var lastName = (Str(body, "lastName") ?? "").Trim();
        var phone = UserMapping.NormalisePhone(Str(body, "phone"));
        var email = (Str(body, "email") ?? "").Trim().ToLowerInvariant();
        var password = Str(body, "password") ?? "";
        var role = Str(body, "role") is "customer" or "fundi" or "admin" ? Str(body, "role")! : "customer";
        var skills = SkillsFrom(body);
        var district = (Str(body, "district") ?? "").Trim();

        if (string.IsNullOrEmpty(firstName) || string.IsNullOrEmpty(lastName))
            throw ApiException.BadRequest("First and last name are required");
        if (phone.Length < 9) throw ApiException.BadRequest("Enter a valid phone number");
        if (string.IsNullOrEmpty(email)) throw ApiException.BadRequest("Email is required — it is what they sign in with");

        var policy = PasswordPolicy.Validate(password);
        if (!policy.Ok) throw ApiException.BadRequest(policy.Message);

        if (await _db.Users.AnyAsync(u => u.Phone == phone, ct))
            throw new ApiException(409, "That phone number already has an account");
        if (await _db.Users.AnyAsync(u => u.Email == email, ct))
            throw new ApiException(409, "That email already has an account");

        var user = new User
        {
            Id = Guid.NewGuid().ToString(),
            FirstName = firstName,
            LastName = lastName,
            Phone = phone,
            Email = email,
            Password = BCrypt.Net.BCrypt.HashPassword(password, 10),
            Role = role,
            Status = "active",
            PhoneVerified = true,
            OnboardingComplete = true,
            Skills = skills,
            District = district,
            FundiEnabled = role == "fundi",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.Users.Add(user);
        // Save the user first: fundiprofiles has a foreign key and EF does not
        // know the ordering without a configured relationship.
        await _db.SaveChangesAsync(ct);

        if (role == "fundi")
        {
            _db.FundiProfiles.Add(new FundiProfile
            {
                Id = Guid.NewGuid().ToString(),
                UserId = user.Id,
                Skills = skills,
                VerificationStatus = "pending",
            });
            await _db.SaveChangesAsync(ct);
        }

        await _audit.RecordAsync(HttpContext, HttpContext.CurrentUser(), "user.created", "users",
            "user", user.Id,
            $"Created {RoleLabel(role)} account for {firstName} {lastName}",
            new { role, phone, email }, ct: ct);

        return StatusCode(201, new { success = true, user = ToAdminUser(user) });
    }

    [HttpPatch("users/{id}")]
    public async Task<IActionResult> UpdateUser(
        string id,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] JsonElement body,
        CancellationToken ct)
    {
        var target = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct)
            ?? throw ApiException.NotFound("User not found");

        var status = Str(body, "status") ?? "";
        if (status is not ("active" or "inactive"))
            throw ApiException.BadRequest("Status must be active or inactive");
        if (target.Id == HttpContext.CurrentUser().Id && status != "active")
            throw ApiException.BadRequest("You cannot deactivate your own account");

        var from = target.Status;
        target.Status = status;
        await _db.SaveChangesAsync(ct);
        _cache.Invalidate(target.Id);

        await _audit.RecordAsync(HttpContext, HttpContext.CurrentUser(),
            status == "active" ? "user.activated" : "user.deactivated", "users",
            "user", target.Id,
            $"Set {(NameOf(target.FirstName, target.LastName) is { Length: > 0 } n ? n : (target.Phone ?? target.Email))} to {status}",
            new { from, to = status }, ct: ct);

        return Ok(new { success = true, user = ToAdminUser(target) });
    }

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(string id, CancellationToken ct)
    {
        var target = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct)
            ?? throw ApiException.NotFound("User not found");
        if (target.Id == HttpContext.CurrentUser().Id)
            throw ApiException.BadRequest("You cannot delete your own account");

        if (target.Role == "admin" && await _db.Users.CountAsync(u => u.Role == "admin", ct) <= 1)
            throw ApiException.BadRequest("Keep at least one admin account");

        var hasHistory = await _db.Bookings.AnyAsync(b => b.ClientId == target.Id || b.FundiId == target.Id, ct);
        if (hasHistory)
        {
            return StatusCode(409, new
            {
                success = false,
                message = "This account has job history — deactivate it instead of deleting",
            });
        }

        try
        {
            if (target.Role == "fundi")
            {
                var profiles = await _db.FundiProfiles.Where(p => p.UserId == target.Id).ToListAsync(ct);
                _db.FundiProfiles.RemoveRange(profiles);
                // Delete the profile first: the foreign key blocks removing the
                // user while a profile row still points at it.
                await _db.SaveChangesAsync(ct);
            }
            _db.Users.Remove(target);
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "23503" })
        {
            return StatusCode(409, new
            {
                success = false,
                message = "This account is linked to existing records — deactivate it instead",
            });
        }

        _cache.Invalidate(target.Id);
        await _audit.RecordAsync(HttpContext, HttpContext.CurrentUser(), "user.deleted", "users",
            "user", target.Id,
            $"Deleted {RoleLabel(target.Role)} account {(NameOf(target.FirstName, target.LastName) is { Length: > 0 } n ? n : (target.Phone ?? target.Email))}",
            new { role = target.Role, phone = target.Phone, email = target.Email }, ct: ct);

        return Ok(new { success = true, id = target.Id });
    }

    // ── Fundis ───────────────────────────────────────────────────────────

    [HttpGet("fundis")]
    public async Task<IActionResult> Fundis(CancellationToken ct)
    {
        var users = await _db.Users.AsNoTracking()
            .Where(u => u.Role == "fundi")
            .OrderByDescending(u => u.CreatedAt)
            .Take(500)
            .ToListAsync(ct);
        var profiles = await _db.FundiProfiles.AsNoTracking().ToListAsync(ct);
        var byUser = profiles.ToDictionary(p => p.UserId);

        return Ok(new
        {
            success = true,
            fundis = users.Select(u => ToAdminFundi(u, byUser.GetValueOrDefault(u.Id))),
        });
    }

    [HttpPatch("fundis/{id}")]
    public async Task<IActionResult> UpdateFundi(
        string id,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] JsonElement body,
        CancellationToken ct)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && u.Role == "fundi", ct);
        if (user is null) throw ApiException.NotFound("Fundi not found");

        var status = Str(body, "status") ?? "";
        if (status is not ("active" or "inactive"))
            throw ApiException.BadRequest("Status must be active or inactive");
        if (user.Id == HttpContext.CurrentUser().Id && status != "active")
            throw ApiException.BadRequest("You cannot suspend your own account");

        var from = user.Status;
        user.Status = status;
        await _db.SaveChangesAsync(ct);
        _cache.Invalidate(user.Id);

        var profile = await _db.FundiProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == user.Id, ct);
        await _audit.RecordAsync(HttpContext, HttpContext.CurrentUser(),
            status == "active" ? "fundi.activated" : "fundi.suspended", "users",
            "user", user.Id,
            $"{(status == "active" ? "Reactivated" : "Suspended")} fundi {(NameOf(user.FirstName, user.LastName) is { Length: > 0 } n ? n : user.Phone)}",
            new { from, to = status }, ct: ct);

        return Ok(new { success = true, fundi = ToAdminFundi(user, profile) });
    }

    // ── Verification queue ───────────────────────────────────────────────

    [HttpGet("verifications")]
    public async Task<IActionResult> Verifications([FromQuery] string? status, CancellationToken ct)
    {
        var wanted = string.IsNullOrEmpty(status) ? "pending" : status;
        if (!VerificationStatuses.Contains(wanted))
            throw ApiException.BadRequest("Unknown verification status");

        var users = await _db.Users.AsNoTracking()
            .Where(u => u.Role == "fundi")
            .OrderByDescending(u => u.CreatedAt)
            .Take(500)
            .ToListAsync(ct);
        var profiles = await _db.FundiProfiles.AsNoTracking().ToListAsync(ct);
        var byUser = profiles.ToDictionary(p => p.UserId);

        var rows = users.Select(u =>
        {
            var profile = byUser.GetValueOrDefault(u.Id);
            var skills = (u.Skills ?? Array.Empty<string>())
                .Concat(profile?.Skills ?? Array.Empty<string>())
                .Select(s => (s ?? "").Trim())
                .Where(s => s.Length > 0)
                .Distinct()
                .ToArray();
            return new
            {
                userId = u.Id,
                name = NameOf(u.FirstName, u.LastName) is { Length: > 0 } n ? n : (u.Phone ?? "Fundi"),
                phone = u.Phone ?? "",
                email = u.Email ?? "",
                trade = u.Skills is { Length: > 0 } ? u.Skills[0] : (profile?.Skills is { Length: > 0 } ? profile.Skills[0] : ""),
                skills,
                location = !string.IsNullOrEmpty(u.District) ? u.District : (ShortLabel(u.LocationLabel) is { Length: > 0 } sl ? sl : "Uganda"),
                bio = !string.IsNullOrEmpty(profile?.Bio) ? profile!.Bio : u.Bio,
                experience = profile?.Experience ?? u.Experience,
                docs = u.VerificationDocs,
                referees = u.Referees,
                status = profile?.VerificationStatus ?? (u.VerificationDocs.Length > 0 ? "pending" : "unverified"),
                verified = profile?.Verified ?? false,
                note = profile?.VerificationNotes ?? "",
                requestedAt = profile?.RequestedAt,
                reviewedAt = profile?.ReviewedAt,
                createdAt = u.CreatedAt,
            };
        });

        var filtered = wanted == "unverified" ? rows : rows.Where(r => r.status == wanted);
        return Ok(new { success = true, verifications = filtered });
    }

    [HttpPost("verifications/{userId}")]
    public async Task<IActionResult> ReviewVerification(
        string userId,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] JsonElement body,
        CancellationToken ct)
    {
        var decision = Str(body, "decision") ?? "";
        if (decision is not ("approve" or "reject"))
            throw ApiException.BadRequest("Decision must be approve or reject");

        var note = (Str(body, "note") ?? "").Trim();
        if (decision == "reject" && string.IsNullOrEmpty(note))
            throw ApiException.BadRequest("Tell the fundi what needs fixing");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId && u.Role == "fundi", ct);
        if (user is null) throw ApiException.NotFound("Fundi not found");

        var reviewedAt = DateTime.UtcNow;
        var profile = await _db.FundiProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id, ct);
        if (profile is null)
        {
            profile = new FundiProfile { Id = Guid.NewGuid().ToString(), UserId = user.Id };
            _db.FundiProfiles.Add(profile);
        }

        profile.VerificationStatus = decision == "approve" ? "verified" : "rejected";
        profile.Verified = decision == "approve";
        profile.VerificationNotes = note;
        profile.ReviewedAt = reviewedAt;
        if (decision == "approve") profile.RequestedAt = reviewedAt;
        await _db.SaveChangesAsync(ct);

        var displayName = NameOf(user.FirstName, user.LastName) is { Length: > 0 } n ? n : (user.Phone ?? "Fundi");

        await _audit.RecordAsync(HttpContext, HttpContext.CurrentUser(),
            decision == "approve" ? "verification.approved" : "verification.rejected", "verifications",
            "user", user.Id,
            $"{(decision == "approve" ? "Approved" : "Rejected")} verification for {displayName}",
            new { note, phone = user.Phone }, ct: ct);

        return Ok(new
        {
            success = true,
            verification = new
            {
                userId = user.Id,
                name = displayName,
                status = profile.VerificationStatus,
                verified = profile.Verified,
                note = profile.VerificationNotes,
                reviewedAt,
            },
        });
    }

    // ── Bookings ─────────────────────────────────────────────────────────

    [HttpGet("bookings")]
    public async Task<IActionResult> Bookings(CancellationToken ct)
    {
        var rows = await _db.Bookings.AsNoTracking()
            .OrderByDescending(b => b.CreatedAt)
            .Take(300)
            .ToListAsync(ct);

        var peopleIds = rows.SelectMany(r => new[] { r.ClientId, r.FundiId })
            .Where(id => !string.IsNullOrEmpty(id))
            .Distinct()
            .ToArray();
        var people = await _db.Users.AsNoTracking()
            .Where(u => peopleIds.Contains(u.Id))
            .Select(u => new { u.Id, u.FirstName, u.LastName, u.Phone })
            .ToDictionaryAsync(u => u.Id, ct);

        return Ok(new
        {
            success = true,
            bookings = rows.Select(row => new
            {
                id = row.Id,
                category = string.IsNullOrEmpty(row.Category) ? "Service" : row.Category,
                clientId = row.ClientId,
                client = NameOf(people.GetValueOrDefault(row.ClientId)?.FirstName, people.GetValueOrDefault(row.ClientId)?.LastName) is { Length: > 0 } c ? c : "Client",
                fundiId = row.FundiId ?? "",
                fundi = !string.IsNullOrEmpty(row.FundiId)
                    ? (NameOf(people.GetValueOrDefault(row.FundiId)?.FirstName, people.GetValueOrDefault(row.FundiId)?.LastName) is { Length: > 0 } f ? f : (string.IsNullOrEmpty(row.FundiName) ? "Unassigned" : row.FundiName))
                    : "Unassigned",
                address = row.Address,
                amount = BookingPrice(row),
                priceAgreed = row.PriceAgreed,
                status = BookingStatusLabel(row.Status),
                createdAt = row.CreatedAt,
            }),
        });
    }

    // ── Audit trail ──────────────────────────────────────────────────────

    [HttpGet("audit-logs")]
    public async Task<IActionResult> AuditLogs(
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        [FromQuery] string? category,
        [FromQuery] string? action,
        [FromQuery] string? search,
        [FromQuery] string? from,
        [FromQuery] string? to,
        CancellationToken ct)
    {
        var currentPage = Math.Max(1, page ?? 1);
        var size = Math.Min(100, Math.Max(5, pageSize ?? 25));

        var query = _db.AuditLogs.AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(category)) query = query.Where(l => l.Category == category);
        if (!string.IsNullOrEmpty(action)) query = query.Where(l => l.Action == action);

        var term = (search ?? "").Trim();
        if (term.Length > 0)
        {
            var like = $"%{term}%";
            query = query.Where(l =>
                EF.Functions.ILike(l.ActorName, like)
                || EF.Functions.ILike(l.Summary, like)
                || EF.Functions.ILike(l.EntityId, like)
                || EF.Functions.ILike(l.Action, like));
        }

        if (DateTimeOffset.TryParse(from, out var fromAt)) query = query.Where(l => l.CreatedAt >= fromAt.UtcDateTime);
        if (DateTimeOffset.TryParse(to, out var toAt)) query = query.Where(l => l.CreatedAt <= toAt.UtcDateTime);

        var total = await query.CountAsync(ct);
        var logs = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((currentPage - 1) * size)
            .Take(size)
            .ToListAsync(ct);

        return Ok(new
        {
            success = true,
            logs = logs.Select(l => new
            {
                id = l.Id,
                actorId = l.ActorId,
                actorName = l.ActorName,
                actorRole = l.ActorRole,
                action = l.Action,
                category = l.Category,
                entityType = l.EntityType,
                entityId = l.EntityId,
                summary = l.Summary,
                ipAddress = l.IpAddress,
                userAgent = l.UserAgent,
                meta = l.Meta,
                createdAt = l.CreatedAt,
            }),
            total,
            page = currentPage,
            pageSize = size,
        });
    }

    // ── Stats ────────────────────────────────────────────────────────────

    [HttpGet("stats")]
    public async Task<IActionResult> Stats(CancellationToken ct)
    {
        var users = await _db.Users.AsNoTracking()
            .Select(u => new { u.Id, u.Role, u.Status, u.CreatedAt })
            .ToListAsync(ct);
        var rows = await _db.Bookings.AsNoTracking()
            .OrderByDescending(b => b.CreatedAt)
            .Take(500)
            .Select(b => new { b.Category, b.Status, b.AgreedPrice, b.ProposedPrice, b.Estimate, b.CreatedAt })
            .ToListAsync(ct);
        var profiles = await _db.FundiProfiles.AsNoTracking()
            .Select(p => new { p.UserId, p.VerificationStatus })
            .ToListAsync(ct);

        var pendingFundiIds = profiles
            .Where(p => p.VerificationStatus == "pending")
            .Select(p => p.UserId)
            .ToHashSet();

        var userCounts = new
        {
            total = users.Count,
            clients = users.Count(u => u.Role != "fundi" && u.Role != "admin"),
            fundis = users.Count(u => u.Role == "fundi"),
            admins = users.Count(u => u.Role == "admin"),
            active = users.Count(u => u.Status == "active"),
            activeFundis = users.Count(u => u.Role == "fundi" && u.Status == "active"),
            pendingFundis = users.Count(u => u.Role == "fundi" && pendingFundiIds.Contains(u.Id)),
        };

        var completed = 0;
        var cancelled = 0;
        var active = 0;
        var byService = new Dictionary<string, int>();
        double completedValue = 0;

        foreach (var row in rows)
        {
            var service = string.IsNullOrEmpty(row.Category) ? "Service" : row.Category;
            byService[service] = byService.GetValueOrDefault(service) + 1;

            if (row.Status == "COMPLETED")
            {
                completed += 1;
                completedValue += BookingPrice(row.AgreedPrice, row.ProposedPrice, row.Estimate?.Total);
            }
            else if (row.Status == "CANCELLED")
            {
                cancelled += 1;
            }
            else
            {
                active += 1;
            }
        }

        var today = DateTime.Now.Date;
        var trend = Enumerable.Range(0, 7)
            .Select(i => today.AddDays(-6 + i))
            .Select(day => new TrendBucket(day.ToString("ddd", EnGb), day))
            .ToList();
        foreach (var row in rows)
        {
            var local = row.CreatedAt.ToLocalTime();
            var bucket = trend.FirstOrDefault(b => local >= b.Start && local < b.Start.AddDays(1));
            if (bucket is not null) bucket.Value += 1;
        }

        var requestsTrend = Enumerable.Range(0, 30)
            .Select(i => today.AddDays(-29 + i))
            .Select(day => new TrendBucket(day.ToString("dd MMM", EnGb), day))
            .ToList();
        foreach (var row in rows)
        {
            var local = row.CreatedAt.ToLocalTime();
            var bucket = requestsTrend.FirstOrDefault(b => local >= b.Start && local < b.Start.AddDays(1));
            if (bucket is not null) bucket.Value += 1;
        }

        var now = DateTime.Now;
        var months = Enumerable.Range(0, 6)
            .Select(i => new DateTime(now.Year, now.Month, 1).AddMonths(-5 + i))
            .Select(month => new MonthBucket(
                $"{month.Year}-{month.Month:00}",
                month.ToString("MMM", EnGb)))
            .ToList();

        static string? MonthOf(DateTime value)
        {
            var local = value.ToLocalTime();
            return $"{local.Year}-{local.Month:00}";
        }

        foreach (var user in users)
        {
            var key = MonthOf(user.CreatedAt);
            var bucket = months.FirstOrDefault(m => m.Key == key);
            if (bucket is not null) bucket.Users += 1;
        }
        foreach (var row in rows)
        {
            if (row.Status != "COMPLETED") continue;
            var key = MonthOf(row.CreatedAt);
            var bucket = months.FirstOrDefault(m => m.Key == key);
            if (bucket is not null) bucket.Revenue += BookingPrice(row.AgreedPrice, row.ProposedPrice, row.Estimate?.Total);
        }

        var avgValue = completed > 0 ? (int)Math.Round(completedValue / completed, MidpointRounding.AwayFromZero) : 0;
        var windowStart = requestsTrend.Count > 0 ? requestsTrend[0].Start : DateTime.MinValue;
        var newUsers30d = users.Count(u => u.CreatedAt.ToLocalTime() >= windowStart);

        return Ok(new
        {
            success = true,
            stats = new
            {
                users = userCounts,
                requests = new
                {
                    total = rows.Count,
                    completed,
                    cancelled,
                    active,
                    byService = byService
                        .Select(kv => new { label = kv.Key, value = kv.Value })
                        .OrderByDescending(x => x.value),
                },
                bookings = new
                {
                    total = rows.Count,
                    active,
                    completed,
                    cancelled,
                    completedValue,
                    trend = trend.Select(b => new { label = b.Label, value = b.Value }),
                },
                analytics = new
                {
                    requestsTrend = requestsTrend.Select(b => new { label = b.Label, value = b.Value }),
                    revenueTrend = months.Select(m => new { label = m.Label, value = m.Revenue }),
                    usersTrend = months.Select(m => new { label = m.Label, value = m.Users }),
                    stages = new[]
                    {
                        new { label = "Active", value = active },
                        new { label = "Completed", value = completed },
                        new { label = "Cancelled", value = cancelled },
                    },
                    newUsers30d,
                    avgValue,
                },
            },
        });
    }

    // ── Platform settings ────────────────────────────────────────────────

    [HttpPut("platform-settings")]
    public async Task<IActionResult> UpdateSettings(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] JsonElement body,
        CancellationToken ct)
    {
        var settings = await _db.PlatformSettings.FirstOrDefaultAsync(ct);
        var isNew = settings is null;
        if (settings is null)
        {
            settings = new PlatformSettings { Id = Guid.NewGuid().ToString() };
            _db.PlatformSettings.Add(settings);
        }

        var changed = false;
        foreach (var key in new[] { "adminName", "adminEmail", "autoApprovalFundis", "disputeResolution" })
        {
            if (Has(body, key) && body.GetProperty(key).ValueKind == JsonValueKind.String)
            {
                var value = (body.GetProperty(key).GetString() ?? "").Trim();
                switch (key)
                {
                    case "adminName": settings.AdminName = value; break;
                    case "adminEmail": settings.AdminEmail = value; break;
                    case "autoApprovalFundis": settings.AutoApprovalFundis = value; break;
                    case "disputeResolution": settings.DisputeResolution = value; break;
                }
                changed = true;
            }
        }

        foreach (var key in new[] { "commissionRate", "clientFeeRate", "minJobAmount", "serviceRadius" })
        {
            if (!Has(body, key)) continue;
            var raw = body.GetProperty(key);
            if (raw.ValueKind is JsonValueKind.Null) continue;
            if (raw.ValueKind == JsonValueKind.String && string.IsNullOrEmpty(raw.GetString())) continue;
            if (!TryNumber(raw, out var value) || !double.IsFinite(value) || value < 0) continue;

            switch (key)
            {
                case "commissionRate": settings.CommissionRate = value; break;
                case "clientFeeRate": settings.ClientFeeRate = value; break;
                case "minJobAmount": settings.MinJobAmount = value; break;
                case "serviceRadius": settings.ServiceRadius = value; break;
            }
            changed = true;
        }

        if (Has(body, "notifications") && body.GetProperty("notifications").ValueKind == JsonValueKind.Array)
        {
            settings.Notifications = JsonDocument.Parse(body.GetProperty("notifications").GetRawText());
            changed = true;
        }
        if (Has(body, "paymentIntegrations") && body.GetProperty("paymentIntegrations").ValueKind == JsonValueKind.Object)
        {
            settings.PaymentIntegrations = JsonDocument.Parse(body.GetProperty("paymentIntegrations").GetRawText());
            changed = true;
        }

        if (changed || isNew)
        {
            await _db.SaveChangesAsync(ct);
        }
        if (changed)
        {
            await _audit.RecordAsync(HttpContext, HttpContext.CurrentUser(), "settings.updated", "settings",
                "platform_settings", settings.Id,
                "Updated platform settings",
                new { keys = body.ValueKind == JsonValueKind.Object ? body.EnumerateObject().Select(p => p.Name).ToArray() : Array.Empty<string>() },
                ct: ct);
        }

        return Ok(new
        {
            success = true,
            settings = new
            {
                adminName = settings.AdminName,
                adminEmail = settings.AdminEmail,
                commissionRate = settings.CommissionRate,
                clientFeeRate = settings.ClientFeeRate,
                minJobAmount = settings.MinJobAmount,
                serviceRadius = settings.ServiceRadius,
                autoApprovalFundis = settings.AutoApprovalFundis,
                disputeResolution = settings.DisputeResolution,
                notifications = settings.Notifications,
                paymentIntegrations = settings.PaymentIntegrations,
                currency = "UGX",
            },
        });
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private sealed class TrendBucket
    {
        public TrendBucket(string label, DateTime start)
        {
            Label = label;
            Start = start;
        }
        public string Label { get; }
        public DateTime Start { get; }
        public int Value { get; set; }
    }

    private sealed class MonthBucket
    {
        public MonthBucket(string key, string label)
        {
            Key = key;
            Label = label;
        }
        public string Key { get; }
        public string Label { get; }
        public int Users { get; set; }
        public double Revenue { get; set; }
    }

    private static string NameOf(string? first, string? last) =>
        $"{first} {last}".Trim();

    private static string RoleLabel(string role) => role switch
    {
        "fundi" => "Fundi",
        "admin" => "Admin",
        _ => "Client",
    };

    private static string ShortLabel(string? text)
    {
        var value = (text ?? "").Trim();
        return value.Length == 0 ? "" : value.Split(',')[0].Trim();
    }

    private static object ToAdminUser(User row) => new
    {
        id = row.Id,
        name = NameOf(row.FirstName, row.LastName) is { Length: > 0 } n ? n : (row.Email ?? row.Phone ?? "User"),
        firstName = row.FirstName,
        lastName = row.LastName,
        role = RoleLabel(row.Role),
        rawRole = row.Role,
        phone = row.Phone ?? "",
        email = row.Email ?? "",
        location = !string.IsNullOrEmpty(row.District) ? row.District : ShortLabel(row.LocationLabel),
        skills = row.Skills,
        createdAt = row.CreatedAt,
        status = row.Status == "active" ? "Active" : "Inactive",
    };

    private static object ToAdminFundi(User user, FundiProfile? profile)
    {
        var skills = (user.Skills ?? Array.Empty<string>())
            .Concat(profile?.Skills ?? Array.Empty<string>())
            .Select(s => (s ?? "").Trim())
            .Where(s => s.Length > 0)
            .Distinct()
            .ToArray();
        var active = user.Status == "active";
        return new
        {
            id = user.Id,
            name = NameOf(user.FirstName, user.LastName) is { Length: > 0 } n ? n : (user.Phone ?? "Fundi"),
            trade = skills.Length > 0 ? skills[0] : "Fundi",
            skills,
            location = !string.IsNullOrEmpty(user.District)
                ? user.District
                : (ShortLabel(user.LocationLabel) is { Length: > 0 } sl ? sl : "Uganda"),
            rating = profile?.Rating ?? 0,
            reviews = profile?.JobsCompleted ?? 0,
            status = !active ? "Suspended" : profile?.VerificationStatus == "pending" ? "Pending" : "Active",
            phone = user.Phone ?? "",
            email = user.Email ?? "",
            createdAt = user.CreatedAt,
            experience = profile?.Experience ?? user.Experience,
            completedJobs = profile?.JobsCompleted ?? 0,
            availability = active && (profile?.IsAvailable ?? true) ? "Available" : "Unavailable",
            about = !string.IsNullOrEmpty(profile?.Bio) ? profile!.Bio : (string.IsNullOrEmpty(user.Bio) ? "No bio yet." : user.Bio),
            verified = profile?.Verified ?? false,
        };
    }

    private static double BookingPrice(Booking booking) =>
        BookingPrice(booking.AgreedPrice, booking.ProposedPrice, booking.Estimate?.Total);

    private static double BookingPrice(double? agreed, double? proposed, double? estimated)
    {
        var price = agreed ?? proposed ?? estimated ?? 0;
        return double.IsFinite(price) ? price : 0;
    }

    private static string BookingStatusLabel(string status) => status switch
    {
        "COMPLETED" => "Completed",
        "CANCELLED" => "Cancelled",
        "PENDING" => "Pending",
        "ACCEPTED" => "Accepted",
        _ => "In Progress",
    };

    private static string[] SkillsFrom(JsonElement body)
    {
        if (!Has(body, "skills")) return Array.Empty<string>();
        var value = body.GetProperty("skills");
        var parts = value.ValueKind == JsonValueKind.Array
            ? value.EnumerateArray().Select(e => e.ValueKind == JsonValueKind.String ? e.GetString() ?? "" : e.ToString())
            : (Str(body, "skills") ?? "").Split(',');
        return parts.Select(s => (s ?? "").Trim()).Where(s => s.Length > 0).ToArray();
    }

    private static bool Has(JsonElement body, string name) =>
        body.ValueKind == JsonValueKind.Object && body.TryGetProperty(name, out _);

    private static string? Str(JsonElement body, string name)
    {
        if (body.ValueKind != JsonValueKind.Object || !body.TryGetProperty(name, out var value)) return null;
        return value.ValueKind switch
        {
            JsonValueKind.String => value.GetString() ?? "",
            JsonValueKind.Null => "",
            _ => value.ToString(),
        };
    }

    private static bool TryNumber(JsonElement value, out double number)
    {
        number = 0;
        if (value.ValueKind == JsonValueKind.Number) { number = value.GetDouble(); return true; }
        if (value.ValueKind == JsonValueKind.String) return double.TryParse(value.GetString(), out number);
        return false;
    }
}
